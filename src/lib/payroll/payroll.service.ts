'use client';

import { Firestore, collection, doc, serverTimestamp, getDoc, setDoc, query, where, getDocs, writeBatch, increment, addDoc, deleteDoc } from 'firebase/firestore';

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

export interface EmployeeComponent {
  id: string;
  typeId: string;
  name: string;
  amount: number;
}

export interface StatutorySettings {
  payeBands: { min: number; max: number; rate: number }[];
  personalRelief: number;
  nssfRate: number;
  nssfTierILimit: number;
  nssfTierIILimit: number;
  shaRate: number;
  housingLevyRate: number;
}

/**
 * Bootstraps the Payroll financial hub with standard Kenyan 2024 settings.
 */
export async function bootstrapPayrollFinancials(db: Firestore, institutionId: string) {
  const batch = writeBatch(db);
  
  const nodes = [
    { id: 'payroll_net_payable', code: '2300', name: 'Salaries & Wages Payable', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'payroll_paye_liability', code: '2310', name: 'P.A.Y.E Tax Liability', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'payroll_nssf_liability', code: '2320', name: 'NSSF Employee/Employer Contribution', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'payroll_sha_liability', code: '2330', name: 'S.H.A Health Fund Liability', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'payroll_housing_levy', code: '2340', name: 'Housing Levy Fund', type: 'Liability', subtype: 'Accrued Liabilities' },
    { id: 'payroll_expense_basic', code: '6000', name: 'Staff Basic Salaries', type: 'Expense', subtype: 'Salaries' },
    { id: 'payroll_expense_bonus', code: '6010', name: 'Staff Bonuses & Comm.', type: 'Expense', subtype: 'Salaries' },
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

  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'payroll');
  batch.set(setupRef, {
    netPayableAccountId: 'payroll_net_payable',
    payeAccountId: 'payroll_paye_liability',
    nssfAccountId: 'payroll_nssf_liability',
    shaAccountId: 'payroll_sha_liability',
    housingLevyAccountId: 'payroll_housing_levy',
    basicSalaryExpenseId: 'payroll_expense_basic',
    bonusExpenseId: 'payroll_expense_bonus',
    // Kenyan 2024 Statutory Standards
    personalRelief: 2400,
    shaRate: 2.75,
    housingLevyRate: 1.5,
    nssfRate: 6,
    nssfTierILimit: 7000,
    nssfTierIILimit: 36000,
    payeBands: [
      { min: 0, max: 24000, rate: 10 },
      { min: 24001, max: 32333, rate: 25 },
      { min: 32334, max: 500000, rate: 30 },
      { min: 500001, max: 800000, rate: 32.5 },
      { min: 800001, max: 999999999, rate: 35 },
    ],
    updatedAt: serverTimestamp()
  }, { merge: true });

  return batch.commit();
}

/**
 * Calculates full payroll breakdown based on institutional statutory settings.
 * Now factors in dynamic recurring earnings and deductions.
 */
export function calculateNetSalary(
  basicPay: number, 
  settings: StatutorySettings,
  recurringEarnings: { type: EarningType, amount: number }[] = [],
  recurringDeductions: { type: DeductionType, amount: number }[] = []
) {
  // 1. Split Earnings into Taxable and Non-Taxable
  const taxableEarnings = recurringEarnings.filter(e => e.type.isTaxable).reduce((sum, e) => sum + e.amount, 0);
  const nonTaxableEarnings = recurringEarnings.filter(e => !e.type.isTaxable).reduce((sum, e) => sum + e.amount, 0);
  
  const grossPay = basicPay + taxableEarnings + nonTaxableEarnings;
  const taxableGrossForNssf = basicPay + recurringEarnings.filter(e => e.type.isPensionable).reduce((sum, e) => sum + e.amount, 0);

  // 2. NSSF Calculation (Tax Deductible in Kenya)
  const pensionablePay = Math.min(taxableGrossForNssf, settings.nssfTierIILimit || 36000);
  const nssf = (pensionablePay * ((settings.nssfRate || 6) / 100));

  // 3. Housing Levy (Non-tax deductible, based on Gross)
  const housingLevy = (grossPay * ((settings.housingLevyRate || 1.5) / 100));

  // 4. SHA (Social Health Authority - replaces NHIF)
  const sha = (grossPay * ((settings.shaRate || 2.75) / 100));

  // 5. PAYE Calculation
  // Legal standard: Deduct NSSF from taxable gross to get taxable income
  const taxableIncome = (basicPay + taxableEarnings) - nssf; 
  let paye = 0;
  
  const bands = settings.payeBands || [
    { min: 0, max: 24000, rate: 10 },
    { min: 24001, max: 32333, rate: 25 },
    { min: 32334, max: 500000, rate: 30 },
    { min: 500001, max: 800000, rate: 32.5 },
    { min: 800001, max: 999999999, rate: 35 },
  ];

  bands.forEach(band => {
    if (taxableIncome > band.min) {
      const taxableInBand = Math.min(taxableIncome, band.max) - band.min;
      paye += (taxableInBand * (band.rate / 100));
    }
  });

  const netPaye = Math.max(0, paye - (settings.personalRelief || 2400));

  // 6. Non-Statutory Deductions
  const customDeductionsTotal = recurringDeductions.reduce((sum, d) => sum + d.amount, 0);

  // 7. Final Net
  const totalStatutoryDeductions = nssf + sha + housingLevy + netPaye;
  const netSalary = grossPay - totalStatutoryDeductions - customDeductionsTotal;

  return {
    gross: grossPay,
    nssf,
    sha,
    housingLevy,
    paye: netPaye,
    customDeductions: customDeductionsTotal,
    totalDeductions: totalStatutoryDeductions + customDeductionsTotal,
    netSalary
  };
}

export async function processLoanRepayment(db: Firestore, institutionId: string, loanId: string, amount: number) {
  const ref = doc(db, 'institutions', institutionId, 'loans', loanId);
  return updateDoc(ref, {
    balance: increment(-amount),
    updatedAt: serverTimestamp()
  });
}

/**
 * Assigns a recurring earning component to an employee.
 */
export async function assignEmployeeEarning(db: Firestore, institutionId: string, employeeId: string, earning: { typeId: string, name: string, amount: number }) {
  const colRef = collection(db, 'institutions', institutionId, 'employees', employeeId, 'earnings');
  return addDoc(colRef, {
    ...earning,
    createdAt: serverTimestamp()
  });
}

/**
 * Removes a recurring earning component from an employee.
 */
export async function removeEmployeeEarning(db: Firestore, institutionId: string, employeeId: string, assignmentId: string) {
  const ref = doc(db, 'institutions', institutionId, 'employees', employeeId, 'earnings', assignmentId);
  return deleteDoc(ref);
}

/**
 * Assigns a recurring deduction component to an employee.
 */
export async function assignEmployeeDeduction(db: Firestore, institutionId: string, employeeId: string, deduction: { typeId: string, name: string, amount: number }) {
  const colRef = collection(db, 'institutions', institutionId, 'employees', employeeId, 'deductions');
  return addDoc(colRef, {
    ...deduction,
    createdAt: serverTimestamp()
  });
}

/**
 * Removes a recurring deduction component from an employee.
 */
export async function removeEmployeeDeduction(db: Firestore, institutionId: string, employeeId: string, assignmentId: string) {
  const ref = doc(db, 'institutions', institutionId, 'employees', employeeId, 'deductions', assignmentId);
  return deleteDoc(ref);
}
