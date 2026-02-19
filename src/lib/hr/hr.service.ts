
'use client';

import { Firestore, collection, doc, serverTimestamp, addDoc, updateDoc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { getNextSequence } from '../sequence-service';

export interface EmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branchId: string;
  departmentId: string;
  jobTitle: string;
  salary: number;
  hireDate: string;
  status: 'Active' | 'Onboarding' | 'Suspended' | 'Terminated';
  userId?: string; 
}

/**
 * Bootstraps the required HR financial nodes in the COA.
 */
export async function bootstrapHRFinancials(db: Firestore, institutionId: string) {
  const nodes = [
    { id: 'salaries_expense', code: '6000', name: 'Salaries & Wages', type: 'Expense', subtype: 'Salaries' },
    { id: 'salaries_payable', code: '2300', name: 'Net Salaries Payable', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'paye_liability', code: '2310', name: 'P.A.Y.E Tax Payable', type: 'Liability', subtype: 'VAT Payable' },
    { id: 'staff_benefits', code: '6010', name: 'Employee Benefits & Welfare', type: 'Expense', subtype: 'Salaries' },
  ];

  for (const node of nodes) {
    const coaRef = doc(db, 'institutions', institutionId, 'coa', node.id);
    await setDoc(coaRef, {
      ...node,
      balance: 0,
      isActive: true,
      isTrackedForBudget: true, // Auto-track HR expenses
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'hr');
  await setDoc(setupRef, {
    salariesExpenseAccountId: 'salaries_expense',
    salariesPayableAccountId: 'salaries_payable',
    payeLiabilityAccountId: 'paye_liability',
    benefitsExpenseAccountId: 'staff_benefits',
  }, { merge: true });
}

export async function onboardEmployee(db: Firestore, institutionId: string, payload: EmployeePayload) {
  const employeeId = await getNextSequence(db, institutionId, 'employee_id');
  const colRef = collection(db, 'institutions', institutionId, 'employees');
  
  const data = {
    ...payload,
    employeeId,
    leaveBalance: 0,
    loyaltyScore: 100,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  return addDoc(colRef, data);
}

export async function recordAttendance(db: Firestore, institutionId: string, employeeId: string, type: 'In' | 'Out', location?: string) {
  const colRef = collection(db, 'institutions', institutionId, 'attendance');
  return addDoc(colRef, {
    employeeId,
    type,
    location: location || 'Head Office',
    timestamp: serverTimestamp(),
  });
}

export async function submitLeaveRequest(db: Firestore, institutionId: string, payload: any) {
  const colRef = collection(db, 'institutions', institutionId, 'leave_requests');
  return addDoc(colRef, {
    ...payload,
    status: 'Pending',
    createdAt: serverTimestamp(),
  });
}

export async function logDisciplinaryRecord(db: Firestore, institutionId: string, payload: any) {
  const colRef = collection(db, 'institutions', institutionId, 'disciplinary_records');
  return addDoc(colRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
}
