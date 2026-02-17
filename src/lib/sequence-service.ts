'use client';

import { Firestore, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

/**
 * Atomic service to retrieve and increment institutional document sequences.
 * This ensures unique, gapless numbering for SKUs, Invoices, and IDs.
 */
export async function getNextSequence(db: Firestore, institutionId: string, sequenceId: string): Promise<string> {
  const seqRef = doc(db, 'institutions', institutionId, 'document_sequences', sequenceId);

  return runTransaction(db, async (transaction) => {
    const seqSnap = await transaction.get(seqRef);

    if (!seqSnap.exists()) {
      // Fallback if sequence hasn't been initialized in Admin yet
      const fallbackId = `${sequenceId.toUpperCase()}-${Date.now()}`;
      return fallbackId;
    }

    const data = seqSnap.data();
    const nextNumber = data.nextNumber || 1;
    const prefix = data.prefix || '';
    const padding = data.padding || 1;

    // Format: PREFIX + 00000X
    const formattedId = `${prefix}${nextNumber.toString().padStart(padding, '0')}`;

    // Increment for next caller
    transaction.update(seqRef, {
      nextNumber: nextNumber + 1,
      updatedAt: serverTimestamp()
    });

    return formattedId;
  });
}
