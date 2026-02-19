
'use client';

import { Firestore, collection, doc, serverTimestamp, increment, getDoc, runTransaction, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { postJournalEntry } from '../accounting/journal.service';
import { recordStockMovement } from '../inventory/inventory.service';
import { getNextSequence } from '../sequence-service';
import { createGiftCard } from '../crm/crm.service';

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
  orderId?: string;
  issueGiftCard?: boolean;
  giftCardAmount?: number;
  appliedPromoId?: string;
}

/**
 * Bootstraps the required Sales financial nodes in the COA.
 */
export async function bootstrapSalesFinancials(db: Firestore, institutionId: string) {
  const nodes = [
    { id: 'sales_revenue', code: '4000', name: 'Product Sales Revenue', type: 'Income', subtype: 'Sales Revenue' },
    { id: 'accounts_receivable', code: '1200', name: 'Accounts Receivable', type: 'Asset', subtype: 'Accounts Receivable' },
    { id: 'vat_payable', code: '2200', name: 'VAT (Output) Payable', type: 'Liability', subtype: 'VAT Payable' },
    { id: 'cash_on_hand', code: '1000', name: 'Main Branch Till', type: 'Asset', subtype: 'Cash & Bank' },
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

  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'sales');
  await setDoc(setupRef, {
    salesRevenueAccountId: 'sales_revenue',
    accountsReceivableAccountId: 'accounts_receivable',
    vatPayableAccountId: 'vat_payable',
    cashOnHandAccountId: 'cash_on_hand'
  }, { merge: true });
}

export async function createSalesInvoice(db: Firestore, institutionId: string, payload: SalesInvoicePayload, userId: string) {
  if (!institutionId || !db) return;

  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  const setupSnap = await getDoc(setupRef);
  if (!setupSnap.exists()) throw new Error("Accounting setup missing.");
  const setup = setupSnap.data();

  // 1. Generate Sequence
  const invoiceNumber = await getNextSequence(db, institutionId, 'sales_invoice');

  // 2. Initial Save as Draft (No Posting Yet)
  const invoiceRef = collection(db, 'institutions', institutionId, 'sales_invoices');
  const newInvoice = await addDoc(invoiceRef, {
    ...payload,
    invoiceNumber,
    status: 'Draft',
    isPaid: false,
    balance: payload.total,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // 3. Optional: Issue Gift Card autonomously
  if (payload.issueGiftCard && payload.giftCardAmount && payload.giftCardAmount > 0) {
    const gcCode = await getNextSequence(db, institutionId, 'gift_card');
    await createGiftCard(db, institutionId, {
      code: gcCode,
      initialBalance: payload.giftCardAmount,
      balance: payload.giftCardAmount,
      status: 'Active',
      customerId: payload.customerId,
      sourceInvoiceId: newInvoice.id,
      issuedBy: userId
    });
  }

  return newInvoice;
}

export async function finalizeInvoice(db: Firestore, institutionId: string, invoiceId: string) {
  const invoiceRef = doc(db, 'institutions', institutionId, 'sales_invoices', invoiceId);
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  
  return runTransaction(db, async (transaction) => {
    const [invSnap, setupSnap] = await Promise.all([
      transaction.get(invoiceRef),
      transaction.get(setupRef)
    ]);

    if (!invSnap.exists()) throw new Error("Invoice not found");
    if (!setupSnap.exists()) throw new Error("Accounting setup incomplete");

    const inv = invSnap.data();
    const setup = setupSnap.data();

    if (inv.status !== 'Draft') throw new Error("Only draft invoices can be finalized.");

    const debitAccountId = inv.paymentMethod === 'Credit' 
      ? setup.accountsReceivableAccountId 
      : setup.cashOnHandAccountId;

    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Sales Invoice ${inv.invoiceNumber} finalized`,
      reference: inv.invoiceNumber,
      items: [
        { accountId: debitAccountId, amount: inv.total, type: 'Debit' },
        { accountId: setup.salesRevenueAccountId, amount: inv.subtotal, type: 'Credit' },
        { accountId: setup.vatPayableAccountId, amount: inv.taxTotal, type: 'Credit' },
      ]
    });

    transaction.update(invoiceRef, {
      status: 'Finalized',
      isPaid: inv.paymentMethod !== 'Credit',
      balance: inv.paymentMethod === 'Credit' ? inv.total : 0,
      updatedAt: serverTimestamp()
    });
  });
}

export async function createQuotation(db: Firestore, institutionId: string, payload: any, userId: string) {
  const quoteNumber = await getNextSequence(db, institutionId, 'sales_quotation');
  const ref = collection(db, 'institutions', institutionId, 'sales_quotations');
  return addDoc(ref, {
    ...payload,
    quoteNumber,
    status: 'Draft',
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateQuotationStatus(db: Firestore, institutionId: string, quoteId: string, status: 'Sent' | 'Confirmed') {
  const quoteRef = doc(db, 'institutions', institutionId, 'sales_quotations', quoteId);
  
  if (status === 'Confirmed') {
    return runTransaction(db, async (transaction) => {
      const snap = await transaction.get(quoteRef);
      if (!snap.exists()) throw new Error("Quote not found");
      const data = snap.data();

      transaction.update(quoteRef, { status: 'Confirmed', updatedAt: serverTimestamp() });

      const orderNumber = await getNextSequence(db, institutionId, 'sales_order');
      const orderRef = doc(collection(db, 'institutions', institutionId, 'sales_orders'));
      transaction.set(orderRef, {
        customerName: data.customerName,
        customerId: data.customerId || `CUST-${Date.now()}`,
        items: data.items || [],
        total: data.total || 0,
        subtotal: data.subtotal || 0,
        taxTotal: data.taxTotal || 0,
        quoteId: quoteId,
        orderNumber,
        status: 'Draft',
        createdBy: data.createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
  }

  return updateDoc(quoteRef, { status, updatedAt: serverTimestamp() });
}

export async function createSalesOrder(db: Firestore, institutionId: string, payload: any, userId: string) {
  const orderNumber = await getNextSequence(db, institutionId, 'sales_order');
  const ref = collection(db, 'institutions', institutionId, 'sales_orders');
  return addDoc(ref, {
    ...payload,
    orderNumber,
    status: 'Draft',
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function confirmSalesOrder(db: Firestore, institutionId: string, orderId: string) {
  const orderRef = doc(db, 'institutions', institutionId, 'sales_orders', orderId);
  return updateDoc(orderRef, { status: 'Confirmed', updatedAt: serverTimestamp() });
}

export async function createDeliveryNote(db: Firestore, institutionId: string, payload: {
  invoiceId: string;
  warehouseId: string;
  items: SalesItem[];
}) {
  const dnNumber = await getNextSequence(db, institutionId, 'delivery_order');
  
  for (const item of payload.items) {
    await recordStockMovement(db, institutionId, {
      productId: item.productId,
      warehouseId: payload.warehouseId,
      type: 'Out',
      quantity: item.qty,
      reference: `Delivery: ${dnNumber}`,
      unitCost: 0 
    });
  }

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

  const subtotal = payload.items.reduce((sum, i) => sum + i.total, 0);
  const tax = subtotal * 0.16;
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
