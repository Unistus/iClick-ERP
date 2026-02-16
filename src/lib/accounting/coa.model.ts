
/**
 * @fileOverview Standard account types and subtypes for the iClick ERP.
 */

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export interface ChartOfAccount {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: string;
  balance: number;
  isActive: boolean;
  currencyId: string;
  isTrackedForBudget?: boolean;
  monthlyLimit?: number;
  updatedAt: any;
}

export const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

export const ACCOUNT_SUBTYPES: Record<AccountType, string[]> = {
  Asset: ['Cash & Bank', 'M-Pesa Clearing', 'Petty Cash', 'Accounts Receivable', 'Inventory', 'Fixed Assets', 'Current Assets'],
  Liability: ['Accounts Payable', 'VAT Payable', 'Loans', 'Accrued Liabilities'],
  Equity: ['Owner Capital', 'Retained Earnings', 'Opening Balance Equity'],
  Income: ['Sales Revenue', 'Service Income', 'Other Income'],
  Expense: ['COGS', 'Salaries', 'Rent', 'Utilities', 'Marketing', 'Taxes'],
};
