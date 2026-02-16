
'use client';

import { Firestore, collection, doc, serverTimestamp, increment, getDoc, runTransaction } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { postJournalEntry } from './journal.service';

export interface VendorBillPayload {
  vendorName: string;
  billNumber: string;
  date: Date;
  dueDate: Date;
  amount: number;
  expenseAccountId: string; // The account to debit (e.g. Inventory, Utilities)
}

/**
 * Service to handle Accounts Payable operations.
 */
export async function createVendorBill(db: Firestore, institutionId: string, payload: VendorBillPayload) {
  if (!institutionId || !db) return;

  // 1. Fetch Accounting Mappings
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  const setupSnap = await getDoc(setupRef);
  if (!setupSnap.exists()) throw new Error("Accounting setup missing.");
  const setup = setupSnap.data();

  if (!setup.accountsPayableAccountId) throw new Error("Accounts Payable mapping missing in setup.");

  // 2. Post to General Ledger
  // DR: Expense / Asset Account (Selected)
  // CR: Accounts Payable (Total)
  await postJournalEntry(db, institutionId, {
    date: payload.date,
    description: `Vendor Bill from ${payload.vendorName} (Ref: ${payload.billNumber})`,
    reference: payload.billNumber,
    items: [
      { accountId: payload.expenseAccountId, amount: payload.amount, type: 'Debit' },
      { accountId: setup.accountsPayableAccountId, amount: payload.amount, type: 'Credit' },
    ]
  });

  // 3. Save Bill record
  const payablesRef = collection(db, 'institutions', institutionId, 'payables');
  return addDocumentNonBlocking(payablesRef, {
    ...payload,
    balance: payload.amount,
    status: 'Unpaid',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Records a payment to a vendor.
 */
export async function recordVendorPayment(
  db: Firestore, 
  institutionId: string, 
  billId: string, 
  amount: number, 
  sourceAccountId: string // The bank/cash account to credit
) {
  const billRef = doc(db, 'institutions', institutionId, 'payables', billId);
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  const setupSnap = await getDoc(setupRef);
  const setup = setupSnap.data();

  return runTransaction(db, async (transaction) => {
    const billSnap = await transaction.get(billRef);
    if (!billSnap.exists()) throw new Error("Bill not found.");
    
    const bill = billSnap.data();
    const newBalance = (bill.balance || 0) - amount;
    const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';

    transaction.update(billRef, {
      balance: newBalance,
      status: newStatus,
      updatedAt: serverTimestamp()
    });

    // Post to Ledger
    // DR: Accounts Payable (Clearing Liability)
    // CR: Cash/Bank (Payment)
    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Payment to ${bill.vendorName} for Bill ${bill.billNumber}`,
      reference: `VPAY-${bill.billNumber}-${Date.now()}`,
      items: [
        { accountId: setup!.accountsPayableAccountId, amount: amount, type: 'Debit' },
        { accountId: sourceAccountId, amount: amount, type: 'Credit' },
      ]
    });
  });
}
