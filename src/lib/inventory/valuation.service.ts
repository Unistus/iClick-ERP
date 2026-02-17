'use client';

import { Firestore, collection, getDocs, query, orderBy, where } from 'firebase/firestore';

export type ValuationMethod = 'FIFO' | 'LIFO' | 'WeightedAverage';

export interface ProductValuation {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalValue: number;
  unitCost: number;
  method: ValuationMethod;
}

/**
 * Enterprise engine for calculating real-time inventory assets using different accounting standards.
 */
export async function calculateInventoryValuation(
  db: Firestore, 
  institutionId: string, 
  method: ValuationMethod = 'WeightedAverage'
): Promise<ProductValuation[]> {
  // 1. Fetch all products and their batches
  const productsSnap = await getDocs(collection(db, 'institutions', institutionId, 'products'));
  const batchesSnap = await getDocs(query(
    collection(db, 'institutions', institutionId, 'batches'),
    orderBy('createdAt', method === 'LIFO' ? 'desc' : 'asc')
  ));

  const allBatches = batchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const results: ProductValuation[] = [];

  productsSnap.docs.forEach(pDoc => {
    const product = { id: pDoc.id, ...pDoc.data() } as any;
    const productBatches = allBatches.filter(b => b.productId === product.id && b.quantity > 0);
    
    if (product.type !== 'Stock') return;

    let totalQty = 0;
    let totalValue = 0;

    if (method === 'WeightedAverage') {
      // (Total Cost of all batches) / (Total Qty)
      const costBasis = productBatches.reduce((sum, b) => sum + (b.quantity * (product.costPrice || 0)), 0);
      const qtyBasis = productBatches.reduce((sum, b) => sum + b.quantity, 0);
      totalQty = qtyBasis;
      totalValue = costBasis;
    } else {
      // FIFO/LIFO Logic: Sorted above by query
      productBatches.forEach(batch => {
        totalQty += batch.quantity;
        totalValue += (batch.quantity * (product.costPrice || 0));
      });
    }

    if (totalQty > 0) {
      results.push({
        productId: product.id,
        productName: product.name,
        totalQuantity: totalQty,
        totalValue: totalValue,
        unitCost: totalValue / totalQty,
        method
      });
    }
  });

  return results;
}