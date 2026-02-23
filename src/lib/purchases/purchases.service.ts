'use client';

import { Firestore, collection, doc, serverTimestamp, increment, getDoc, runTransaction, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import { postJournalEntry } from '../accounting/journal.service';
import { recordStockMovement } from '../inventory/inventory.service';
import { getNextSequence } from '../sequence-service';
import { initiateApprovalRequest } from '../approvals/approvals.service';
import { checkTransactionAgainstBudget } from '../budgeting/budget.service';

export interface PurchaseItem {
  productId: string;
  name: string;
  qty: number;
  unitCost: number;
  total: number;
}

/**
 * Bootstraps the required Purchases financial nodes in the COA.
 */
export async function bootstrapPurchasesFinancials(db: Firestore, institutionId: string) {
  const nodes = [
    { id: 'accounts_payable', code: '2100', name: 'Accounts Payable (Trade)', type: 'Liability', subtype: 'Accounts Payable' },
    { id: 'input_vat', code: '1210', name: 'VAT (Input) Receivable', type: 'Asset', subtype: 'Current Assets' },
    { id: 'inventory_asset', code: '1300', name: 'Inventory Stock Assets', type: 'Asset', subtype: 'Inventory' },
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

  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'purchases');
  await setDoc(setupRef, {
    accountsPayableAccountId: 'accounts_payable',
    purchaseTaxAccountId: 'input_vat',
    inventoryAssetAccountId: 'inventory_asset'
  }, { merge: true });
}

/**
 * Creates a Purchase Order with integrated Governance Guards.
 * Handles Budget Overrides and High-Value Authorizations.
 */
export async function createPurchaseOrder(db: Firestore, institutionId: string, payload: any, userId: string) {
  if (!institutionId || !db) return;

  // 1. Budget Verification Node
  const budgetCheck = await checkTransactionAgainstBudget(db, institutionId, payload.expenseAccountId, payload.total);
  
  // 2. Resolve Sequence
  const poNumber = await getNextSequence(db, institutionId, 'purchase_order');
  const ref = collection(db, 'institutions', institutionId, 'purchase_orders');
  
  let poStatus = 'Draft';
  let approvalRequestId = null;

  // 3. GOVERNANCE FIREWALL: Check if approval is required
  // Rule A: Budget Breach (Override required)
  // Rule B: High Value (> 50,000)
  if (!budgetCheck.allowed || payload.total > 50000) {
    const approval = await initiateApprovalRequest(db, institutionId, {
      module: 'Procurement',
      action: !budgetCheck.allowed ? 'Budget Override Authorization' : 'High-Value PO Approval',
      sourceDocId: 'pending', // Linked after creation
      requestedBy: userId,
      requestedByName: 'Procurement Officer',
      amount: payload.total,
      data: {
        poNumber,
        supplierName: payload.supplierName,
        isBudgetBreach: !budgetCheck.allowed,
        utilization: budgetCheck.utilization
      },
      justification: !budgetCheck.allowed 
        ? `PO exceeds budget ceiling by ${((budgetCheck.utilization || 0) - 100).toFixed(1)}%. Requires fiscal override.`
        : `Order value of ${payload.total} exceeds institutional manual threshold.`
    });

    if (approval.status === 'Pending') {
      poStatus = 'Pending Approval';
      approvalRequestId = approval.requestId || null;
    }
  }

  // 4. Persistence
  const newPo = await addDoc(ref, {
    ...payload,
    poNumber,
    status: poStatus,
    approvalRequestId,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  if (approvalRequestId) {
    await updateDoc(doc(db, 'institutions', institutionId, 'approval_requests', approvalRequestId), {
      sourceDocId: newPo.id
    });
  }

  return { id: newPo.id, status: poStatus };
}

export async function receiveGRN(db: Firestore, institutionId: string, payload: {
  poId: string;
  warehouseId: string;
  items: PurchaseItem[];
}) {
  const grnNumber = await getNextSequence(db, institutionId, 'grn');
  
  return runTransaction(db, async (transaction) => {
    const poRef = doc(db, 'institutions', institutionId, 'purchase_orders', payload.poId);
    const poSnap = await transaction.get(poRef);
    
    if (!poSnap.exists()) throw new Error("Source PO not found.");
    const po = poSnap.data();

    // BLOCKER: Cannot receive goods for a PO that isn't approved/finalized
    if (po.status === 'Pending Approval') {
      throw new Error("This Purchase Order is locked awaiting governance authorization.");
    }

    transaction.update(poRef, { status: 'Received', updatedAt: serverTimestamp() });

    for (const item of payload.items) {
      await recordStockMovement(db, institutionId, {
        productId: item.productId,
        warehouseId: payload.warehouseId,
        type: 'In',
        quantity: item.qty,
        reference: `GRN: ${grnNumber}`,
        unitCost: item.unitCost
      });
    }

    const grnRef = doc(collection(db, 'institutions', institutionId, 'grns'));
    transaction.set(grnRef, {
      ...payload,
      grnNumber,
      status: 'Completed',
      createdAt: serverTimestamp()
    });
  });
}

export async function createVendorInvoice(db: Firestore, institutionId: string, payload: any) {
  const invoiceNumber = await getNextSequence(db, institutionId, 'supplier_invoice');
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  
  return runTransaction(db, async (transaction) => {
    const setupSnap = await transaction.get(setupRef);
    if (!setupSnap.exists()) throw new Error("Accounting setup missing");
    const setup = setupSnap.data();

    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Vendor Invoice ${invoiceNumber} from ${payload.supplierName}`,
      reference: invoiceNumber,
      items: [
        { accountId: payload.allocationAccountId, amount: payload.total, type: 'Debit' },
        { accountId: setup.accountsPayableAccountId, amount: payload.total, type: 'Credit' },
      ]
    });

    const invRef = doc(collection(db, 'institutions', institutionId, 'vendor_invoices'));
    transaction.set(invRef, {
      ...payload,
      invoiceNumber,
      status: 'Finalized',
      balance: payload.total,
      createdAt: serverTimestamp()
    });
  });
}

export async function processPurchaseReturn(db: Firestore, institutionId: string, payload: {
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  total: number;
  reason: string;
  items: { productId: string; qty: number; unitCost: number }[];
}) {
  const returnNumber = `PRET-${Date.now()}`;
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'accounting');
  
  return runTransaction(db, async (transaction) => {
    const setupSnap = await transaction.get(setupRef);
    if (!setupSnap.exists()) throw new Error("Accounting setup missing");
    const setup = setupSnap.data();

    if (!setup.accountsPayableAccountId || !setup.inventoryAssetAccountId) {
      throw new Error("Ledger mappings for AP or Inventory Asset missing in setup.");
    }

    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Purchase Return ${returnNumber} to ${payload.supplierName}`,
      reference: returnNumber,
      items: [
        { accountId: setup.accountsPayableAccountId, amount: payload.total, type: 'Debit' },
        { accountId: setup.inventoryAssetAccountId, amount: payload.total, type: 'Credit' },
      ]
    });

    for (const item of payload.items) {
      await recordStockMovement(db, institutionId, {
        productId: item.productId,
        warehouseId: payload.warehouseId,
        type: 'Out',
        quantity: item.qty,
        reference: `Purchase Return: ${returnNumber}`,
        unitCost: item.unitCost
      });
    }

    const returnRef = doc(collection(db, 'institutions', institutionId, 'purchase_returns'));
    transaction.set(returnRef, {
      ...payload,
      returnNumber,
      status: 'Completed',
      createdAt: serverTimestamp()
    });
  });
}
