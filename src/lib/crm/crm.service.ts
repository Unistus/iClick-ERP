'use client';

import { Firestore, collection, doc, serverTimestamp, addDoc, updateDoc, increment, runTransaction, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export interface CustomerPayload {
  name: string;
  legalName?: string;
  registrationNumber?: string;
  registrationDate?: string;
  email: string;
  phone: string;
  status: 'Lead' | 'Active' | 'Blocked';
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
}

/**
 * Service to manage customer lifecycle and loyalty logic.
 */

export function registerCustomer(db: Firestore, institutionId: string, payload: CustomerPayload) {
  const colRef = collection(db, 'institutions', institutionId, 'customers');
  const data = {
    ...payload,
    loyaltyPoints: 0,
    walletBalance: 0,
    tier: payload.tier || 'Silver',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  addDoc(colRef, data).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: data
    } satisfies SecurityRuleContext));
  });
}

/**
 * Updates an existing customer profile.
 */
export function updateCustomer(db: Firestore, institutionId: string, customerId: string, payload: Partial<CustomerPayload>) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  const data = {
    ...payload,
    updatedAt: serverTimestamp()
  };

  updateDoc(customerRef, data).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: customerRef.path,
      operation: 'update',
      requestResourceData: data
    } satisfies SecurityRuleContext));
  });
}

/**
 * Removes a customer profile from the active directory.
 */
export function archiveCustomer(db: Firestore, institutionId: string, customerId: string) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  deleteDoc(customerRef).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: customerRef.path,
      operation: 'delete'
    } satisfies SecurityRuleContext));
  });
}

export function updateCustomerWallet(db: Firestore, institutionId: string, customerId: string, amount: number, reference: string) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  const walletLogRef = collection(db, 'institutions', institutionId, 'wallets');

  runTransaction(db, async (transaction) => {
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
  }).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: walletLogRef.path,
      operation: 'write'
    } satisfies SecurityRuleContext));
  });
}

export function awardLoyaltyPoints(db: Firestore, institutionId: string, customerId: string, points: number, reference: string) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  
  updateDoc(customerRef, {
    loyaltyPoints: increment(points),
    updatedAt: serverTimestamp()
  }).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: customerRef.path,
      operation: 'update'
    } satisfies SecurityRuleContext));
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

  addDoc(colRef, data).catch(err => {
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

export function createGiftCard(db: Firestore, institutionId: string, payload: any) {
  const colRef = collection(db, 'institutions', institutionId, 'gift_cards');
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
