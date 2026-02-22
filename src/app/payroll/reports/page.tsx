
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
  AlertTriangle,
  Users,
  HandCoins,
  ArrowUpRight
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

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // --- REPORT COMPONENTS ---

  const LoanAuditReport = () => {
    const activeLoans = loans?.filter(l => l.status === 'Active') || [];
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
                const progress = ((l.principal - l.balance) / l.principal) * 100;
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

        <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start shadow-inner">
          <ShieldCheck className="size-6 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Audit Note</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
              "Loan exposure is tracked as a contra-liability. Recoupment occurs during the 'Posted' phase of the payroll cycle, ensuring staff net pay is computed correctly before settlement."
            </p>
          </div>
        </div>
      </div>
    );
  };

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
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase shadow-sm"><Download className="size-3.5" /> PDF</Button>
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
                  {runsLoading || loansLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center space-y-4">
                      <Activity className="size-8 animate-spin text-primary opacity-30" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Aggregating Remuneration Sub-ledgers...</p>
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-700">
                      {activeReport === 'CONSOLIDATED' && (
                        <Table>
                          <TableHeader className="bg-secondary/30">
                            <TableRow>
                              <TableHead className="text-[10px] uppercase font-black pl-6">Reference</TableHead>
                              <TableHead className="text-[10px] uppercase font-black text-right">Gross</TableHead>
                              <TableHead className="text-[10px] uppercase font-black text-right">Deductions</TableHead>
                              <TableHead className="text-[10px] uppercase font-black text-right pr-6">Net Settlement</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {runs?.map(run => (
                              <TableRow key={run.id} className="h-14 border-b-border/30 hover:bg-secondary/5">
                                <TableCell className="pl-6">
                                  <p className="text-xs font-black uppercase tracking-tight">{run.runNumber}</p>
                                  <p className="text-[9px] text-muted-foreground font-mono">{format(run.createdAt?.toDate ? run.createdAt.toDate() : new Date(), 'dd MMM yyyy')}</p>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs opacity-60">{currency} {run.totalGross?.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-destructive">{currency} {run.totalDeductions?.toLocaleString()}</TableCell>
                                <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">{currency} {run.totalNet?.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}

                      {activeReport === 'LOAN_AUDIT' && <LoanAuditReport />}

                      {['STATUTORY', 'DEPARTMENTAL', 'VARIANCES'].includes(activeReport) && (
                        <div className="h-96 flex flex-col items-center justify-center space-y-4 border-2 border-dashed rounded-3xl opacity-20 italic">
                          <Zap className="size-12" />
                          <p className="font-bold uppercase tracking-widest text-xs">Generating Advanced Insights...</p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-6 bg-secondary/10 border-t border-border/50 flex items-center justify-between shrink-0">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">
                    Audit Stream Pulled: {dataTimestamp}
                  </p>
                  <Button size="sm" className="h-8 text-[9px] font-black uppercase bg-primary px-6 shadow-lg shadow-primary/20">Sign Statement</Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
