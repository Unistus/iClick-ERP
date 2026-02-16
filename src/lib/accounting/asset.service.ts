
'use client';

import { Firestore, collection, doc, serverTimestamp, increment, getDoc, runTransaction } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { postJournalEntry } from './journal.service';

export interface FixedAssetPayload {
  name: string;
  code: string;
  category: string;
  purchaseDate: Date;
  purchasePrice: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: 'Straight Line' | 'Reducing Balance';
  assetAccountId: string; // The specific asset node in COA
}

/**
 * Registers a new physical asset and optionally posts the acquisition journal.
 */
export async function registerFixedAsset(db: Firestore, institutionId: string, payload: FixedAssetPayload) {
  if (!institutionId || !db) return;

  const assetsRef = collection(db, 'institutions', institutionId, 'assets');
  
  const assetData = {
    ...payload,
    currentValue: payload.purchasePrice,
    accumulatedDepreciation: 0,
    status: 'Active',
    institutionId,
    updatedAt: serverTimestamp(),
  };

  return addDocumentNonBlocking(assetsRef, assetData);
}

/**
 * Calculates and posts periodic depreciation for an asset.
 */
export async function runDepreciation(db: Firestore, institutionId: string, assetId: string) {
  const assetRef = doc(db, 'institutions', institutionId, 'assets', assetId);
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  
  const [assetSnap, setupSnap] = await Promise.all([getDoc(assetRef), getDoc(setupRef)]);
  
  if (!assetSnap.exists()) throw new Error("Asset not found");
  if (!setupSnap.exists()) throw new Error("Accounting setup incomplete");

  const asset = assetSnap.data();
  const setup = setupSnap.data();

  if (!setup.accumulatedDepreciationAccountId || !setup.depreciationExpenseAccountId) {
    throw new Error("Depreciation accounts not mapped in setup");
  }

  // Calculate Periodic Depreciation (Simulating Monthly for MVP)
  let amount = 0;
  if (asset.depreciationMethod === 'Straight Line') {
    amount = (asset.purchasePrice - asset.salvageValue) / (asset.usefulLifeYears * 12);
  } else {
    // 20% Reducing Balance simulation
    amount = asset.currentValue * (0.2 / 12);
  }

  amount = Math.min(amount, asset.currentValue - (asset.salvageValue || 0));
  if (amount <= 0) return;

  return runTransaction(db, async (transaction) => {
    transaction.update(assetRef, {
      currentValue: increment(-amount),
      accumulatedDepreciation: increment(amount),
      updatedAt: serverTimestamp()
    });

    // DR: Depreciation Expense (Expense +)
    // CR: Accumulated Depreciation (Contra-Asset + / Asset -)
    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Periodic Depreciation: ${asset.name}`,
      reference: `DEP-${asset.code}-${Date.now()}`,
      items: [
        { accountId: setup.depreciationExpenseAccountId, amount: amount, type: 'Debit' },
        { accountId: setup.accumulatedDepreciationAccountId, amount: amount, type: 'Credit' },
      ]
    });
  });
}
