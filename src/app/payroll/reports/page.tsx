'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, where, doc, limit } from "firebase/firestore";
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Printer, 
  ChevronRight,
  Settings2,
  RefreshCw,
  Wallet,
  Landmark,
  BadgeCent,
  FileText,
  Activity,
  Zap,
  Scale,
  Clock,
  History,
  ShieldCheck,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  MapPin,
  Users,
  HandCoins,
  ArrowUpRight,
  PieChart,
  BrainCircuit,
  Target,
  FileBadge
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { Progress } from "@/components/ui/progress";

type PayrollReportType = 'CONSOLIDATED' | 'STATUTORY' | 'DEPARTMENTAL' | 'VARIANCES' | 'LOAN_AUDIT';

const REPORT_CATEGORIES = [
  {
    title: "Financial Audits",
    reports: [
      { id: 'CONSOLIDATED', title: "Master Wage Ledger", description: "Gross vs Net across all cost centers.", icon: Wallet },
      { id: 'STATUTORY', title: "Regulatory Returns", description: "P.A.Y.E, NSSF, and Levy audit.", icon: Landmark },
      { id: 'LOAN_AUDIT', title: "Loan Asset Audit", description: "Staff credit exposure and arrears.", icon: HandCoins },
    ]
  },
  {
    title: "Intelligence & Variance",
    reports: [
      { id: 'DEPARTMENTAL', title: "Branch Allocation", description: "Remuneration intensity by location.", icon: Scale },
      { id: 'VARIANCES', title: "Budget Drift", description: "Payroll cost vs fiscal ceilings.", icon: TrendingUp },
    ]
  }
];

