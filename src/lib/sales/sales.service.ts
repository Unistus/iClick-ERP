
'use client';

import { Firestore, collection, doc, serverTimestamp, increment, getDoc, runTransaction, addDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { postJournalEntry } from '../accounting/journal.service';
import { recordStockMovement } from '../inventory/inventory.service';
import { getNextSequence } from '../sequence-service';

export interface SalesItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  total: number;
  taxAmount: number;
}

export interface SalesInvoicePayload {
  customerId: string;
  customerName: string;
  items: SalesItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: 'Credit' | 'Cash' | 'Bank';
}

/**
 * Enterprise engine for Sales Lifecycle management.
 * Orchestrates GL posting, Stock deduction, and Sequencing.
 */

export async function createSalesInvoice(db: Firestore, institutionId: string, payload: SalesInvoicePayload, userId: string) {
  if (!institutionId || !db) return;

  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  const setupSnap = await getDoc(setupRef);
  if (!setupSnap.exists()) throw new Error("Accounting setup missing.");
  const setup = setupSnap.data();

  // 1. Generate Sequence
  const invoiceNumber = await getNextSequence(db, institutionId, 'sales_invoice');

  // 2. Post to Ledger
  // DR: A/R or Bank (Total)
  // CR: Sales Revenue (Subtotal)
  // CR: VAT Payable (Tax)
  const debitAccountId = payload.paymentMethod === 'Credit' 
    ? setup.accountsReceivableAccountId 
    : setup.cashOnHandAccountId;

  await postJournalEntry(db, institutionId, {
    date: new Date(),
    description: `Sales Invoice ${invoiceNumber} to ${payload.customerName}`,
    reference: invoiceNumber,
    items: [
      { accountId: debitAccountId, amount: payload.total, type: 'Debit' },
      { accountId: setup.salesRevenueAccountId, amount: payload.subtotal, type: 'Credit' },
      { accountId: setup.vatPayableAccountId, amount: payload.taxTotal, type: 'Credit' },
    ]
  });

  // 3. Save Invoice Record
  const invoiceRef = collection(db, 'institutions', institutionId, 'sales_invoices');
  return addDoc(invoiceRef, {
    ...payload,
    invoiceNumber,
    status: 'Finalized',
    isPaid: payload.paymentMethod !== 'Credit',
    balance: payload.paymentMethod === 'Credit' ? payload.total : 0,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function createDeliveryNote(db: Firestore, institutionId: string, payload: {
  invoiceId: string;
  warehouseId: string;
  items: SalesItem[];
}) {
  const dnNumber = await getNextSequence(db, institutionId, 'delivery_order');
  
  // 1. Log Stock Movement for each item
  for (const item of payload.items) {
    await recordStockMovement(db, institutionId, {
      productId: item.productId,
      warehouseId: payload.warehouseId,
      type: 'Out',
      quantity: item.qty,
      reference: `Delivery: ${dnNumber}`,
      unitCost: 0 // Service handles fetching cost price internally
    });
  }

  // 2. Save DN record
  const dnRef = collection(db, 'institutions', institutionId, 'delivery_notes');
  return addDoc(dnRef, {
    ...payload,
    deliveryNumber: dnNumber,
    status: 'Dispatched',
    createdAt: serverTimestamp()
  });
}

export async function processSalesReturn(db: Firestore, institutionId: string, payload: {
  invoiceId: string;
  items: SalesItem[];
  reason: string;
}) {
  const returnNumber = `RET-${Date.now()}`;
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  const setupSnap = await getDoc(setupRef);
  const setup = setupSnap.data();

  // Reverse Ledger
  const subtotal = payload.items.reduce((sum, i) => sum + i.total, 0);
  const tax = subtotal * 0.16; // Simplified for MVP
  const total = subtotal + tax;

  await postJournalEntry(db, institutionId, {
    date: new Date(),
    description: `Sales Return ${returnNumber} for Inv ${payload.invoiceId}`,
    reference: returnNumber,
    items: [
      { accountId: setup!.accountsReceivableAccountId, amount: total, type: 'Credit' },
      { accountId: setup!.salesRevenueAccountId, amount: subtotal, type: 'Debit' },
      { accountId: setup!.vatPayableAccountId, amount: tax, type: 'Debit' },
    ]
  });

  const returnsRef = collection(db, 'institutions', institutionId, 'sales_returns');
  return addDoc(returnsRef, {
    ...payload,
    returnNumber,
    totalAmount: total,
    createdAt: serverTimestamp()
  });
}
