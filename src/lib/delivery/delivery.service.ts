
'use client';

import { Firestore, collection, doc, serverTimestamp, runTransaction, addDoc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { recordStockMovement } from '../inventory/inventory.service';
import { getNextSequence } from '../sequence-service';
import { postJournalEntry } from '../accounting/journal.service';

export interface DispatchPayload {
  invoiceId: string;
  driverId: string;
  vehicleId: string;
  warehouseId: string;
  destinationAddress: string;
}

/**
 * Bootstraps the required Logistics financial nodes in the COA.
 */
export async function bootstrapLogisticsFinancials(db: Firestore, institutionId: string) {
  const nodes = [
    { id: 'shipping_revenue', code: '4200', name: 'Delivery & Shipping Revenue', type: 'Income', subtype: 'Other Income' },
    { id: 'fleet_expense', code: '6500', name: 'Fleet & Fuel Expenses', type: 'Expense', subtype: 'Utilities' },
    { id: 'logistics_accrual', code: '2500', name: 'Accrued Delivery Costs', type: 'Liability', subtype: 'Accrued Liabilities' },
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

  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'logistics');
  await setDoc(setupRef, {
    shippingRevenueAccountId: 'shipping_revenue',
    fleetExpenseAccountId: 'fleet_expense',
    logisticsAccrualAccountId: 'logistics_accrual'
  }, { merge: true });
}

export async function dispatchDelivery(db: Firestore, institutionId: string, payload: DispatchPayload, userId: string) {
  const deliveryNumber = await getNextSequence(db, institutionId, 'delivery_order');
  
  return runTransaction(db, async (transaction) => {
    const invoiceRef = doc(db, 'institutions', institutionId, 'sales_invoices', payload.invoiceId);
    const invSnap = await transaction.get(invoiceRef);
    if (!invSnap.exists()) throw new Error("Invoice not found.");
    const invoice = invSnap.data();

    for (const item of invoice.items) {
      await recordStockMovement(db, institutionId, {
        productId: item.productId,
        warehouseId: payload.warehouseId,
        type: 'Out',
        quantity: item.qty,
        reference: `Logistics Dispatch: ${deliveryNumber}`,
        unitCost: 0 
      });
    }

    const deliveryRef = doc(collection(db, 'institutions', institutionId, 'delivery_orders'));
    transaction.set(deliveryRef, {
      ...payload,
      deliveryNumber,
      items: invoice.items,
      status: 'Dispatched',
      dispatchedAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    });

    transaction.update(invoiceRef, { 
      status: 'Dispatched', 
      deliveryOrderId: deliveryRef.id,
      updatedAt: serverTimestamp() 
    });

    const driverRef = doc(db, 'institutions', institutionId, 'drivers', payload.driverId);
    const vehicleRef = doc(db, 'institutions', institutionId, 'vehicles', payload.vehicleId);
    transaction.update(driverRef, { status: 'Busy', updatedAt: serverTimestamp() });
    transaction.update(vehicleRef, { status: 'On Trip', updatedAt: serverTimestamp() });
  });
}

export async function confirmDelivery(db: Firestore, institutionId: string, deliveryId: string) {
  const deliveryRef = doc(db, 'institutions', institutionId, 'delivery_orders', deliveryId);
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'logistics');

  return runTransaction(db, async (transaction) => {
    const [delSnap, setupSnap] = await Promise.all([
      transaction.get(deliveryRef),
      transaction.get(setupRef)
    ]);

    if (!delSnap.exists()) throw new Error("Delivery Order not found.");
    const delivery = delSnap.data();

    transaction.update(deliveryRef, { 
      status: 'Delivered', 
      deliveredAt: serverTimestamp(),
      updatedAt: serverTimestamp() 
    });

    const invoiceRef = doc(db, 'institutions', institutionId, 'sales_invoices', delivery.invoiceId);
    transaction.update(invoiceRef, { 
      status: 'Settled', 
      updatedAt: serverTimestamp() 
    });

    const driverRef = doc(db, 'institutions', institutionId, 'drivers', delivery.driverId);
    const vehicleRef = doc(db, 'institutions', institutionId, 'vehicles', delivery.vehicleId);
    transaction.update(driverRef, { status: 'Available', updatedAt: serverTimestamp() });
    transaction.update(vehicleRef, { status: 'Available', updatedAt: serverTimestamp() });
  });
}

export async function registerFleetResource(db: Firestore, institutionId: string, type: 'drivers' | 'vehicles', data: any) {
  const colRef = collection(db, 'institutions', institutionId, type);
  return addDoc(colRef, {
    ...data,
    status: 'Available',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
