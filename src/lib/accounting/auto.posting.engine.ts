
'use client';

import { Firestore, doc, getDoc } from 'firebase/firestore';
import { postJournalEntry } from './journal.service';

/**
 * Automatically calculates and posts accounting entries for business events.
 */
export async function autoPostSale(
  db: Firestore, 
  institutionId: string, 
  saleData: { amount: number; tax: number; paymentMethod: 'Cash' | 'M-Pesa' | 'Card' }
) {
  // 1. Fetch the accounting setup mapping
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  const setupSnap = await getDoc(setupRef);
  if (!setupSnap.exists()) return;
  
  const setup = setupSnap.data();
  const netAmount = saleData.amount - saleData.tax;

  // 2. Build the Journal Entry
  // DR: Cash/Bank (Total)
  // CR: Sales Revenue (Net)
  // CR: VAT Payable (Tax)
  
  const paymentAccountId = saleData.paymentMethod === 'M-Pesa' 
    ? setup.mpesaClearingAccountId 
    : setup.cashOnHandAccountId;

  return postJournalEntry(db, institutionId, {
    date: new Date(),
    description: `Auto-posted POS Sale (${saleData.paymentMethod})`,
    reference: `SALE-${Date.now()}`,
    items: [
      { accountId: paymentAccountId, amount: saleData.amount, type: 'Debit' },
      { accountId: setup.salesRevenueAccountId, amount: netAmount, type: 'Credit' },
      { accountId: setup.vatPayableAccountId, amount: saleData.tax, type: 'Credit' },
    ]
  });
}
