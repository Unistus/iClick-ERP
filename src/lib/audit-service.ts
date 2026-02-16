
'use client';

import { Firestore, collection, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Global utility to log system events for compliance and security.
 */
export function logSystemEvent(
  db: Firestore,
  institutionId: string,
  user: User | null,
  module: string,
  action: string,
  details: string,
  status: 'Success' | 'Failure' = 'Success'
) {
  if (!institutionId || !db) return;

  const logColRef = collection(db, 'institutions', institutionId, 'audit_logs');
  
  const data = {
    institutionId,
    userId: user?.uid || 'anonymous',
    userEmail: user?.email || 'anonymous',
    module,
    action,
    details,
    status,
    timestamp: serverTimestamp(),
    ipAddress: 'client-edge-access', // In production, this would be captured by a Cloud Function
  };

  addDocumentNonBlocking(logColRef, data);
}
