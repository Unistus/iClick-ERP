
'use client';

import { Firestore, collection, doc, serverTimestamp, addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Service to manage institutional security parameters, sessions, and encryption protocols.
 */

export interface SessionPayload {
  userId: string;
  userEmail: string;
  ipAddress: string;
  deviceType: 'Mobile' | 'Desktop';
  os: string;
  browser: string;
}

/**
 * Registers an active session heartbeat.
 */
export async function registerActiveSession(db: Firestore, institutionId: string, payload: SessionPayload) {
  const colRef = collection(db, 'institutions', institutionId, 'active_sessions');
  const data = {
    ...payload,
    lastActive: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  return addDoc(colRef, data).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: data
    } satisfies SecurityRuleContext));
  });
}

/**
 * Manages institutional authentication policy (2FA, Password Strength).
 */
export async function updateAuthPolicy(db: Firestore, institutionId: string, policy: any) {
  const ref = doc(db, 'institutions', institutionId, 'settings', 'auth_policy');
  return setDoc(ref, {
    ...policy,
    updatedAt: serverTimestamp()
  }, { merge: true }).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'write',
      requestResourceData: policy
    } satisfies SecurityRuleContext));
  });
}

/**
 * Deploys an IP restriction rule to the institutional perimeter.
 */
export async function deployIPRule(db: Firestore, institutionId: string, rule: any) {
  const colRef = collection(db, 'institutions', institutionId, 'ip_restrictions');
  return addDoc(colRef, {
    ...rule,
    updatedAt: serverTimestamp()
  }).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: rule
    } satisfies SecurityRuleContext));
  });
}

/**
 * Rotates institutional encryption keys (Logic simulation).
 */
export async function rotateInstitutionalKeys(db: Firestore, institutionId: string) {
  const ref = doc(db, 'institutions', institutionId, 'settings', 'encryption');
  return updateDoc(ref, {
    keyVersion: serverTimestamp(), // In reality, this would be a KMS key version ID
    lastRotation: serverTimestamp(),
    status: 'Healthy'
  });
}
