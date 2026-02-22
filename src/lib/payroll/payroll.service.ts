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
 */
export function calculateNetSalary(basicPay: number, settings: StatutorySettings) {
  // 1. NSSF Calculation (Tax Deductible in Kenya)
  const pensionablePay = Math.min(basicPay, settings.nssfTierIILimit || 36000);
  const nssf = (pensionablePay * ((settings.nssfRate || 6) / 100));

  // 2. Housing Levy (Non-tax deductible, based on Gross)
  const housingLevy = (basicPay * ((settings.housingLevyRate || 1.5) / 100));

  // 3. SHA (Social Health Authority - replaces NHIF)
  const sha = (basicPay * ((settings.shaRate || 2.75) / 100));

  // 4. PAYE Calculation
  // Legal standard: Deduct NSSF from gross to get taxable income
  const taxableIncome = basicPay - nssf; 
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

  // 5. Final Net
  const totalDeductions = nssf + sha + housingLevy + netPaye;
  const netSalary = basicPay - totalDeductions;

  return {
    gross: basicPay,
    nssf,
    sha,
    housingLevy,
    paye: netPaye,
    totalDeductions,
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
