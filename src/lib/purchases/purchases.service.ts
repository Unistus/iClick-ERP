
'use client';

import { Firestore, collection, doc, serverTimestamp, increment, getDoc, runTransaction, addDoc, updateDoc } from 'firebase/firestore';
import { postJournalEntry } from '../accounting/journal.service';
import { recordStockMovement } from '../inventory/inventory.service';
import { getNextSequence } from '../sequence-service';

export interface PurchaseItem {
  productId: string;
  name: string;
  qty: number;
  unitCost: number;
  total: number;
}

/**
 * Service to handle the full procurement lifecycle.
 */

export async function createPurchaseOrder(db: Firestore, institutionId: string, payload: any, userId: string) {
  const poNumber = await getNextSequence(db, institutionId, 'purchase_order');
  const ref = collection(db, 'institutions', institutionId, 'purchase_orders');
  return addDoc(ref, {
    ...payload,
    poNumber,
    status: 'Draft',
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function receiveGRN(db: Firestore, institutionId: string, payload: {
  poId: string;
  warehouseId: string;
  items: PurchaseItem[];
}) {
  const grnNumber = await getNextSequence(db, institutionId, 'grn');
  
  return runTransaction(db, async (transaction) => {
    // 1. Update PO Status
    const poRef = doc(db, 'institutions', institutionId, 'purchase_orders', payload.poId);
    transaction.update(poRef, { status: 'Received', updatedAt: serverTimestamp() });

    // 2. Log Stock Movements (Inventory Addition)
    for (const item of payload.items) {
      await recordStockMovement(db, institutionId, {
        productId: item.productId,
        warehouseId: payload.warehouseId,
        type: 'In',
        quantity: item.qty,
        reference: `GRN: ${grnNumber}`,
        unitCost: item.unitCost
      });
    }

    // 3. Save GRN Record
    const grnRef = doc(collection(db, 'institutions', institutionId, 'grns'));
    transaction.set(grnRef, {
      ...payload,
      grnNumber,
      status: 'Completed',
      createdAt: serverTimestamp()
    });
  });
}

export async function createVendorInvoice(db: Firestore, institutionId: string, payload: any) {
  const invoiceNumber = await getNextSequence(db, institutionId, 'supplier_invoice');
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  
  return runTransaction(db, async (transaction) => {
    const setupSnap = await transaction.get(setupRef);
    if (!setupSnap.exists()) throw new Error("Accounting setup missing");
    const setup = setupSnap.data();

    // Post to GL
    // DR: Inventory/Expense Account
    // CR: Accounts Payable
    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Vendor Invoice ${invoiceNumber} from ${payload.supplierName}`,
      reference: invoiceNumber,
      items: [
        { accountId: payload.allocationAccountId, amount: payload.total, type: 'Debit' },
        { accountId: setup.accountsPayableAccountId, amount: payload.total, type: 'Credit' },
      ]
    });

    const invRef = doc(collection(db, 'institutions', institutionId, 'vendor_invoices'));
    transaction.set(invRef, {
      ...payload,
      invoiceNumber,
      status: 'Finalized',
      balance: payload.total,
      createdAt: serverTimestamp()
    });
  });
}
