
'use client';

import { Firestore, collection, doc, serverTimestamp, getDocs, query, where, writeBatch, getDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export interface BudgetAllocation {
  accountId: string;
  accountName: string;
  accountCode: string;
  limit: number;
  actual: number;
  variance: number;
  utilization: number;
}

/**
 * Service to manage period-based budget allocations and calculate real-time variance.
 */

export async function saveBudgetAllocations(
  db: Firestore, 
  institutionId: string, 
  periodId: string, 
  allocations: { accountId: string, limit: number }[]
) {
  const batch = writeBatch(db);
  const baseRef = collection(db, 'institutions', institutionId, 'fiscal_periods', periodId, 'allocations');

  allocations.forEach(alloc => {
    const docRef = doc(baseRef, alloc.accountId);
    batch.set(docRef, {
      limit: alloc.limit,
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  return batch.commit().catch(async (err) => {
    const permissionError = new FirestorePermissionError({
      path: baseRef.path,
      operation: 'write',
      requestResourceData: allocations
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  });
}

/**
 * Computes actual spend for a period by aggregating Journal Entries.
 * Factors in all DEBITS to Expense/Asset nodes within the period range.
 */
export async function calculatePeriodVariance(
  db: Firestore,
  institutionId: string,
  periodId: string
): Promise<BudgetAllocation[]> {
  try {
    const periodRef = doc(db, 'institutions', institutionId, 'fiscal_periods', periodId);
    const periodSnap = await getDoc(periodRef);
    if (!periodSnap.exists()) return [];
    const period = periodSnap.data();
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);

    // 1. Fetch budgeted accounts
    const coaQuery = query(
      collection(db, 'institutions', institutionId, 'coa'),
      where('isTrackedForBudget', '==', true)
    );
    const coaSnap = await getDocs(coaQuery);
    const accounts = coaSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // 2. Fetch allocations
    const allocRef = collection(db, 'institutions', institutionId, 'fiscal_periods', periodId, 'allocations');
    const allocSnap = await getDocs(allocRef);
    const allocations = allocSnap.docs.reduce((acc, d) => {
      acc[d.id] = d.data().limit || 0;
      return acc;
    }, {} as Record<string, number>);

    // 3. Aggregate Journal Entries
    const jeQuery = query(
      collection(db, 'institutions', institutionId, 'journal_entries'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    const jeSnap = await getDocs(jeQuery);

    const actuals: Record<string, number> = {};
    jeSnap.docs.forEach(d => {
      const entry = d.data();
      entry.items?.forEach((item: any) => {
        if (allocations[item.accountId] !== undefined) {
          const amount = item.amount || 0;
          const impact = item.type === 'Debit' ? amount : -amount;
          actuals[item.accountId] = (actuals[item.accountId] || 0) + impact;
        }
      });
    });

    return accounts.map(acc => {
      const limitValue = allocations[acc.id] || 0;
      const actualValue = actuals[acc.id] || 0;
      return {
        accountId: acc.id,
        accountName: acc.name,
        accountCode: acc.code,
        limit: limitValue,
        actual: actualValue,
        variance: limitValue - actualValue,
        utilization: limitValue > 0 ? (actualValue / limitValue) * 100 : 0
      };
    });
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
      path: `institutions/${institutionId}/fiscal_periods/${periodId}`,
      operation: 'list'
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }
}

/**
 * Aggregates actual spend by branch for a specific period.
 */
export async function calculateDepartmentalSpend(
  db: Firestore,
  institutionId: string,
  periodId: string
): Promise<Record<string, number>> {
  try {
    const periodRef = doc(db, 'institutions', institutionId, 'fiscal_periods', periodId);
    const periodSnap = await getDoc(periodRef);
    if (!periodSnap.exists()) return {};
    const period = periodSnap.data();
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);

    const budgetAccSnap = await getDocs(query(
      collection(db, 'institutions', institutionId, 'coa'),
      where('isTrackedForBudget', '==', true)
    ));
    const trackedAccountIds = budgetAccSnap.docs.map(d => d.id);

    const jeSnap = await getDocs(query(
      collection(db, 'institutions', institutionId, 'journal_entries'),
      where('date', '>=', start),
      where('date', '<=', end)
    ));

    const branchSpend: Record<string, number> = {};

    jeSnap.docs.forEach(d => {
      const entry = d.data();
      const branchId = entry.branchId || 'UNASSIGNED';
      
      entry.items?.forEach((item: any) => {
        if (trackedAccountIds.includes(item.accountId)) {
          const amount = item.amount || 0;
          const impact = item.type === 'Debit' ? amount : -amount;
          branchSpend[branchId] = (branchSpend[branchId] || 0) + impact;
        }
      });
    });

    return branchSpend;
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
      path: `institutions/${institutionId}/journal_entries`,
      operation: 'list'
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }
}
