'use client';

import { Firestore, collection, doc, serverTimestamp, getDoc, setDoc, query, where, getDocs, writeBatch, increment } from 'firebase/firestore';

/**
 * @fileOverview Core logic for the Payroll Engine.
 * Handles statutory computations, ledger mappings, and institutional setup.
 */

export interface EarningType {
  id: string;
  name: string;
  isTaxable: boolean;
  isPensionable: boolean;
  ledgerAccountId: string;
}

export interface DeductionType {
  id: string;
  name: string;
  isStatutory: boolean;
  ledgerAccountId: string;
}

/**
 * Bootstraps the Payroll financial hub.
 * Creates standard liability and expense nodes in the COA.
 */
export async function bootstrapPayrollFinancials(db: Firestore, institutionId: string) {
  const batch = writeBatch(db);
  
  const nodes = [
    { id: 'payroll_net_payable', code: '2300', name: 'Salaries & Wages Payable', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'payroll_paye_liability', code: '2310', name: 'P.A.Y.E Tax Liability', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'payroll_nssf_liability', code: '2320', name: 'NSSF Employee/Employer Contribution', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'payroll_nhif_liability', code: '2330', name: 'NHIF Hospital Fund Liability', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'payroll_housing_levy', code: '2340', name: 'Housing Levy Fund', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'payroll_expense_basic', code: '6000', name: 'Staff Basic Salaries', type: 'Expense', subtype: 'Salaries' },
    { id: 'payroll_expense_bonus', code: '6010', name: 'Staff Bonuses & Comm.', type: 'Expense', subtype: 'Salaries' },
    { id: 'payroll_expense_pension', code: '6020', name: 'Employer Pension Contribution', type: 'Expense', subtype: 'Salaries' },
  ];

  nodes.forEach(node => {
    const ref = doc(db, 'institutions', institutionId, 'coa', node.id);
    batch.set(ref, {
      ...node,
      balance: 0,
      isActive: true,
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  // Update Payroll Settings with default mappings
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'payroll');
  batch.set(setupRef, {
    netPayableAccountId: 'payroll_net_payable',
    payeAccountId: 'payroll_paye_liability',
    nssfAccountId: 'payroll_nssf_liability',
    nhifAccountId: 'payroll_nhif_liability',
    housingLevyAccountId: 'payroll_housing_levy',
    basicSalaryExpenseId: 'payroll_expense_basic',
    bonusExpenseId: 'payroll_expense_bonus',
    updatedAt: serverTimestamp()
  }, { merge: true });

  return batch.commit();
}

/**
 * Calculates Kenyan P.A.Y.E (Tax) based on standard 2024 graduated brackets.
 * Values in KES.
 */
export function calculatePAYE(taxableIncome: number): number {
  if (taxableIncome <= 24000) return 0;
  
  let tax = 0;
  let remaining = taxableIncome;

  // Bracket 1: 10% on first 24,000
  tax += 24000 * 0.10;
  remaining -= 24000;
  if (remaining <= 0) return tax;

  // Bracket 2: 25% on next 8,333
  const b2 = Math.min(remaining, 8333);
  tax += b2 * 0.25;
  remaining -= b2;
  if (remaining <= 0) return tax;

  // Bracket 3: 30% on next 467,667
  const b3 = Math.min(remaining, 467667);
  tax += b3 * 0.30;
  remaining -= b3;
  if (remaining <= 0) return tax;

  // Bracket 4: 32.5% on next 300,000
  const b4 = Math.min(remaining, 300000);
  tax += b4 * 0.325;
  remaining -= b4;
  if (remaining <= 0) return tax;

  // Bracket 5: 35% on anything above 800,000
  tax += remaining * 0.35;

  // Subtract Personal Relief (Standard 2,400)
  return Math.max(0, tax - 2400);
}

/**
 * Atomic calculation for NSSF Tier I and II (Employee + Employer).
 */
export function calculateNSSF(grossSalary: number): { employee: number; employer: number } {
  // 2024 Standards: 6% of Pensionable Pay
  const tierILimit = 7000;
  const tierIILimit = 36000;
  
  const totalLimit = Math.min(grossSalary, tierIILimit);
  const contribution = totalLimit * 0.06;
  
  return { employee: contribution, employer: contribution };
}

/**
 * Calculates SHIF/NHIF based on 2.75% of Gross (Standard 2024 reform).
 */
export function calculateNHIF(grossSalary: number): number {
  return grossSalary * 0.0275;
}

/**
 * Issues a loan repayment event.
 */
export async function processLoanRepayment(db: Firestore, institutionId: string, loanId: string, amount: number) {
  const ref = doc(db, 'institutions', institutionId, 'loans', loanId);
  return updateDoc(ref, {
    balance: increment(-amount),
    updatedAt: serverTimestamp()
  });
}
