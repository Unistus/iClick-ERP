'use client';

import { Firestore, collection, doc, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { postJournalEntry } from './journal.service';

export interface RegisterAccountPayload {
  code: string;
  name: string;
  subtype: string;
  openingBalance: number;
  currencyId: string;
}

/**
 * Industry best-practice service for registering financial nodes.
 * Automatically handles Opening Balances via automated Journal Entries.
 */
export async function registerFinancialAccount(
  db: Firestore, 
  institutionId: string, 
  payload: RegisterAccountPayload
) {
  if (!institutionId || !db) return;

  // 1. Create the Account Document in COA
  const coaRef = collection(db, 'institutions', institutionId, 'coa');
  const accountData = {
    code: payload.code,
    name: payload.name,
    subtype: payload.subtype,
    type: 'Asset',
    balance: 0, // Will be updated by the journal entry below
    isActive: true,
    institutionId: institutionId,
    currencyId: payload.currencyId,
    updatedAt: serverTimestamp(),
  };

  const newAccountDoc = await addDoc(coaRef, accountData);

  // 2. Handle Opening Balance if provided
  if (payload.openingBalance > 0) {
    // Fetch Equity Mapping from Setup
    const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
    const setupSnap = await getDoc(setupRef);
    
    if (!setupSnap.exists() || !setupSnap.data().openingBalanceEquityAccountId) {
      throw new Error("Opening Balance Equity account is not mapped in Accounting Setup.");
    }

    const equityAccountId = setupSnap.data().openingBalanceEquityAccountId;

    // Post automated Journal Entry
    // DR: New Bank/Cash Account (Asset +)
    // CR: Opening Balance Equity (Equity +)
    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Opening Balance for ${payload.name}`,
      reference: `OB-${payload.code}`,
      items: [
        { accountId: newAccountDoc.id, amount: payload.openingBalance, type: 'Debit' },
        { accountId: equityAccountId, amount: payload.openingBalance, type: 'Credit' },
      ]
    });
  }

  return newAccountDoc;
}
