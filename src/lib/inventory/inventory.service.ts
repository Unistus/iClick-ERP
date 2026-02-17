'use client';

import { Firestore, collection, doc, serverTimestamp, increment, runTransaction, getDoc, addDoc } from 'firebase/firestore';
import { postJournalEntry } from '../accounting/journal.service';

export interface MovementPayload {
  productId: string;
  warehouseId: string;
  type: 'In' | 'Out' | 'Transfer' | 'Adjustment' | 'Damage';
  quantity: number;
  reference: string;
  unitCost: number;
  batchId?: string;
}

export interface BatchPayload {
  productId: string;
  warehouseId: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
}

/**
 * Handles all stock movements and automated accounting integration.
 */
export async function recordStockMovement(db: Firestore, institutionId: string, payload: MovementPayload) {
  const productRef = doc(db, 'institutions', institutionId, 'products', payload.productId);
  const movementsRef = collection(db, 'institutions', institutionId, 'movements');
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');

  return runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    const setupSnap = await transaction.get(setupRef);

    if (!productSnap.exists()) throw new Error("Product not found");
    const product = productSnap.data();
    const setup = setupSnap.data();

    // 1. Update Product Totals
    const qtyChange = (payload.type === 'In' || payload.type === 'Transfer') ? payload.quantity : -payload.quantity;
    transaction.update(productRef, {
      totalStock: increment(qtyChange),
      updatedAt: serverTimestamp()
    });

    // 2. Log Movement
    const moveDocRef = doc(movementsRef);
    transaction.set(moveDocRef, {
      ...payload,
      timestamp: serverTimestamp()
    });

    // 3. Update Batch if applicable
    if (payload.batchId) {
      const batchRef = doc(db, 'institutions', institutionId, 'batches', payload.batchId);
      transaction.update(batchRef, {
        quantity: increment(qtyChange),
        updatedAt: serverTimestamp()
      });
    }

    // 4. Automated Accounting (if Adjustment/Damage)
    if ((payload.type === 'Adjustment' || payload.type === 'Damage') && setup?.inventoryAssetAccountId && setup?.inventoryShrinkageAccountId) {
      const totalAmount = payload.quantity * (payload.unitCost || product.costPrice || 0);
      
      // DR: Inventory Shrinkage (Expense)
      // CR: Inventory Asset (Asset)
      await postJournalEntry(db, institutionId, {
        date: new Date(),
        description: `Stock ${payload.type}: ${product.name} (${payload.reference})`,
        reference: `INV-ADJ-${Date.now()}`,
        items: [
          { accountId: setup.inventoryShrinkageAccountId, amount: totalAmount, type: 'Debit' },
          { accountId: setup.inventoryAssetAccountId, amount: totalAmount, type: 'Credit' },
        ]
      });
    }
  });
}

/**
 * Registers a new inventory batch.
 */
export async function registerInventoryBatch(db: Firestore, institutionId: string, payload: BatchPayload) {
  const batchesRef = collection(db, 'institutions', institutionId, 'batches');
  
  // 1. Create the batch record
  const newBatch = await addDoc(batchesRef, {
    ...payload,
    expiryDate: payload.expiryDate, // Firestore handles JS Date
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // 2. Record the movement to initialize stock
  await recordStockMovement(db, institutionId, {
    productId: payload.productId,
    warehouseId: payload.warehouseId,
    type: 'In',
    quantity: payload.quantity,
    reference: `Batch Init: ${payload.batchNumber}`,
    unitCost: 0,
    batchId: newBatch.id
  });

  return newBatch;
}

/**
 * Transfers stock between warehouses.
 */
export async function transferStock(db: Firestore, institutionId: string, payload: {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reference: string;
}) {
  await recordStockMovement(db, institutionId, {
    productId: payload.productId,
    warehouseId: payload.fromWarehouseId,
    type: 'Out',
    quantity: payload.quantity,
    reference: `TRF-OUT: ${payload.reference}`,
    unitCost: 0
  });

  await recordStockMovement(db, institutionId, {
    productId: payload.productId,
    warehouseId: payload.toWarehouseId,
    type: 'In',
    quantity: payload.quantity,
    reference: `TRF-IN: ${payload.reference}`,
    unitCost: 0
  });
}
