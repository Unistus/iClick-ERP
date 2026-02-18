'use client';

import { Firestore, collection, doc, serverTimestamp, addDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { logSystemEvent } from '../audit-service';

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

export async function registerCustomer(db: Firestore, institutionId: string, payload: CustomerPayload) {
  const colRef = collection(db, 'institutions', institutionId, 'customers');
  return addDoc(colRef, {
    ...payload,
    loyaltyPoints: 0,
    walletBalance: 0,
    tier: payload.tier || 'Silver',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateCustomerWallet(db: Firestore, institutionId: string, customerId: string, amount: number, reference: string) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  const walletLogRef = collection(db, 'institutions', institutionId, 'wallets');

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
  });
}

export async function awardLoyaltyPoints(db: Firestore, institutionId: string, customerId: string, points: number, reference: string) {
  const customerRef = doc(db, 'institutions', institutionId, 'customers', customerId);
  
  return updateDoc(customerRef, {
    loyaltyPoints: increment(points),
    updatedAt: serverTimestamp()
  });
}

export async function createMarketingCampaign(db: Firestore, institutionId: string, payload: any) {
  const colRef = collection(db, 'institutions', institutionId, 'campaigns');
  return addDoc(colRef, {
    ...payload,
    status: 'Draft',
    reach: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}