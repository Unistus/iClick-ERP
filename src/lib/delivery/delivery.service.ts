
'use client';

import { Firestore, collection, doc, serverTimestamp, runTransaction, addDoc, getDoc, updateDoc } from 'firebase/firestore';
import { recordStockMovement } from '../inventory/inventory.service';
import { getNextSequence } from '../sequence-service';

export interface DispatchPayload {
  invoiceId: string;
  driverId: string;
  vehicleId: string;
  warehouseId: string;
  destinationAddress: string;
}

/**
 * Orchestrates the full Logistics lifecycle from dispatch to confirmation.
 */

export async function dispatchDelivery(db: Firestore, institutionId: string, payload: DispatchPayload, userId: string) {
  const deliveryNumber = await getNextSequence(db, institutionId, 'delivery_order');
  
  return runTransaction(db, async (transaction) => {
    // 1. Fetch Invoice to get items
    const invoiceRef = doc(db, 'institutions', institutionId, 'sales_invoices', payload.invoiceId);
    const invSnap = await transaction.get(invoiceRef);
    if (!invSnap.exists()) throw new Error("Invoice not found.");
    const invoice = invSnap.data();

    // 2. Log Stock Deductions for every item in the invoice
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

    // 3. Create Delivery Order record
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

    // 4. Update Invoice Status
    transaction.update(invoiceRef, { 
      status: 'Dispatched', 
      deliveryOrderId: deliveryRef.id,
      updatedAt: serverTimestamp() 
    });

    // 5. Mark Driver and Vehicle as Busy
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

    // 1. Update Delivery Status
    transaction.update(deliveryRef, { 
      status: 'Delivered', 
      deliveredAt: serverTimestamp(),
      updatedAt: serverTimestamp() 
    });

    // 2. Update Invoice to 'Settled' (Revenue Recognition)
    const invoiceRef = doc(db, 'institutions', institutionId, 'sales_invoices', delivery.invoiceId);
    transaction.update(invoiceRef, { 
      status: 'Settled', 
      updatedAt: serverTimestamp() 
    });

    // 3. Free up resources
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
