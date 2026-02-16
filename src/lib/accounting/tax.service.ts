'use client';

import { Firestore, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export interface GenerateTaxReturnPayload {
  periodId: string;
  periodName: string;
  taxType: 'VAT' | 'Withholding';
}

/**
 * Service to aggregate tax obligations and generate regulatory filings.
 */
export async function generateTaxReturn(db: Firestore, institutionId: string, payload: GenerateTaxReturnPayload, userId: string) {
  if (!institutionId || !db) return;

  // 1. Fetch Accounting Setup
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  const setupSnap = await getDoc(setupRef);
  if (!setupSnap.exists()) throw new Error("Accounting setup missing.");
  const setup = setupSnap.data();

  if (!setup.vatPayableAccountId) throw new Error("VAT Payable account not mapped in setup.");

  // 2. Fetch the Tax Account Balance (Output VAT)
  const coaRef = doc(db, 'institutions', institutionId, 'coa', setup.vatPayableAccountId);
  const coaSnap = await getDoc(coaRef);
  const outputVat = coaSnap.exists() ? coaSnap.data().balance || 0 : 0;

  // 3. Simulate Input VAT aggregation
  const inputVat = 0; // Placeholder for MVP input aggregation logic

  const grossSales = (outputVat / 0.16) + outputVat; // Back-calculation for MVP estimation

  const data = {
    ...payload,
    grossSales,
    outputVat,
    inputVat,
    netTaxPayable: outputVat - inputVat,
    status: 'Draft',
    filedBy: userId,
    institutionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const returnsRef = collection(db, 'institutions', institutionId, 'tax_returns');
  return addDocumentNonBlocking(returnsRef, data);
}

/**
 * Transitions a tax return status.
 */
export async function updateTaxReturnStatus(db: Firestore, institutionId: string, returnId: string, status: 'Approved' | 'Filed' | 'Paid') {
  const ref = doc(db, 'institutions', institutionId, 'tax_returns', returnId);
  return updateDoc(ref, {
    status,
    updatedAt: serverTimestamp()
  });
}
