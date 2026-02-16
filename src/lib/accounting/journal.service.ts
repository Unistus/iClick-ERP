
'use client';

import { Firestore, collection, doc, serverTimestamp, increment } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export interface JournalItem {
  accountId: string;
  amount: number;
  type: 'Debit' | 'Credit';
}

export interface JournalEntryPayload {
  date: Date;
  description: string;
  reference: string;
  items: JournalItem[];
}

/**
 * High-level service to handle double-entry accounting transactions.
 */
export async function postJournalEntry(db: Firestore, institutionId: string, payload: JournalEntryPayload) {
  if (!institutionId || !db) return;

  const entriesRef = collection(db, 'institutions', institutionId, 'journal_entries');
  
  const entryData = {
    ...payload,
    institutionId,
    status: 'Posted',
    updatedAt: serverTimestamp(),
  };

  // 1. Save the primary entry
  const entryDoc = await addDocumentNonBlocking(entriesRef, entryData);

  // 2. Update balances in Chart of Accounts (Optimistic Update)
  payload.items.forEach(item => {
    const coaRef = doc(db, 'institutions', institutionId, 'coa', item.accountId);
    
    // In accounting: 
    // Asset/Expense: Debit + / Credit -
    // Liability/Equity/Income: Debit - / Credit +
    // For simplicity, we store raw numbers. The UI handles the sign based on account type.
    const adjustment = item.type === 'Debit' ? item.amount : -item.amount;
    
    updateDocumentNonBlocking(coaRef, {
      balance: increment(adjustment),
      updatedAt: serverTimestamp()
    });
  });

  return entryDoc;
}
