
'use client';

import { Firestore, collection, doc, serverTimestamp, increment, getDoc, runTransaction } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { postJournalEntry } from './journal.service';

export interface InvoicePayload {
  customerId: string;
  customerName: string;
  date: Date;
  dueDate: Date;
  amount: number;
  taxAmount: number;
}

/**
 * Service to handle Accounts Receivable operations.
 */
export async function createReceivableInvoice(db: Firestore, institutionId: string, payload: InvoicePayload) {
  if (!institutionId || !db) return;

  // 1. Fetch Accounting Mappings
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  const setupSnap = await getDoc(setupRef);
  if (!setupSnap.exists()) throw new Error("Accounting setup missing.");
  const setup = setupSnap.data();

  // 2. Fetch Sequence for Invoice Number
  const seqRef = doc(db, 'institutions', institutionId, 'document_sequences', 'sales_invoice');
  const seqSnap = await getDoc(seqRef);
  let invoiceNumber = `INV-${Date.now()}`;

  if (seqSnap.exists()) {
    const seqData = seqSnap.data();
    invoiceNumber = `${seqData.prefix}${seqData.nextNumber.toString().padStart(seqData.padding, '0')}`;
    
    // Increment sequence
    updateDocumentNonBlocking(seqRef, { nextNumber: increment(1) });
  }

  // 3. Post to General Ledger
  // DR: Accounts Receivable (Total)
  // CR: Sales Revenue (Net)
  // CR: VAT Payable (Tax)
  const netAmount = payload.amount - payload.taxAmount;
  
  await postJournalEntry(db, institutionId, {
    date: payload.date,
    description: `Credit Sale to ${payload.customerName} (Inv: ${invoiceNumber})`,
    reference: invoiceNumber,
    items: [
      { accountId: setup.accountsReceivableAccountId, amount: payload.amount, type: 'Debit' },
      { accountId: setup.salesRevenueAccountId, amount: netAmount, type: 'Credit' },
      { accountId: setup.vatPayableAccountId, amount: payload.taxAmount, type: 'Credit' },
    ]
  });

  // 4. Save Invoice record
  const invoicesRef = collection(db, 'institutions', institutionId, 'invoices');
  return addDocumentNonBlocking(invoicesRef, {
    ...payload,
    invoiceNumber,
    balance: payload.amount,
    status: 'Unpaid',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Records a payment against an invoice.
 */
export async function recordInvoicePayment(
  db: Firestore, 
  institutionId: string, 
  invoiceId: string, 
  amount: number, 
  paymentAccountId: string
) {
  const invoiceRef = doc(db, 'institutions', institutionId, 'invoices', invoiceId);
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  const setupSnap = await getDoc(setupRef);
  const setup = setupSnap.data();

  return runTransaction(db, async (transaction) => {
    const invSnap = await transaction.get(invoiceRef);
    if (!invSnap.exists()) throw new Error("Invoice not found.");
    
    const inv = invSnap.data();
    const newBalance = inv.balance - amount;
    const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';

    transaction.update(invoiceRef, {
      balance: newBalance,
      status: newStatus,
      updatedAt: serverTimestamp()
    });

    // Post to Ledger
    // DR: Cash/Bank (Payment)
    // CR: Accounts Receivable (Clearing)
    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Payment for Invoice ${inv.invoiceNumber}`,
      reference: `PAY-${inv.invoiceNumber}-${Date.now()}`,
      items: [
        { accountId: paymentAccountId, amount: amount, type: 'Debit' },
        { accountId: setup!.accountsReceivableAccountId, amount: amount, type: 'Credit' },
      ]
    });
  });
}
