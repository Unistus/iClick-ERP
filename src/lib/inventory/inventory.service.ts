'use client';

import { Firestore, collection, doc, serverTimestamp, increment, runTransaction, getDoc, addDoc, setDoc, Transaction } from 'firebase/firestore';
import { postJournalEntry } from '../accounting/journal.service';
import { initiateApprovalRequest } from '../approvals/approvals.service';

export interface MovementPayload {
  productId: string;
  warehouseId: string;
  type: 'In' | 'Out' | 'Transfer' | 'Adjustment' | 'Damage';
  quantity: number; 
  reference: string;
  unitCost: number;
  batchId?: string;
  status?: 'Pending' | 'Completed';
}

export interface BatchPayload {
  productId: string;
  warehouseId: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
}

/**
 * Bootstraps the required Inventory financial nodes in the COA.
 */
export async function bootstrapInventoryFinancials(db: Firestore, institutionId: string) {
  const nodes = [
    { id: 'inventory_asset_node', code: '1300', name: 'Raw Stock & Materials', type: 'Asset', subtype: 'Inventory' },
    { id: 'cogs_node', code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'Expense', subtype: 'COGS' },
    { id: 'stock_adjustment_node', code: '3100', name: 'Inventory Variance (Equity)', type: 'Equity', subtype: 'Retained Earnings' },
    { id: 'stock_shrinkage_node', code: '6400', name: 'Stock Loss & Damage', type: 'Expense', subtype: 'Other Income' },
  ];

  for (const node of nodes) {
    const coaRef = doc(db, 'institutions', institutionId, 'coa', node.id);
    await setDoc(coaRef, {
      ...node,
      balance: 0,
      isActive: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'inventory');
  await setDoc(setupRef, {
    inventoryAssetAccountId: 'inventory_asset_node',
    cogsAccountId: 'cogs_node',
    inventoryAdjustmentAccountId: 'stock_adjustment_node',
    inventoryShrinkageAccountId: 'stock_shrinkage_node'
  }, { merge: true });
}

/**
 * Records an atomic stock movement. 
 */
export async function recordStockMovement(db: Firestore, institutionId: string, payload: MovementPayload, existingTx?: Transaction) {
  const productRef = doc(db, 'institutions', institutionId, 'products', payload.productId);
  const movementsRef = collection(db, 'institutions', institutionId, 'movements');
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');

  const movementLogic = async (transaction: Transaction) => {
    const productSnap = await transaction.get(productRef);
    const setupSnap = await transaction.get(setupRef);

    if (!productSnap.exists()) throw new Error("Product not found");
    const product = productSnap.data();
    const setup = setupSnap.data();

    let qtyChange = 0;
    if (payload.type === 'In') qtyChange = payload.quantity;
    else if (payload.type === 'Out' || payload.type === 'Damage') qtyChange = -payload.quantity;
    else if (payload.type === 'Adjustment') qtyChange = payload.quantity;

    if (payload.status !== 'Pending') {
      transaction.update(productRef, {
        totalStock: increment(qtyChange),
        updatedAt: serverTimestamp()
      });

      if (payload.batchId) {
        const batchRef = doc(db, 'institutions', institutionId, 'batches', payload.batchId);
        transaction.update(batchRef, {
          quantity: increment(qtyChange),
          updatedAt: serverTimestamp()
        });
      }

      if (setup?.inventoryAssetAccountId) {
        const absQty = Math.abs(qtyChange);
        const totalAmount = absQty * (payload.unitCost || product.costPrice || 0);

        if (totalAmount > 0) {
          if (qtyChange < 0 && (payload.type === 'Adjustment' || payload.type === 'Damage')) {
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
    }

    const moveDocRef = doc(movementsRef);
    transaction.set(moveDocRef, {
      ...payload,
      quantity: qtyChange, 
      status: payload.status || 'Completed',
      timestamp: serverTimestamp()
    });
  };

  if (existingTx) {
    return movementLogic(existingTx);
  } else {
    return runTransaction(db, movementLogic);
  }
}

export async function requestStockWriteOff(db: Firestore, institutionId: string, payload: MovementPayload, userId: string) {
  const productRef = doc(db, 'institutions', institutionId, 'products', payload.productId);
  const prodSnap = await getDoc(productRef);
  if (!prodSnap.exists()) throw new Error("Product not found");
  const product = prodSnap.data();

  const lossValue = payload.quantity * (product.costPrice || 0);
  
  if (lossValue > 10000) {
    const approval = await initiateApprovalRequest(db, institutionId, {
      module: 'Inventory',
      action: 'High-Value Stock Write-off',
      sourceDocId: 'pending',
      requestedBy: userId,
      requestedByName: 'Inventory Manager',
      amount: lossValue,
      data: {
        productName: product.name,
        quantity: payload.quantity,
        lossValue: lossValue,
        reason: payload.reference
      },
      justification: `Manual write-off of ${payload.quantity} units for ${product.name} exceeds the KES 10,000 self-approval threshold.`
    });

    if (approval.status === 'Pending') {
      return recordStockMovement(db, institutionId, { 
        ...payload, 
        status: 'Pending',
        reference: `[AWAITING APPROVAL] ${payload.reference}`
      });
    }
  }

  return recordStockMovement(db, institutionId, payload);
}

export async function registerInventoryBatch(db: Firestore, institutionId: string, payload: BatchPayload) {
  const batchesRef = collection(db, 'institutions', institutionId, 'batches');
  
  const newBatch = await addDoc(batchesRef, {
    ...payload,
    expiryDate: payload.expiryDate, 
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

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

    const outMoveRef = doc(movementsRef);
    transaction.set(outMoveRef, {
      productId: payload.productId,
      warehouseId: payload.fromWarehouseId,
      type: 'Out',
      quantity: payload.quantity,
      reference: `TRF-OUT: ${payload.reference}`,
      timestamp: serverTimestamp()
    });

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
