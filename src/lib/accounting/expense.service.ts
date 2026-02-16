
'use client';

import { Firestore, collection, doc, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { postJournalEntry } from './journal.service';

export interface ExpenseRequisitionPayload {
  requestedBy: string;
  employeeName: string;
  amount: number;
  expenseAccountId: string;
  description: string;
  paymentMethod: 'Cash' | 'Bank' | 'Payroll Deduction';
  isPayrollRecoverable: boolean;
}

/**
 * Service to handle Expense Management and Requisition workflows.
 */
export async function createExpenseRequisition(db: Firestore, institutionId: string, payload: ExpenseRequisitionPayload) {
  if (!institutionId || !db) return;

  const expensesRef = collection(db, 'institutions', institutionId, 'expenses');
  
  const data = {
    ...payload,
    institutionId,
    status: 'Pending',
    approvalStage: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  return addDocumentNonBlocking(expensesRef, data);
}

/**
 * Approves an expense and handles automated ledger posting if final stage.
 */
export async function approveExpense(db: Firestore, institutionId: string, expenseId: string, sourceAccountId?: string) {
  const expenseRef = doc(db, 'institutions', institutionId, 'expenses', expenseId);
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  
  return runTransaction(db, async (transaction) => {
    const [expenseSnap, setupSnap] = await Promise.all([
      transaction.get(expenseRef),
      transaction.get(setupRef)
    ]);

    if (!expenseSnap.exists()) throw new Error("Requisition not found.");
    const expense = expenseSnap.data();
    const setup = setupSnap.data();

    // Logic: In MVP, Stage 2 is final approval.
    const isFinalApproval = expense.approvalStage >= 1; 
    const newStatus = isFinalApproval ? 'Approved' : 'Pending';
    const nextStage = expense.approvalStage + 1;

    transaction.update(expenseRef, {
      status: newStatus,
      approvalStage: nextStage,
      updatedAt: serverTimestamp()
    });

    if (isFinalApproval && sourceAccountId) {
      // Auto-post to ledger
      // DR: Expense Account (e.g. Travel, Office Supplies)
      // CR: Source Account (e.g. Petty Cash, Bank)
      // OR CR: Salaries Payable (if Payroll Deduction)
      
      let creditAccountId = sourceAccountId;
      if (expense.paymentMethod === 'Payroll Deduction' && setup?.salariesPayableAccountId) {
        creditAccountId = setup.salariesPayableAccountId;
      }

      await postJournalEntry(db, institutionId, {
        date: new Date(),
        description: `Expense: ${expense.description} (Req: ${expenseId})`,
        reference: `EXP-${expenseId.substring(0, 5).toUpperCase()}`,
        items: [
          { accountId: expense.expenseAccountId, amount: expense.amount, type: 'Debit' },
          { accountId: creditAccountId, amount: expense.amount, type: 'Credit' },
        ]
      });

      transaction.update(expenseRef, { status: 'Paid' });
    }
  });
}
