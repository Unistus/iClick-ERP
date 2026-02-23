'use client';

import { Firestore, collection, doc, serverTimestamp, runTransaction, addDoc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { recordStockMovement } from '../inventory/inventory.service';
import { getNextSequence } from '../sequence-service';

export interface DispatchPayload {
  deliveryId: string;
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

/**
 * Initializes a Delivery Order from a confirmed Sales Order.
 */
export async function initializeDeliveryOrder(db: Firestore, institutionId: string, salesOrder: any, userId: string) {
  const deliveryNumber = await getNextSequence(db, institutionId, 'delivery_order');
  const doRef = collection(db, 'institutions', institutionId, 'delivery_orders');
  
  const data = {
    deliveryNumber,
    salesOrderId: salesOrder.id,
    customerName: salesOrder.customerName,
    customerId: salesOrder.customerId,
    items: salesOrder.items,
    status: 'Pending',
    destinationAddress: '', 
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId
  };

  return addDoc(doRef, data);
}

/**
 * Executes dispatch: Assigns fleet, deducts stock atomically.
 */
export async function dispatchDelivery(db: Firestore, institutionId: string, payload: DispatchPayload, userId: string) {
  const deliveryRef = doc(db, 'institutions', institutionId, 'delivery_orders', payload.deliveryId);
  const driverRef = doc(db, 'institutions', institutionId, 'drivers', payload.driverId);
  const vehicleRef = doc(db, 'institutions', institutionId, 'vehicles', payload.vehicleId);

  return runTransaction(db, async (transaction) => {
    const delSnap = await transaction.get(deliveryRef);
    if (!delSnap.exists()) throw new Error("Delivery Order not found.");
    const delivery = delSnap.data();

    // 1. Stock Deduction Logic
    for (const item of delivery.items) {
      const productRef = doc(db, 'institutions', institutionId, 'products', item.productId);
      transaction.update(productRef, {
        totalStock: increment(-item.qty),
        updatedAt: serverTimestamp()
      });
      
      const moveRef = doc(collection(db, 'institutions', institutionId, 'movements'));
      transaction.set(moveRef, {
        productId: item.productId,
        warehouseId: payload.warehouseId,
        type: 'Out',
        quantity: -item.qty,
        reference: `Dispatch: ${delivery.deliveryNumber}`,
        timestamp: serverTimestamp(),
        status: 'Completed'
      });
    }

    // 2. Update Delivery Order
    transaction.update(deliveryRef, {
      driverId: payload.driverId,
      vehicleId: payload.vehicleId,
      warehouseId: payload.warehouseId,
      destinationAddress: payload.destinationAddress,
      status: 'Dispatched',
      dispatchedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 3. Update Fleet Status
    transaction.update(driverRef, { status: 'Busy', updatedAt: serverTimestamp() });
    transaction.update(vehicleRef, { status: 'On Trip', updatedAt: serverTimestamp() });
  });
}

/**
 * Finalizes delivery: Completes cycle, frees fleet assets.
 */
export async function confirmDelivery(db: Firestore, institutionId: string, deliveryId: string) {
  const deliveryRef = doc(db, 'institutions', institutionId, 'delivery_orders', deliveryId);

  return runTransaction(db, async (transaction) => {
    const delSnap = await transaction.get(deliveryRef);
    if (!delSnap.exists()) throw new Error("Delivery Order not found.");
    const delivery = delSnap.data();

    transaction.update(deliveryRef, { 
      status: 'Delivered', 
      deliveredAt: serverTimestamp(),
      updatedAt: serverTimestamp() 
    });

    if (delivery.driverId) {
      const driverRef = doc(db, 'institutions', institutionId, 'drivers', delivery.driverId);
      transaction.update(driverRef, { status: 'Available', updatedAt: serverTimestamp() });
    }
    if (delivery.vehicleId) {
      const vehicleRef = doc(db, 'institutions', institutionId, 'vehicles', delivery.vehicleId);
      transaction.update(vehicleRef, { status: 'Available', updatedAt: serverTimestamp() });
    }
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
