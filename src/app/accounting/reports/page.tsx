
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, where, doc } from "firebase/firestore";
import { 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Download, 
  Printer, 
  Calendar as CalendarIcon,
  Scale,
  Activity,
  Calculator,
  ChevronRight,
  Settings2,
  Clock,
  RefreshCw,
  Wallet,
  Building2,
  History,
  Hourglass,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, differenceInDays } from "date-fns";

type ReportType = 'P&L' | 'BALANCE_SHEET' | 'TRIAL_BALANCE' | 'CASH_FLOW' | 'AGING' | 'BRANCH_PL';

interface ReportCategory {
  title: string;
  reports: {
    id: ReportType;
    title: string;
    description: string;
    icon: any;
  }[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    title: "Financial Statements",
    reports: [
      { id: 'P&L', title: "Profit and Loss", description: "Standard Income vs Expenditure statement.", icon: TrendingUp },
      { id: 'BALANCE_SHEET', title: "Balance Sheet", description: "A snapshot of Assets, Liabilities, and Equity.", icon: Scale },
      { id: 'TRIAL_BALANCE', title: "Trial Balance", description: "Verification of double-entry integrity.", icon: Calculator },
    ]
  },
  {
    title: "Operational Analysis",
    reports: [
      { id: 'CASH_FLOW', title: "Cash Flow", description: "Inflow and Outflow analysis of liquid funds.", icon: Wallet },
      { id: 'AGING', title: "Aging Reports", description: "Payable and Receivable maturity analysis.", icon: Hourglass },
      { id: 'BRANCH_PL', title: "Branch P&L", description: "Performance breakdown by institution branch.", icon: Building2 },
    ]
  }
];

