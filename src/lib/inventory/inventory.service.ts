'use client';

import { Firestore, collection, doc, serverTimestamp, increment, runTransaction, getDoc, addDoc } from 'firebase/firestore';
import { postJournalEntry } from '../accounting/journal.service';

export interface MovementPayload {
  productId: string;
  warehouseId: string;
  type: 'In' | 'Out' | 'Transfer' | 'Adjustment' | 'Damage';
  quantity: number; // For Adjustment, this can be signed (+ for increase, - for decrease)
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

    // 1. Calculate Quantity Change
    // 'In' is always +, 'Out'/'Damage' is always -, 'Adjustment' uses its own sign
    let qtyChange = 0;
    if (payload.type === 'In') qtyChange = payload.quantity;
    else if (payload.type === 'Out' || payload.type === 'Damage') qtyChange = -payload.quantity;
    else if (payload.type === 'Adjustment') qtyChange = payload.quantity;

    // 2. Update Product Totals
    transaction.update(productRef, {
      totalStock: increment(qtyChange),
      updatedAt: serverTimestamp()
    });

    // 3. Log Movement
    const moveDocRef = doc(movementsRef);
    transaction.set(moveDocRef, {
      ...payload,
      quantity: qtyChange, // Store the signed change for audit
      timestamp: serverTimestamp()
    });

    // 4. Update Batch if applicable
    if (payload.batchId) {
      const batchRef = doc(db, 'institutions', institutionId, 'batches', payload.batchId);
      transaction.update(batchRef, {
        quantity: increment(qtyChange),
        updatedAt: serverTimestamp()
      });
    }

    // 5. Automated Accounting
    if (setup?.inventoryAssetAccountId) {
      const absQty = Math.abs(qtyChange);
      const totalAmount = absQty * (payload.unitCost || product.costPrice || 0);

      if (totalAmount > 0) {
        if (qtyChange < 0 && (payload.type === 'Adjustment' || payload.type === 'Damage')) {
          // DECREASE: DR Shrinkage (Expense), CR Asset
          if (setup.inventoryShrinkageAccountId) {
            await postJournalEntry(db, institutionId, {
              date: new Date(),
              description: `Stock Reduction (${payload.type}): ${product.name}`,
              reference: `INV-RED-${Date.now()}`,
              items: [
                { accountId: setup.inventoryShrinkageAccountId, amount: totalAmount, type: 'Debit' },
                { accountId: setup.inventoryAssetAccountId, amount: totalAmount, type: 'Credit' },
              ]
            });
          }
        } else if (qtyChange > 0 && payload.type === 'Adjustment') {
          // INCREASE: DR Asset, CR Adjustment/Equity Node
          const creditAccountId = setup.inventoryAdjustmentAccountId || setup.openingBalanceEquityAccountId;
          if (creditAccountId) {
            await postJournalEntry(db, institutionId, {
              date: new Date(),
              description: `Stock Increase (Adjustment): ${product.name}`,
              reference: `INV-INC-${Date.now()}`,
              items: [
                { accountId: setup.inventoryAssetAccountId, amount: totalAmount, type: 'Debit' },
                { accountId: creditAccountId, amount: totalAmount, type: 'Credit' },
              ]
            });
          }
        }
      }
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
 * Executes as a single transaction to maintain stock integrity.
 */
export async function transferStock(db: Firestore, institutionId: string, payload: {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reference: string;
}) {
  const productRef = doc(db, 'institutions', institutionId, 'products', payload.productId);
  const movementsRef = collection(db, 'institutions', institutionId, 'movements');

  return runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) throw new Error("Product not found");
    
    const product = productSnap.data();
    if (product.totalStock < payload.quantity) {
      throw new Error(`Insufficient stock. Current total: ${product.totalStock}`);
    }

    // Log Dispatch (Out from Source)
    const outMoveRef = doc(movementsRef);
    transaction.set(outMoveRef, {
      productId: payload.productId,
      warehouseId: payload.fromWarehouseId,
      type: 'Out',
      quantity: payload.quantity,
      reference: `TRF-OUT: ${payload.reference}`,
      timestamp: serverTimestamp()
    });

    // Log Receipt (In at Destination)
    const inMoveRef = doc(movementsRef);
    transaction.set(inMoveRef, {
      productId: payload.productId,
      warehouseId: payload.toWarehouseId,
      type: 'In',
      quantity: payload.quantity,
      reference: `TRF-IN: ${payload.reference}`,
      timestamp: serverTimestamp()
    });

    transaction.update(productRef, {
      updatedAt: serverTimestamp()
    });
  });
}
