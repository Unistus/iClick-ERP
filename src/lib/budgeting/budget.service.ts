'use client';

import { Firestore, collection, doc, serverTimestamp, getDocs, query, where, writeBatch, setDoc, getDoc } from 'firebase/firestore';

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

  return batch.commit();
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
  // 1. Fetch Period Dates
  const periodRef = doc(db, 'institutions', institutionId, 'fiscal_periods', periodId);
  const periodSnap = await getDoc(periodRef);
  if (!periodSnap.exists()) return [];
  const period = periodSnap.data();
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);

  // 2. Fetch All Budget-Tracked Accounts
  const coaSnap = await getDocs(query(
    collection(db, 'institutions', institutionId, 'coa'),
    where('isTrackedForBudget', '==', true)
  ));
  const accounts = coaSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  // 3. Fetch Period Allocations
  const allocSnap = await getDocs(collection(db, 'institutions', institutionId, 'fiscal_periods', periodId, 'allocations'));
  const allocations = allocSnap.docs.reduce((acc, d) => {
    acc[d.id] = d.data().limit || 0;
    return acc;
  }, {} as Record<string, number>);

  // 4. Fetch and Aggregate Journal Entries in range
  // Note: For large datasets, this would be a Cloud Function or use specialized aggregation docs.
  const jeSnap = await getDocs(query(
    collection(db, 'institutions', institutionId, 'journal_entries'),
    where('date', '>=', start),
    where('date', '<=', end)
  ));

  const actuals: Record<string, number> = {};
  jeSnap.docs.forEach(d => {
    const entry = d.data();
    entry.items?.forEach((item: any) => {
      if (allocations[item.accountId] !== undefined) {
        if (item.type === 'Debit') {
          actuals[item.accountId] = (actuals[item.accountId] || 0) + item.amount;
        } else {
          actuals[item.accountId] = (actuals[item.accountId] || 0) - item.amount;
        }
      }
    });
  });

  // 5. Consolidate
  return accounts.map(acc => {
    const limit = allocations[acc.id] || 0;
    const actual = actuals[acc.id] || 0;
    return {
      accountId: acc.id,
      accountName: acc.name,
      accountCode: acc.code,
      limit,
      actual,
      variance: limit - actual,
      utilization: limit > 0 ? (actual / limit) * 100 : 0
    };
  });
}