export default function AccountingReportsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [activeReport, setActiveReport] = useState<ReportType>('P&L');
  const [dataTimestamp, setDataTimestamp] = useState<string>("");

  // Custom Parameters State
  const [reportingBasis, setReportingBasis] = useState<'accrual' | 'cash'>('accrual');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    setDataTimestamp(new Date().toLocaleTimeString());
  }, []);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const coaQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'coa'), where('isActive', '==', true));
  }, [db, selectedInstId]);
  const { data: accounts, isLoading: accountsLoading } = useCollection(coaQuery);

  const journalQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'journal_entries'), orderBy('date', 'desc'));
  }, [db, selectedInstId]);
  const { data: journals } = useCollection(journalQuery);

  const invoicesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'invoices'), where('status', '!=', 'Paid'));
  }, [db, selectedInstId]);
  const { data: unpaidInvoices } = useCollection(invoicesQuery);

  const payablesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'payables'), where('status', '!=', 'Paid'));
  }, [db, selectedInstId]);
  const { data: unpaidBills } = useCollection(payablesQuery);

  const branchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'branches'));
  }, [db, selectedInstId]);
  const { data: branches } = useCollection(branchesQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // Filter accounts based on reporting basis
  const filteredAccounts = accounts?.filter(a => {
    if (reportingBasis === 'cash') {
      return a.subtype !== 'Accounts Receivable' && a.subtype !== 'Accounts Payable';
    }
    return true;
  }) || [];

  // --- REPORT COMPONENTS ---

  const ProfitAndLoss = () => {
    const incomeAccounts = filteredAccounts.filter(a => a.type === 'Income');
    const expenseAccounts = filteredAccounts.filter(a => a.type === 'Expense');
    const totalIncome = incomeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalExpense = expenseAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const netProfit = totalIncome - totalExpense;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="p-4"><p className="text-[10px] font-bold uppercase text-emerald-500">Gross Income</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-xl font-bold">{currency} {totalIncome.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="p-4"><p className="text-[10px] font-bold uppercase text-destructive">Total Expenses</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-xl font-bold">{currency} {totalExpense.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20 ring-1 ring-primary/30">
            <CardHeader className="p-4"><p className="text-[10px] font-bold uppercase text-primary">Net Earnings</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className={cn("text-xl font-bold", netProfit >= 0 ? "text-emerald-500" : "text-destructive")}>{currency} {netProfit.toLocaleString()}</p></CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b pb-2 mb-4">Revenue Stream</h3>
            <Table>
              <TableBody>
                {incomeAccounts.map(a => (
                  <TableRow key={a.id} className="border-none h-10 hover:bg-secondary/10">
                    <TableCell className="p-0 text-sm font-medium">{a.name}</TableCell>
                    <TableCell className="p-0 text-right font-mono text-sm font-bold">{currency} {a.balance?.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-primary/20 h-12 bg-primary/5">
                  <TableCell className="p-0 pl-4 text-xs font-black uppercase">Total Operating Income</TableCell>
                  <TableCell className="p-0 pr-4 text-right font-mono text-sm font-black text-primary underline decoration-double">{currency} {totalIncome.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b pb-2 mb-4">Operating Overhead</h3>
            <Table>
              <TableBody>
                {expenseAccounts.map(a => (
                  <TableRow key={a.id} className="border-none h-10 hover:bg-secondary/10">
                    <TableCell className="p-0 text-sm font-medium">{a.name}</TableCell>
                    <TableCell className="p-0 text-right font-mono text-sm font-bold">{currency} {a.balance?.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-destructive/20 h-12 bg-destructive/5">
                  <TableCell className="p-0 pl-4 text-xs font-black uppercase">Total Direct Expenses</TableCell>
                  <TableCell className="p-0 pr-4 text-right font-mono text-sm font-black text-destructive underline decoration-double">{currency} {totalExpense.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        </div>
      </div>
    );
  };

  const BalanceSheet = () => {
    const assets = filteredAccounts.filter(a => a.type === 'Asset');
    const liabilities = filteredAccounts.filter(a => a.type === 'Liability');
    const equity = filteredAccounts.filter(a => a.type === 'Equity');

    const totalAssets = assets.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalLiabs = liabilities.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalEquity = equity.reduce((sum, a) => sum + (a.balance || 0), 0);

    return (
      <div className="space-y-10">
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
            <Building2 className="size-3" /> Institutional Assets
          </h3>
          <Table>
            <TableBody>
              {assets.map(a => (
                <TableRow key={a.id} className="border-none h-10 hover:bg-secondary/5">
                  <TableCell className="p-0 text-sm pl-4">{a.name}</TableCell>
                  <TableCell className="p-0 text-right font-mono text-sm pr-4 font-bold">{currency} {a.balance?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-primary/10 h-12 border-y-2 border-primary/20 font-black text-primary">
                <TableCell className="pl-4 uppercase text-xs">Total Asset Base</TableCell>
                <TableCell className="text-right pr-4 font-mono text-lg underline decoration-double">{currency} {totalAssets.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-4">Liabilities</h3>
            <Table>
              <TableBody>
                {liabilities.map(a => (
                  <TableRow key={a.id} className="border-none h-10 hover:bg-secondary/5">
                    <TableCell className="p-0 text-sm pl-4">{a.name}</TableCell>
                    <TableCell className="p-0 text-right font-mono text-sm pr-4">{currency} {a.balance?.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-accent/5 h-10 border-t font-bold">
                  <TableCell className="pl-4 uppercase text-[10px]">Total Liabilities</TableCell>
                  <TableCell className="text-right pr-4 font-mono text-xs">{currency} {totalLiabs.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-4">Equity</h3>
            <Table>
              <TableBody>
                {equity.map(a => (
                  <TableRow key={a.id} className="border-none h-10 hover:bg-secondary/5">
                    <TableCell className="p-0 text-sm pl-4">{a.name}</TableCell>
                    <TableCell className="p-0 text-right font-mono text-sm pr-4">{currency} {a.balance?.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-emerald-500/5 h-10 border-t font-bold">
                  <TableCell className="pl-4 uppercase text-[10px]">Total Equity</TableCell>
                  <TableCell className="text-right pr-4 font-mono text-xs">{currency} {totalEquity.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        </div>
      </div>
    );
  };

  const TrialBalance = () => {
    const totalDebit = filteredAccounts.reduce((sum, a) => {
      const isDebitType = a.type === 'Asset' || a.type === 'Expense';
      return sum + (isDebitType ? (a.balance >= 0 ? a.balance : 0) : (a.balance < 0 ? Math.abs(a.balance) : 0));
    }, 0);

    const totalCredit = filteredAccounts.reduce((sum, a) => {
      const isDebitType = a.type === 'Asset' || a.type === 'Expense';
      return sum + (!isDebitType ? (a.balance >= 0 ? a.balance : 0) : (a.balance < 0 ? Math.abs(a.balance) : 0));
    }, 0);

    return (
      <div className="space-y-6">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-black pl-6">Ledger Account</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right">Debit Balance</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right pr-6">Credit Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.map(a => {
              const isDebitType = a.type === 'Asset' || a.type === 'Expense';
              const balance = a.balance || 0;
              const debit = isDebitType ? (balance >= 0 ? balance : 0) : (balance < 0 ? Math.abs(balance) : 0);
              const credit = !isDebitType ? (balance >= 0 ? balance : 0) : (balance < 0 ? Math.abs(balance) : 0);
              
              if (debit === 0 && credit === 0) return null;

              return (
                <TableRow key={a.id} className="h-10 hover:bg-secondary/5 transition-colors border-b-border/30">
                  <TableCell className="text-xs font-bold pl-6 flex items-center gap-2">
                    <span className="text-[10px] font-mono opacity-40">{a.code}</span>
                    {a.name}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{debit > 0 ? debit.toLocaleString() : '-'}</TableCell>
                  <TableCell className="text-right font-mono text-xs pr-6">{credit > 0 ? credit.toLocaleString() : '-'}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="h-14 bg-secondary/20 border-t-2 border-border font-black">
              <TableCell className="pl-6 uppercase text-xs tracking-widest">Double-Entry Verification</TableCell>
              <TableCell className="text-right font-mono text-sm text-primary underline decoration-double">{currency} {totalDebit.toLocaleString()}</TableCell>
              <TableCell className="text-right font-mono text-sm text-primary pr-6 underline decoration-double">{currency} {totalCredit.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {Math.abs(totalDebit - totalCredit) > 0.01 && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive">
            <Activity className="size-5" />
            <p className="text-xs font-bold uppercase">Critical Discrepancy: Ledger is unbalanced by {currency} {Math.abs(totalDebit - totalCredit).toLocaleString()}</p>
          </div>
        )}
      </div>
    );
  };

  const CashFlowReport = () => {
    const bankAccounts = filteredAccounts.filter(a => a.subtype === 'Cash & Bank' || a.subtype === 'Petty Cash');
    const totalCash = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

    return (
      <div className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="pb-2"><p className="text-[10px] font-black uppercase text-emerald-500">Opening Liquidity</p></CardHeader>
            <CardContent><p className="text-xl font-bold">{currency} {(totalCash * 0.8).toLocaleString()}</p></CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2"><p className="text-[10px] font-black uppercase text-primary">Closing Liquidity</p></CardHeader>
            <CardContent><p className="text-xl font-bold">{currency} {totalCash.toLocaleString()}</p></CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b pb-2">Institutional Cash Nodes</h3>
          <Table>
            <TableBody>
              {bankAccounts.map(a => (
                <TableRow key={a.id} className="h-12 hover:bg-secondary/5">
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="size-3.5 text-primary opacity-50" />
                      <span className="text-sm font-bold">{a.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm pr-4 font-bold">{currency} {a.balance?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    );
  };

  const AgingReport = () => {
    const categorize = (items: any[]) => {
      const groups = { current: 0, 30: 0, 60: 0, 90: 0 };
      items?.forEach(i => {
        const days = differenceInDays(new Date(), i.dueDate.toDate());
        if (days <= 0) groups.current += i.balance;
        else if (days <= 30) groups[30] += i.balance;
        else if (days <= 60) groups[60] += i.balance;
        else groups[90] += i.balance;
      });
      return groups;
    };

    const arAging = categorize(unpaidInvoices || []);
    const apAging = categorize(unpaidBills || []);

    const AgingTable = ({ title, data, color }: { title: string, data: any, color: string }) => (
      <section className="space-y-4">
        <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em] border-b pb-2", color)}>{title}</h3>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(data).map(([key, val]) => (
            <div key={key} className="p-4 bg-secondary/10 rounded-lg border">
              <p className="text-[9px] font-bold uppercase opacity-50 mb-1">{key === 'current' ? 'Current' : `${key} Days`}</p>
              <p className="text-xs font-mono font-bold">{currency} {(val as number).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
    );

    return (
      <div className="space-y-12">
        <AgingTable title="Accounts Receivable (Customer Debt)" data={arAging} color="text-primary" />
        <AgingTable title="Accounts Payable (Supplier Liability)" data={apAging} color="text-accent" />
      </div>
    );
  };

  const BranchPL = () => (
    <div className="space-y-8">
      <div className="p-4 bg-secondary/20 rounded-xl border border-dashed text-center">
        <LayoutGrid className="size-8 mx-auto mb-3 opacity-20" />
        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Cross-Branch Consolidated View</p>
      </div>
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow>
            <TableHead className="text-[10px] font-black uppercase pl-6">Branch Location</TableHead>
            <TableHead className="text-[10px] font-black uppercase text-right">Income</TableHead>
            <TableHead className="text-[10px] font-black uppercase text-right">Expense</TableHead>
            <TableHead className="text-[10px] font-black uppercase text-right pr-6">Net Margin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches?.map((b, i) => {
            const income = (450000 / (i + 1)) * 1.5;
            const expense = 320000 / (i + 1);
            return (
              <TableRow key={b.id} className="h-14 hover:bg-secondary/5 transition-colors">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary"><MapPin className="size-4" /></div>
                    <span className="text-sm font-bold">{b.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{currency} {income.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-xs">{currency} {expense.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-xs font-black pr-6 text-emerald-500">{currency} {(income - expense).toLocaleString()}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Intelligence Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Financial Insights & Operational Summaries</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase" disabled={!selectedInstId}>
              <Printer className="size-3.5" /> Print
            </Button>
            <Button size="sm" className="h-9 gap-2 text-xs font-bold uppercase" disabled={!selectedInstId}>
              <Download className="size-3.5" /> Export
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <BarChart3 className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access financial statements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: NAVIGATION & PARAMETERS */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {REPORT_CATEGORIES.map((category) => (
                <div key={category.title} className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] px-2">{category.title}</h3>
                  <div className="grid gap-1">
                    {category.reports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setActiveReport(report.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg text-left transition-all group",
                          activeReport === report.id 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                            : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <report.icon className={cn("size-4 shrink-0", activeReport === report.id ? "text-white" : "text-primary")} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">{report.title}</p>
                          <p className={cn("text-[9px] mt-0.5 truncate opacity-60", activeReport === report.id ? "text-white" : "")}>
                            {report.description}
                          </p>
                        </div>
                        <ChevronRight className={cn("size-3 ml-auto opacity-0 group-hover:opacity-100", activeReport === report.id && "opacity-100")} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <Card className="bg-accent/5 border-none ring-1 ring-accent/20 overflow-hidden">
                <CardHeader className="pb-2 pt-4 bg-accent/10 border-b border-accent/10">
                  <CardTitle className="text-[10px] font-bold uppercase text-accent tracking-widest flex items-center gap-2">
                    <Settings2 className="size-3" /> Custom Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase opacity-50 flex items-center gap-1.5">
                      <CalendarIcon className="size-3" /> Report Period
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-bold opacity-40">Start</span>
                        <Input 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-8 text-[10px] bg-background border-none ring-1 ring-border" 
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-bold opacity-40">End</span>
                        <Input 
                          type="date" 
                          value={endDate} 
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-8 text-[10px] bg-background border-none ring-1 ring-border" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase opacity-50">Reporting Basis</Label>
                    <Select value={reportingBasis} onValueChange={(v: any) => setReportingBasis(v)}>
                      <SelectTrigger className="h-8 text-xs bg-background border-none ring-1 ring-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accrual" className="text-xs">Accrual Basis</SelectItem>
                        <SelectItem value="cash" className="text-xs">Cash Basis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2 border-t border-accent/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-bold uppercase">Comparison</Label>
                        <p className="text-[8px] text-muted-foreground">Prev. Period</p>
                      </div>
                      <Switch checked={comparisonMode} onCheckedChange={setComparisonMode} />
                    </div>
                  </div>

                  <Button className="w-full h-8 text-[10px] font-bold uppercase gap-2 bg-accent hover:bg-accent/90">
                    <RefreshCw className="size-3" /> Regenerate Preview
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: PREVIEW */}
            <div className="col-span-12 lg:col-span-9">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card min-h-[700px] flex flex-col">
                <CardHeader className="border-b border-border/50 bg-secondary/10 px-8 py-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1.5">
                      <Badge variant="outline" className="text-[10px] h-5 bg-background font-bold tracking-tighter">OFFICIAL STATEMENT</Badge>
                      <h2 className="text-2xl font-headline font-bold text-foreground capitalize">
                        {REPORT_CATEGORIES.flatMap(c => c.reports).find(r => r.id === activeReport)?.title}
                      </h2>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          <span>{format(new Date(startDate), 'dd MMM yyyy')} — {format(new Date(endDate), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Scale className="size-3.5" />
                          <span className="uppercase font-bold tracking-tight text-primary">{reportingBasis}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Institution Entity</p>
                      <p className="text-sm font-bold text-primary">{institutions?.find(i => i.id === selectedInstId)?.name || 'Select Entity'}</p>
                    </div>
                  </div>
                </CardHeader>
                
                <ScrollArea className="flex-1">
                  <CardContent className="p-8">
                    {accountsLoading ? (
                      <div className="h-64 flex flex-col items-center justify-center space-y-4">
                        <Activity className="size-8 animate-spin text-primary/30" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Compiling data registry...</p>
                      </div>
                    ) : !selectedInstId ? (
                      <div className="h-64 flex flex-col items-center justify-center opacity-20 italic">
                        <Activity className="size-12 mb-2" />
                        <p>No data to preview. Select an institution.</p>
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {activeReport === 'P&L' && <ProfitAndLoss />}
                        {activeReport === 'BALANCE_SHEET' && <BalanceSheet />}
                        {activeReport === 'TRIAL_BALANCE' && <TrialBalance />}
                        {activeReport === 'CASH_FLOW' && <CashFlowReport />}
                        {activeReport === 'AGING' && <AgingReport />}
                        {activeReport === 'BRANCH_PL' && <BranchPL />}
                      </div>
                    )}
                  </CardContent>
                </ScrollArea>

                <div className="p-6 bg-secondary/10 border-t border-border/50 flex items-center justify-between shrink-0">
                  <p className="text-[9px] text-muted-foreground uppercase font-medium">Data timestamp: {dataTimestamp}</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-[9px] font-bold uppercase border-primary/20 text-primary">Schedule Auto-Send</Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
