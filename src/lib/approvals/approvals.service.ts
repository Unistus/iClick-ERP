'use client';

import { Firestore, collection, doc, serverTimestamp, addDoc, updateDoc, getDoc, query, where, getDocs, orderBy, runTransaction, increment } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Escalated' | 'Auto-Approved';
export type ApproverModule = 'Sales' | 'Procurement' | 'Accounting' | 'Payroll' | 'Inventory' | 'POS' | 'HR';

export interface ApprovalRequestPayload {
  module: ApproverModule;
  action: string;
  sourceDocId: string;
  requestedBy: string;
  requestedByName: string;
  amount?: number;
  data: any; // Snapshot of data to review
  justification: string;
  branchId?: string;
  departmentId?: string;
}

/**
 * Universal Approval Engine Service
 */

/**
 * Initializes an approval request. 
 * Checks against institutional workflow rules to determine if approval is needed or auto-authorized.
 */
export async function initiateApprovalRequest(db: Firestore, institutionId: string, payload: ApprovalRequestPayload): Promise<{ status: ApprovalStatus; requestId?: string }> {
  const workflowsRef = collection(db, 'institutions', institutionId, 'approval_workflows');
  const q = query(workflowsRef, where('triggerModule', '==', payload.module), where('isActive', '==', true));
  const workflowSnap = await getDocs(q);

  if (workflowSnap.empty) {
    return { status: 'Auto-Approved' };
  }

  // Find most specific workflow (e.g. matching action or amount threshold)
  const workflow = workflowSnap.docs[0].data();
  const levels = workflow.levels || [];

  // Check Auto-Approve Thresholds
  if (payload.amount !== undefined && workflow.autoApproveThreshold !== undefined) {
    if (payload.amount <= workflow.autoApproveThreshold) {
      return { status: 'Auto-Approved' };
    }
  }

  const requestsRef = collection(db, 'institutions', institutionId, 'approval_requests');
  const data = {
    ...payload,
    workflowId: workflowSnap.docs[0].id,
    status: 'Pending',
    currentLevel: 1,
    totalLevels: levels.length,
    history: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(requestsRef, data).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: requestsRef.path,
      operation: 'create',
      requestResourceData: data
    } satisfies SecurityRuleContext));
    throw err;
  });

  return { status: 'Pending', requestId: docRef.id };
}

/**
 * Submits a decision for an approval request level.
 */
export async function submitApprovalDecision(
  db: Firestore, 
  institutionId: string, 
  requestId: string, 
  decision: { status: 'Approved' | 'Rejected'; comment: string; userId: string; userName: string }
) {
  const requestRef = doc(db, 'institutions', institutionId, 'approval_requests', requestId);
  
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(requestRef);
    if (!snap.exists()) throw new Error("Request not found");
    const request = snap.data();

    if (request.status !== 'Pending') throw new Error("Request already processed");

    const historyItem = {
      ...decision,
      level: request.currentLevel,
      timestamp: new Date().toISOString()
    };

    const newHistory = [...(request.history || []), historyItem];
    
    if (decision.status === 'Rejected') {
      transaction.update(requestRef, {
        status: 'Rejected',
        history: newHistory,
        updatedAt: serverTimestamp()
      });
      return;
    }

    // Check if more levels exist
    const isFinalLevel = request.currentLevel >= request.totalLevels;
    const nextStatus = isFinalLevel ? 'Approved' : 'Pending';
    const nextLevel = isFinalLevel ? request.currentLevel : request.currentLevel + 1;

    transaction.update(requestRef, {
      status: nextStatus,
      currentLevel: nextLevel,
      history: newHistory,
      updatedAt: serverTimestamp()
    });
  });
}

/**
 * Utility to fetch workflows for a module
 */
export function getWorkflowsForModule(db: Firestore, institutionId: string, module: ApproverModule) {
  return query(
    collection(db, 'institutions', institutionId, 'approval_workflows'),
    where('triggerModule', '==', module),
    where('isActive', '==', true)
  );
}
