'use client';

import { Firestore, collection, doc, serverTimestamp, getDoc, setDoc, query, where, getDocs, writeBatch, increment, addDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { getNextSequence } from '../sequence-service';
import { postJournalEntry } from '../accounting/journal.service';

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
      { min: 0, max: 2400, rate: 10 },
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
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const loan = snap.data();
    const newBalance = Math.max(0, (loan.balance || 0) - amount);
    const newStatus = newBalance <= 0 ? 'Cleared' : 'Active';
    
    transaction.update(ref, {
      balance: newBalance,
      status: newStatus,
      updatedAt: serverTimestamp()
    });
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

/**
 * Orchestration service to initialize a payroll cycle and generate its draft worksheet.
 */
export async function createPayrollRun(db: Firestore, institutionId: string, periodId: string, userId: string) {
  const runNumber = await getNextSequence(db, institutionId, 'payroll_run');
  const runRef = collection(db, 'institutions', institutionId, 'payroll_runs');
  
  // 1. Create the Master Run Record
  const newRun = await addDoc(runRef, {
    runNumber,
    periodId,
    status: 'Draft',
    totalGross: 0,
    totalNet: 0,
    totalDeductions: 0,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // 2. Fetch Active Employees
  const employeesSnap = await getDocs(query(
    collection(db, 'institutions', institutionId, 'employees'),
    where('status', '==', 'Active')
  ));

  // 3. Fetch Statutory Settings
  const setupSnap = await getDoc(doc(db, 'institutions', institutionId, 'settings', 'payroll'));
  const settings = setupSnap.data() as StatutorySettings;

  // 4. Populate Run Items (Draft Computation)
  const batch = writeBatch(db);
  const itemsRef = collection(db, 'institutions', institutionId, 'payroll_runs', newRun.id, 'items');

  for (const empDoc of employeesSnap.docs) {
    const emp = { id: empDoc.id, ...empDoc.data() } as any;
    
    // Fetch recurring components for this specific employee
    const [earningsSnap, deductionsSnap, loansSnap] = await Promise.all([
      getDocs(collection(db, 'institutions', institutionId, 'employees', emp.id, 'earnings')),
      getDocs(collection(db, 'institutions', institutionId, 'employees', emp.id, 'deductions')),
      getDocs(query(collection(db, 'institutions', institutionId, 'loans'), where('employeeId', '==', emp.id), where('status', '==', 'Active')))
    ]);

    const recurringEarnings = earningsSnap.docs.map(d => ({ type: { isTaxable: true, isPensionable: true } as any, amount: d.data().amount }));
    const recurringDeductions = deductionsSnap.docs.map(d => ({ type: { isStatutory: false } as any, amount: d.data().amount }));
    
    // Add loan repayments to custom deductions
    loansSnap.docs.forEach(d => {
      recurringDeductions.push({ type: { isStatutory: false } as any, amount: d.data().monthlyRecovery || 0 });
    });

    const computation = calculateNetSalary(emp.salary || 0, settings, recurringEarnings, recurringDeductions);

    batch.set(doc(itemsRef), {
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      basicPay: emp.salary || 0,
      ...computation,
      status: 'Computed',
      createdAt: serverTimestamp()
    });
  }

  await batch.commit();
  return { id: newRun.id, ...newRun };
}

/**
 * Orchestration service to finalize and post a payroll cycle.
 * Generates payslips and auto-posts to General Ledger.
 */
export async function finalizeAndPostPayroll(db: Firestore, institutionId: string, runId: string) {
  const runRef = doc(db, 'institutions', institutionId, 'payroll_runs', runId);
  const itemsRef = collection(db, 'institutions', institutionId, 'payroll_runs', runId, 'items');
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'payroll');
  
  return runTransaction(db, async (transaction) => {
    const [runSnap, setupSnap, itemsSnap] = await Promise.all([
      transaction.get(runRef),
      transaction.get(setupRef),
      getDocs(itemsRef)
    ]);

    if (!runSnap.exists()) throw new Error("Run not found");
    const run = runSnap.data();
    const setup = setupSnap.data();

    // 1. Accumulate Totals
    let totalGross = 0;
    let totalNet = 0;
    let totalPAYE = 0;
    let totalNSSF = 0;
    let totalSHA = 0;
    let totalHousing = 0;

    const payslipVault = collection(db, 'institutions', institutionId, 'payslips');

    for (const itemDoc of itemsSnap.docs) {
      const item = itemDoc.data();
      totalGross += item.gross;
      totalNet += item.netSalary;
      totalPAYE += item.paye;
      totalNSSF += item.nssf;
      totalSHA += item.sha;
      totalHousing += item.housingLevy;

      // 2. Generate Immutable Payslip
      const slipNumber = `PS-${Date.now()}-${item.employeeId.slice(0, 4)}`;
      transaction.set(doc(payslipVault), {
        ...item,
        slipNumber,
        periodName: run.periodId, // Using periodId as name for MVP
        runId: runId,
        institutionId,
        createdAt: serverTimestamp()
      });

      // 3. Process Loan Deductions
      const loansSnap = await getDocs(query(
        collection(db, 'institutions', institutionId, 'loans'), 
        where('employeeId', '==', item.employeeId), 
        where('status', '==', 'Active')
      ));
      
      loansSnap.docs.forEach(lDoc => {
        const loan = lDoc.data();
        const deduct = loan.monthlyRecovery || 0;
        const newBalance = Math.max(0, (loan.balance || 0) - deduct);
        transaction.update(lDoc.ref, {
          balance: newBalance,
          status: newBalance <= 0 ? 'Cleared' : 'Active',
          updatedAt: serverTimestamp()
        });
      });
    }

    // 4. Auto-Post to Ledger (Double Entry)
    if (setup?.autoPostToLedger) {
      await postJournalEntry(db, institutionId, {
        date: new Date(),
        description: `Payroll Run Finalization: ${run.runNumber}`,
        reference: run.runNumber,
        items: [
          // DR: Salaries Expense
          { accountId: setup.basicSalaryExpenseId, amount: totalGross, type: 'Debit' },
          // CR: Net Salaries Payable
          { accountId: setup.netPayableAccountId, amount: totalNet, type: 'Credit' },
          // CR: PAYE Liability
          { accountId: setup.payeAccountId, amount: totalPAYE, type: 'Credit' },
          // CR: NSSF/SHA/Housing
          { accountId: setup.statutoryLiabilityAccountId || setup.payeAccountId, amount: totalNSSF + totalSHA + totalHousing, type: 'Credit' },
        ]
      });
    }

    // 5. Update Master Run Record
    transaction.update(runRef, {
      status: 'Posted',
      totalGross,
      totalNet,
      totalDeductions: totalGross - totalNet,
      totalPAYE,
      totalNSSF,
      totalSHA,
      totalHousing,
      updatedAt: serverTimestamp()
    });
  });
}

/**
 * Final phase of the remuneration cycle: Physical disbursement of funds.
 * Clears the Salaries Payable liability and records the bank outflow.
 */
export async function settlePayrollRun(
  db: Firestore, 
  institutionId: string, 
  runId: string, 
  bankAccountId: string,
  userId: string
) {
  const runRef = doc(db, 'institutions', institutionId, 'payroll_runs', runId);
  const setupRef = doc(db, 'institutions', institutionId, 'settings', 'payroll');
  
  return runTransaction(db, async (transaction) => {
    const [runSnap, setupSnap] = await Promise.all([
      transaction.get(runRef),
      transaction.get(setupRef)
    ]);

    if (!runSnap.exists()) throw new Error("Run not found");
    const run = runSnap.data();
    const setup = setupSnap.data();

    if (run.status !== 'Posted') throw new Error("Only posted runs can be settled.");

    // Post to Ledger
    // DR: Salaries Payable (Liability -)
    // CR: Selected Bank Account (Asset -)
    await postJournalEntry(db, institutionId, {
      date: new Date(),
      description: `Payroll Settlement disbursement: ${run.runNumber}`,
      reference: `PAY-${run.runNumber}`,
      items: [
        { accountId: setup.netPayableAccountId, amount: run.totalNet, type: 'Debit' },
        { accountId: bankAccountId, amount: run.totalNet, type: 'Credit' },
      ]
    });

    transaction.update(runRef, {
      status: 'Settled',
      settledAt: serverTimestamp(),
      settledBy: userId,
      bankAccountId: bankAccountId,
      updatedAt: serverTimestamp()
    });
  });
}
