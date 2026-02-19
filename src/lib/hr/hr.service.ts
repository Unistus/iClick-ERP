'use client';

import { Firestore, collection, doc, serverTimestamp, addDoc, updateDoc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { getNextSequence } from '../sequence-service';

export interface EmployeePayload {
  // Identity
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female';
  nationalId: string;
  kraPin: string;
  nssfNumber?: string;
  nhifNumber?: string;
  nextOfKin?: {
    name: string;
    relation: string;
    phone: string;
  };

  // Job Placement
  branchId: string;
  departmentId: string;
  reportingManagerId?: string;
  jobTitle: string;
  jobLevelId: string;
  shiftTypeId: string;

  // Compliance
  hireDate: string;
  employmentType: 'Permanent' | 'Contract' | 'Casual' | 'Intern';
  probationEndDate?: string;
  hasWorkPermit?: boolean;
  workPermitExpiry?: string;

  // Financials
  salary: number;
  payGradeId: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  taxCategory: string;
  
  status: 'Active' | 'Onboarding' | 'Suspended' | 'Terminated';
  userId?: string; 
}

/**
 * Bootstraps the required HR financial nodes in the COA.
 */
export async function bootstrapHRFinancials(db: Firestore, institutionId: string) {
  const nodes = [
    { id: 'salaries_expense', code: '6000', name: 'Salaries & Wages', type: 'Expense', subtype: 'Salaries' },
    { id: 'overtime_expense', code: '6010', name: 'Overtime Compensation', type: 'Expense', subtype: 'Salaries' },
    { id: 'allowances_expense', code: '6020', name: 'Staff Allowances', type: 'Expense', subtype: 'Salaries' },
    { id: 'salaries_payable', code: '2300', name: 'Net Salaries Payable', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'paye_liability', code: '2310', name: 'P.A.Y.E Tax Payable', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'statutory_deductions', code: '2320', name: 'Statutory Health & Pension', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'benefits_expense', code: '6030', name: 'Employee Welfare & Benefits', type: 'Expense', subtype: 'Salaries' },
  ];

  for (const node of nodes) {
    const coaRef = doc(db, 'institutions', institutionId, 'coa', node.id);
    await setDoc(coaRef, {
      ...node,
      balance: 0,
      isActive: true,
      isTrackedForBudget: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'hr');
  await setDoc(setupRef, {
    salariesExpenseAccountId: 'salaries_expense',
    salariesPayableAccountId: 'salaries_payable',
    payeLiabilityAccountId: 'paye_liability',
    benefitsExpenseAccountId: 'benefits_expense',
    overtimeExpenseAccountId: 'overtime_expense',
    statutoryLiabilityAccountId: 'statutory_deductions',
    updatedAt: serverTimestamp(),
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

export async function updateEmployee(db: Firestore, institutionId: string, employeeId: string, payload: Partial<EmployeePayload>) {
  const ref = doc(db, 'institutions', institutionId, 'employees', employeeId);
  return updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp()
  });
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

export async function updateLeaveRequestStatus(db: Firestore, institutionId: string, requestId: string, status: 'Approved' | 'Declined') {
  const ref = doc(db, 'institutions', institutionId, 'leave_requests', requestId);
  return updateDoc(ref, {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function logDisciplinaryRecord(db: Firestore, institutionId: string, payload: any) {
  const colRef = collection(db, 'institutions', institutionId, 'disciplinary_records');
  return addDoc(colRef, {
    ...payload,
    status: 'Active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function conductPerformanceReview(db: Firestore, institutionId: string, payload: any) {
  const colRef = collection(db, 'institutions', institutionId, 'performance_reviews');
  return addDoc(colRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function createShiftAssignment(db: Firestore, institutionId: string, payload: any) {
  const colRef = collection(db, 'institutions', institutionId, 'shifts');
  return addDoc(colRef, {
    ...payload,
    status: 'Scheduled',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
