'use client';

import { Firestore, collection, doc, serverTimestamp, addDoc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
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
  userId?: string; // Link to system user login
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
