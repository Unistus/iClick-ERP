'use client';

import { Firestore, collection, doc, serverTimestamp, addDoc, updateDoc, increment, runTransaction, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { postJournalEntry } from '../accounting/journal.service';

export interface CustomerPayload {
  name: string;
  legalName?: string;
  registrationNumber?: string;
  registrationDate?: string;
  email: string;
  phone: string;
  status: 'Lead' | 'Pending' | 'Active' | 'Blocked';
  tier?: 'Silver' | 'Gold' | 'Platinum';
  creditLimit?: number;
  currencyId?: string;
  assignedSalesPersonId?: string;
  taxPin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  geoCountryId?: string;
  geoTownId?: string;
  geoAreaId?: string;
  preferredDeliveryTime?: 'Morning' | 'Afternoon' | 'Evening';
  deliveryNotes?: string;
  contactPerson?: {
    name: string;
    role: string;
    phone: string;
  };
  kycVerified?: boolean;
}

/**
 * Bootstraps the required CRM financial nodes in the COA.
 */
export async function bootstrapCRMFinancials(db: Firestore, institutionId: string) {
  const nodes = [
    { id: 'wallet_liability', code: '2400', name: 'Customer Stored Value', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'giftcard_liability', code: '2410', name: 'Gift Card Liability', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'loyalty_liability', code: '2420', name: 'Loyalty Points Provision', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'marketing_expense', code: '6300', name: 'Marketing & Outreach', type: 'Expense', subtype: 'Marketing' },
    { id: 'loyalty_expense', code: '6310', name: 'Loyalty Program Costs', type: 'Expense', subtype: 'Marketing' },
    { id: 'sales_discounts', code: '4100', name: 'Sales Discounts (Promos)', type: 'Income', subtype: 'Sales Revenue' },
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

  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'crm');
  await setDoc(setupRef, {
    walletAccountId: 'wallet_liability',
    giftCardAccountId: 'giftcard_liability',
    loyaltyLiabilityAccountId: 'loyalty_liability',
    loyaltyExpenseAccountId: 'loyalty_expense',
    marketingAccountId: 'marketing_expense',
    discountAccountId: 'sales_discounts',
  }, { merge: true });
}

export function registerCustomer(db: Firestore, institutionId: string, payload: CustomerPayload) {
  const colRef = collection(db, 'institutions', institutionId, 'customers');
  const data = {
    ...payload,
    loyaltyPoints: 0,
    walletBalance: 0,
    tier: payload.tier || 'Silver',
    status: payload.status || 'Pending', // New customers start as Pending or Lead
    kycVerified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  return addDoc(colRef, data).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: data
    } satisfies SecurityRuleContext));
  });
}

export function approveCustomer(db: Firestore, institutionId: string, customerId: string) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  return updateDoc(customerRef, {
    status: 'Active',
    updatedAt: serverTimestamp()
  }).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: customerRef.path,
      operation: 'update',
      requestResourceData: { status: 'Active' }
    } satisfies SecurityRuleContext));
  });
}

export function verifyKYC(db: Firestore, institutionId: string, customerId: string) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  return updateDoc(customerRef, {
    kycVerified: true,
    updatedAt: serverTimestamp()
  });
}

export function updateCustomer(db: Firestore, institutionId: string, customerId: string, payload: Partial<CustomerPayload>) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  const data = {
    ...payload,
    updatedAt: serverTimestamp()
  };

  return updateDoc(customerRef, data).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: customerRef.path,
      operation: 'update',
      requestResourceData: data
    } satisfies SecurityRuleContext));
  });
}

export function archiveCustomer(db: Firestore, institutionId: string, customerId: string) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  return deleteDoc(customerRef).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: customerRef.path,
      operation: 'delete'
    } satisfies SecurityRuleContext));
  });
}