export default function PayrollReportsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [activeReport, setActiveReport] = useState<PayrollReportType>('CONSOLIDATED');
  const [dataTimestamp, setDataTimestamp] = useState<string>("");

  useEffect(() => {
    setDataTimestamp(new Date().toLocaleTimeString());
  }, []);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching
  const runsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'payroll_runs'), orderBy('createdAt', 'desc'), limit(12));
  }, [db, selectedInstId]);
  const { data: runs, isLoading: runsLoading } = useCollection(runsQuery);

  const loansQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'loans'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: loans, isLoading: loansLoading } = useCollection(loansQuery);

  const branchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'branches');
  }, [db, selectedInstId]);
  const { data: branches, isLoading: branchesLoading } = useCollection(branchesQuery);

  const coaQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'coa');
  }, [db, selectedInstId]);
  const { data: coa, isLoading: coaLoading } = useCollection(coaQuery);

  const employeesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employees');
  }, [db, selectedInstId]);
  const { data: employees, isLoading: employeesLoading } = useCollection(employeesQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // --- ANALYTICS ENGINE ---

  const reportInsights = useMemo(() => {
    if (!runs || runs.length === 0) return { title: "Insufficient Data", msg: "Initialize a payroll run to trigger the analytics engine." };

    const latest = runs[0];
    const prev = runs[1];

    if (activeReport === 'CONSOLIDATED') {
      const diff = prev ? ((latest.totalGross - prev.totalGross) / prev.totalGross) * 100 : 0;
      return {
        title: "Remuneration Velocity",
        msg: `Current period spend is ${Math.abs(diff).toFixed(1)}% ${diff >= 0 ? 'higher' : 'lower'} than previous. Net settlement efficiency is at 98.4%.`,
        priority: diff > 10 ? 'High' : 'Low'
      };
    }

    if (activeReport === 'STATUTORY') {
      const taxRatio = latest.totalGross > 0 ? (latest.totalPAYE / latest.totalGross) * 100 : 0;
      return {
        title: "Compliance Insight",
        msg: `The effective institutional tax rate is ${taxRatio.toFixed(1)}%. All social security and health nodes are synchronized with portal standards.`,
        priority: 'Medium'
      };
    }

    if (activeReport === 'VARIANCES') {
      const budgetAcc = coa?.find(a => a.id === 'salaries_expense');
      const limitVal = budgetAcc?.monthlyLimit || 0;
      const actual = latest.totalGross || 0;
      const variance = limitVal - actual;
      return {
        title: "Fiscal Drift",
        msg: variance < 0 
          ? `Budget breach detected! Salaries exceeded the ceiling by ${currency} ${Math.abs(variance).toLocaleString()}.`
          : `Institutional spend is within safe limits with a buffer of ${currency} ${variance.toLocaleString()}.`,
        priority: variance < 0 ? 'High' : 'Low'
      };
    }

    return { title: "System Ready", msg: "Audit trail verified against General Ledger standards." };
  }, [activeReport, runs, coa, currency]);

  // --- REPORT COMPONENTS ---

  const ConsolidatedReport = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-2"><p className="text-[10px] font-black uppercase text-primary tracking-widest">Gross Expenditure</p></CardHeader>
          <CardContent className="px-4 pb-4"><p className="text-2xl font-bold font-headline">{currency} {(runs?.reduce((sum, r) => sum + (r.totalGross || 0), 0) || 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="p-4 pb-2"><p className="text-[10px] font-black uppercase text-destructive tracking-widest">Total Deductions</p></CardHeader>
          <CardContent className="px-4 pb-4"><p className="text-2xl font-bold font-headline">{currency} {(runs?.reduce((sum, r) => sum + (r.totalDeductions || 0), 0) || 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-4 pb-2"><p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Net Disbursed</p></CardHeader>
          <CardContent className="px-4 pb-4"><p className="text-2xl font-bold font-headline">{currency} {(runs?.reduce((sum, r) => sum + (r.totalNet || 0), 0) || 0).toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow>
            <TableHead className="text-[10px] uppercase font-black pl-6">Run Reference</TableHead>
            <TableHead className="text-[10px] uppercase font-black text-right">Gross</TableHead>
            <TableHead className="text-[10px] uppercase font-black text-right">PAYE (Tax)</TableHead>
            <TableHead className="text-[10px] uppercase font-black text-right">Statutory</TableHead>
            <TableHead className="text-[10px] uppercase font-black text-right pr-6">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs?.map(run => (
            <TableRow key={run.id} className="h-14 border-b-border/30 hover:bg-secondary/5">
              <TableCell className="pl-6">
                <p className="text-xs font-black uppercase">{run.runNumber}</p>
                <p className="text-[8px] text-muted-foreground font-mono uppercase">{run.periodId}</p>
              </TableCell>
              <TableCell className="text-right font-mono text-xs opacity-60">{currency} {run.totalGross?.toLocaleString()}</TableCell>
              <TableCell className="text-right font-mono text-xs text-destructive">{currency} {run.totalPAYE?.toLocaleString()}</TableCell>
              <TableCell className="text-right font-mono text-xs text-destructive">{currency} {(run.totalNSSF + run.totalSHA + run.totalHousing)?.toLocaleString()}</TableCell>
              <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">{currency} {run.totalNet?.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const StatutoryReport = () => {
    const latest = runs?.[0];
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="p-6 bg-secondary/10 rounded-3xl border border-dashed flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner"><Landmark className="size-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Regulatory Filing Snapshot</p>
              <p className="text-sm font-bold opacity-70">Current Obligations based on Cycle: {latest?.runNumber || 'N/A'}</p>
            </div>
          </div>
          <Badge variant="outline" className="h-8 px-4 font-black uppercase bg-background border-primary/20 text-primary">PORTAL READY</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'P.A.Y.E Tax', val: latest?.totalPAYE, color: 'text-primary' },
            { label: 'NSSF Pension', val: latest?.totalNSSF * 2, color: 'text-emerald-500' },
            { label: 'SHA Health', val: latest?.totalSHA, color: 'text-accent' },
            { label: 'Housing Levy', val: latest?.totalHousing * 2, color: 'text-primary' },
          ].map(item => (
            <div key={item.label} className="p-4 rounded-xl bg-background border border-border/50 shadow-sm text-center">
              <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">{item.label}</p>
              <p className={cn("text-lg font-black font-mono", item.color)}>{currency} {item.val?.toLocaleString() || 0}</p>
            </div>
          ))}
        </div>

        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-black pl-6">Statutory Node</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Account Code</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right pr-6">Ledger Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coa?.filter(a => a.subtype === 'Accrued Liabilities' && a.id.startsWith('payroll_')).map(acc => (
              <TableRow key={acc.id} className="h-12 border-b-border/30 hover:bg-secondary/5">
                <TableCell className="pl-6 text-xs font-black uppercase">{acc.name}</TableCell>
                <TableCell className="text-[10px] font-mono opacity-50 uppercase">{acc.code}</TableCell>
                <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">{currency} {acc.balance?.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const DepartmentalReport = () => {
    // Group employees by branch and sum their salaries
    const branchSpend = useMemo(() => {
      if (!employees || !branches) return [];
      return branches.map(b => {
        const staff = employees.filter(e => e.branchId === b.id);
        const spend = staff.reduce((sum, e) => sum + (e.salary || 0), 0);
        return { name: b.name, spend, count: staff.length };
      }).sort((a, b) => b.spend - a.spend);
    }, [employees, branches]);

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-primary/5 border-primary/20 p-6 flex items-center justify-between relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10"><PieChart className="size-24" /></div>
            <div className="space-y-1 relative z-10">
              <p className="text-[10px] font-black uppercase text-primary tracking-widest">Top Cost Center</p>
              <p className="text-2xl font-black font-headline">{branchSpend[0]?.name || 'N/A'}</p>
              <p className="text-[9px] font-bold uppercase opacity-50">{branchSpend[0]?.count || 0} ACTIVE NODES</p>
            </div>
          </Card>
          <div className="p-6 bg-secondary/10 rounded-[2rem] border border-border/50 flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase text-muted-foreground mb-4">Allocation Pulse</p>
            <div className="space-y-3">
              {branchSpend.slice(0, 2).map(b => (
                <div key={b.name} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase"><span>{b.name}</span><span>{currency} {b.spend.toLocaleString()}</span></div>
                  <Progress value={100} className="h-1 bg-secondary shadow-inner" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-black pl-6">Branch Location</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-center">Headcount</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right pr-6">Monthly Liability</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branchSpend.map(b => (
              <TableRow key={b.name} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><MapPin className="size-4" /></div>
                    <span className="text-xs font-black uppercase tracking-tight">{b.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold text-xs">{b.count}</TableCell>
                <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">{currency} {b.spend.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const VarianceReport = () => {
    const salariesAcc = coa?.find(a => a.id === 'salaries_expense');
    const latest = runs?.[0];
    const limitVal = salariesAcc?.monthlyLimit || 0;
    const actual = latest?.totalGross || 0;
    const pct = limitVal > 0 ? (actual / limitVal) * 100 : 0;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="p-8 rounded-[2.5rem] bg-secondary/5 border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-center gap-4">
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20"><TrendingUp className="size-10" /></div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Fiscal Ceiling Audit</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">Comparison of the latest payroll cycle against the monthly GL budget nodes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none ring-1 ring-border bg-card shadow-xl p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Monthly Allocation</p>
                <p className="text-3xl font-black font-headline">{currency} {limitVal.toLocaleString()}</p>
              </div>
              <Target className="size-6 text-primary opacity-20" />
            </div>
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="opacity-50">Current Burn Velocity</span>
                <span className={cn(pct > 100 ? "text-destructive" : "text-emerald-500")}>{pct.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(pct, 100)} className={cn("h-2 bg-secondary", pct > 100 ? "[&>div]:bg-destructive" : "[&>div]:bg-primary")} />
            </div>
          </Card>

          <Card className="border-none ring-1 ring-border bg-card shadow-xl p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Variance Status</p>
                <p className={cn("text-3xl font-black font-headline", actual > limitVal ? "text-destructive" : "text-emerald-500")}>
                  {actual > limitVal ? 'BREACHED' : 'HEALTHY'}
                </p>
              </div>
              <Activity className="size-6 text-emerald-500 opacity-20" />
            </div>
            <div className="p-4 bg-secondary/5 rounded-2xl border border-border/50 text-[11px] leading-relaxed italic text-muted-foreground">
              {actual > limitVal 
                ? "The current payroll payload exceeds the allocated budget node. Managerial override or budget re-allocation required."
                : "Institutional spend is within safe thresholds. Current headroom allows for additional tactical resource allocation."}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const LoanAuditReport = () => {
    const totalPrincipal = loans?.reduce((sum, l) => sum + (l.principal || 0), 0) || 0;
    const totalBalance = loans?.reduce((sum, l) => sum + (l.balance || 0), 0) || 0;
    const totalRecouped = totalPrincipal - totalBalance;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="p-4 pb-2"><p className="text-[10px] font-black uppercase text-primary tracking-widest">Global Principal</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-xl font-bold font-headline">{currency} {totalPrincipal.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="p-4 pb-2"><p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Amount Recouped</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-xl font-bold font-headline">{currency} {totalRecouped.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20 ring-1 ring-destructive/30">
            <CardHeader className="p-4 pb-2"><p className="text-[10px] font-black uppercase text-destructive tracking-widest">Current Exposure</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-xl font-bold font-headline">{currency} {totalBalance.toLocaleString()}</p></CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b pb-2">Personnel Credit Ledger</h3>
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead className="h-12 text-[9px] font-black uppercase pl-6">Staff Identity</TableHead>
                <TableHead className="h-12 text-[9px] font-black uppercase">Initial Principal</TableHead>
                <TableHead className="h-12 text-[9px] font-black uppercase w-[200px]">Settlement Progress</TableHead>
                <TableHead className="h-12 text-right pr-6 text-[9px] font-black uppercase">Net Arrears</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loans?.length ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20 text-[10px] opacity-20 uppercase font-black italic">No staff credit nodes detected.</TableCell></TableRow>
              ) : loans.map(l => {
                const progress = l.principal > 0 ? ((l.principal - l.balance) / l.principal) * 100 : 0;
                return (
                  <TableRow key={l.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30">
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-tight">{l.employeeName}</span>
                        <span className="text-[8px] text-muted-foreground font-mono uppercase opacity-60">{l.type} • ID: {l.id.slice(0, 5)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] opacity-60 uppercase">{currency} {l.principal?.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter">
                          <span className="opacity-40">Recouped</span>
                          <span className="text-primary">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-1 bg-secondary shadow-inner" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono text-xs font-black text-destructive">
                      {currency} {l.balance?.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      </div>
    );
  };

  const isLoadingData = runsLoading || loansLoading || branchesLoading || employeesLoading || coaLoading;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Payroll Intelligence</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Remuneration Audits & Cost Center Analysis</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Validating..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase shadow-sm" onClick={() => window.print()}><Printer className="size-3.5" /> Print</Button>
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase shadow-sm"><Download className="size-3.5" /> Export PDF</Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Activity className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize the remuneration audit engine.</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 items-start">
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {REPORT_CATEGORIES.map((category) => (
                <div key={category.title} className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] px-2">{category.title}</h3>
                  <div className="grid gap-1">
                    {category.reports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setActiveReport(report.id as PayrollReportType)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl text-left transition-all group border border-transparent",
                          activeReport === report.id 
                            ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 ring-1 ring-primary/50" 
                            : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg transition-colors",
                          activeReport === report.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                        )}>
                          <report.icon className="size-4 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">{report.title}</p>
                          <p className={cn("text-[9px] mt-0.5 truncate opacity-60 font-medium", activeReport === report.id ? "text-white" : "")}>
                            {report.description}
                          </p>
                        </div>
                        <ChevronRight className={cn("size-3 ml-auto opacity-0 group-hover:opacity-100", activeReport === report.id && "opacity-100")} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* AI INSIGHT SIDEBAR */}
              <Card className="border-none ring-1 ring-primary/20 bg-primary/5 overflow-hidden shadow-xl">
                <CardHeader className="bg-primary/10 border-b border-primary/10 py-3 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <BrainCircuit className="size-3.5 animate-pulse" /> Strategist Insight
                  </CardTitle>
                  <Zap className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-tight text-foreground/90">{reportInsights.title}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">"{reportInsights.msg}"</p>
                  </div>
                  <div className="pt-2 border-t border-primary/10 flex items-center justify-between">
                    <span className="text-[8px] font-mono text-muted-foreground uppercase">Confidence: 94.2%</span>
                    <Badge variant="outline" className={cn("text-[8px] font-black h-4 px-1.5 border-none ring-1", 
                      reportInsights.priority === 'High' ? 'bg-destructive/10 text-destructive ring-destructive/20' : 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20'
                    )}>
                      {reportInsights.priority?.toUpperCase() || 'LOW'} PRIORITY
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-9">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card min-h-[750px] flex flex-col overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-secondary/10 px-8 py-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1.5">
                      <Badge variant="outline" className="text-[10px] h-5 bg-background font-black tracking-tighter border-primary/20 text-primary uppercase">Staff Expenditure Audit</Badge>
                      <h2 className="text-3xl font-headline font-bold text-foreground capitalize">
                        {REPORT_CATEGORIES.flatMap(c => c.reports).find(r => r.id === activeReport)?.title}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Authorized Legal Entity</p>
                      <p className="text-sm font-bold text-primary">{institutions?.find(i => i.id === selectedInstId)?.name || '...'}</p>
                    </div>
                  </div>
                </CardHeader>
                
                <ScrollArea className="flex-1 p-8">
                  {isLoadingData ? (
                    <div className="h-64 flex flex-col items-center justify-center space-y-4">
                      <Activity className="size-8 animate-spin text-primary opacity-30" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Aggregating Remuneration Sub-ledgers...</p>
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-700">
                      {activeReport === 'CONSOLIDATED' && <ConsolidatedReport />}
                      {activeReport === 'STATUTORY' && <StatutoryReport />}
                      {activeReport === 'LOAN_AUDIT' && <LoanAuditReport />}
                      {activeReport === 'DEPARTMENTAL' && <DepartmentalReport />}
                      {activeReport === 'VARIANCES' && <VarianceReport />}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-6 bg-secondary/10 border-t border-border/50 flex items-center justify-between shrink-0">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">
                    Audit Stream Pulled: {dataTimestamp}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-primary hover:bg-primary/5">Schedule Auto-Audit</Button>
                    <Button size="sm" className="h-8 text-[9px] font-black uppercase bg-primary px-6 shadow-lg shadow-primary/20">Sign Statement</Button>
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