export async function updateCustomerWallet(db: Firestore, institutionId: string, customerId: string, amount: number, reference: string) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  const walletLogRef = collection(db, 'institutions', institutionId, 'wallets');
  const crmSetupRef = doc(db, 'institutions', institutionId, 'settings', 'crm');
  const accSetupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');

  const [crmSnap, accSnap] = await Promise.all([getDoc(crmSetupRef), getDoc(accSetupRef)]);
  const crmSetup = crmSnap.data();
  const accSetup = accSnap.data();

  return runTransaction(db, async (transaction) => {
    transaction.update(customerRef, {
      walletBalance: increment(amount),
      updatedAt: serverTimestamp()
    });

    transaction.set(doc(walletLogRef), {
      customerId,
      amount,
      reference,
      type: amount > 0 ? 'Top-up' : 'Debit',
      timestamp: serverTimestamp()
    });

    if (crmSetup?.walletAccountId && accSetup?.cashOnHandAccountId) {
      await postJournalEntry(db, institutionId, {
        date: new Date(),
        description: `Wallet Top-up: ${reference}`,
        reference: `WLT-${Date.now()}`,
        items: [
          { accountId: accSetup.cashOnHandAccountId, amount: Math.abs(amount), type: amount > 0 ? 'Debit' : 'Credit' },
          { accountId: crmSetup.walletAccountId, amount: Math.abs(amount), type: amount > 0 ? 'Credit' : 'Debit' },
        ]
      });
    }
  });
}

export async function awardLoyaltyPoints(db: Firestore, institutionId: string, customerId: string, points: number, reference: string) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  const crmSetupRef = doc(db, 'institutions', institutionId, 'settings', 'crm');
  const crmSnap = await getDoc(crmSetupRef);
  const crmSetup = crmSnap.data();

  if (crmSetup?.loyaltyLiabilityAccountId && crmSetup?.loyaltyExpenseAccountId) {
    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Loyalty Points Awarded: ${reference}`,
      reference: `LOY-${Date.now()}`,
      items: [
        { accountId: crmSetup.loyaltyExpenseAccountId, amount: points, type: 'Debit' },
        { accountId: crmSetup.loyaltyLiabilityAccountId, amount: points, type: 'Credit' },
      ]
    });
  }
  
  return updateDoc(customerRef, {
    loyaltyPoints: increment(points),
    updatedAt: serverTimestamp()
  });
}

export function createMarketingCampaign(db: Firestore, institutionId: string, payload: any) {
  const colRef = collection(db, 'institutions', institutionId, 'campaigns');
  const data = {
    ...payload,
    status: 'Draft',
    reach: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  return addDoc(colRef, data).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: data
    } satisfies SecurityRuleContext));
  });
}

export function createPromoCode(db: Firestore, institutionId: string, payload: any) {
  const colRef = collection(db, 'institutions', institutionId, 'promo_codes');
  const data = {
    ...payload,
    redemptionCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  return addDoc(colRef, data).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: data
    } satisfies SecurityRuleContext));
  });
}

export function updatePromoStatus(db: Firestore, institutionId: string, promoId: string, status: 'Active' | 'Paused' | 'Expired') {
  const ref = doc(db, 'institutions', institutionId, 'promo_codes', promoId);
  return updateDoc(ref, { status, updatedAt: serverTimestamp() }).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'update'
    } satisfies SecurityRuleContext));
  });
}

export async function createGiftCard(db: Firestore, institutionId: string, payload: any) {
  const colRef = collection(db, 'institutions', institutionId, 'gift_cards');
  const crmSetupRef = doc(db, 'institutions', institutionId, 'settings', 'crm');
  const accSetupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');

  const [crmSnap, accSnap] = await Promise.all([getDoc(crmSetupRef), getDoc(accSetupRef)]);
  const crmSetup = crmSnap.data();
  const accSetup = accSnap.data();

  if (crmSetup?.giftCardAccountId && accSetup?.cashOnHandAccountId) {
    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Gift Card Issued: ${payload.code}`,
      reference: `GC-${payload.code}`,
      items: [
        { accountId: accSetup.cashOnHandAccountId, amount: payload.initialBalance, type: 'Debit' },
        { accountId: crmSetup.giftCardAccountId, amount: payload.initialBalance, type: 'Credit' },
      ]
    });
  }

  const data = {
    ...payload,
    redemptionCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  return addDoc(colRef, data).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: data
    } satisfies SecurityRuleContext));
  });
}

export function updateGiftCardStatus(db: Firestore, institutionId: string, cardId: string, status: 'Active' | 'Paused' | 'Redeemed') {
  const ref = doc(db, 'institutions', institutionId, 'gift_cards', cardId);
  return updateDoc(ref, { status, updatedAt: serverTimestamp() }).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'update'
    } satisfies SecurityRuleContext));
  });
}
