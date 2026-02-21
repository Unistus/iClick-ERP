'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, where, doc, limit } from "firebase/firestore";
import { 
  HandCoins, 
  Plus, 
  Search, 
  History, 
  Calculator, 
  Scale, 
  ArrowUpRight, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Wallet,
  Landmark,
  BadgeCent,
  ShieldCheck,
  Zap,
  Activity,
  FileText,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Info,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createPayrollRun } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function PayrollCommandPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Runs
  const runsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'payroll_runs'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: runs, isLoading: runsLoading } = useCollection(runsQuery);

  // Data Fetching: Fiscal Periods
  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), where('status', '==', 'Open'));
  }, [db, selectedInstId]);
  const { data: activePeriods } = useCollection(periodsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const stats = useMemo(() => {
    if (!runs) return { gross: 0, count: 0, lastRun: "N/A" };
    const latest = runs[0];
    return {
      gross: runs.reduce((sum, r) => sum + (r.totalGross || 0), 0),
      count: runs.length,
      lastRun: latest ? (latest.createdAt?.toDate ? format(latest.createdAt.toDate(), 'dd MMM yy') : "Just now") : "N/A"
    };
  }, [runs]);

  const handleInitializeRun = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing || !user) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const periodId = formData.get('periodId') as string;

    try {
      await createPayrollRun(db, selectedInstId, periodId, user.uid);
      toast({ title: "Payroll Run Initialized", description: "Computation node is active." });
      setIsRunModalOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Initialization Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500 shadow-inner border border-emerald-500/10">
              <HandCoins className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Payroll Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Institutional Remuneration Hub</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Validating..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg bg-emerald-600 hover:bg-emerald-700" disabled={!selectedInstId} onClick={() => setIsRunModalOpen(true)}>
              <Plus className="size-4" /> Initialize Run
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <Calculator className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to manage payroll cycles and payslip generation.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* KPI MATRIX */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-emerald-500/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Remuneration (MTD)</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">{currency} {stats.gross.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Consolidated Gross</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Payroll Velocity</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{stats.count} RUNS</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Institutional Cycles</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-accent/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Last Run Node</span>
                  <History className="size-3 text-accent opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-accent">{stats.lastRun}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Cycle Snapshot</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><ShieldCheck className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Compliance Pulse</span>
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-2xl font-black font-headline">LOCKED</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Statutory Sync: OK</p>
                </CardContent>
              </Card>
            </div>

            {/* RUNS LEDGER */}
            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search by run reference..." 
                    className="pl-9 h-10 text-[10px] bg-secondary/20 border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase text-primary border-primary/20 bg-primary/5 h-8 px-4">
                    {runs?.length || 0} Cycles Registered
                  </Badge>
                  <Button variant="ghost" size="icon" className="size-10 rounded-xl"><Filter className="size-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Run Reference</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Fiscal Period</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Workflow Stage</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">Gross Value</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Management</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runsLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing Ledger...</TableCell></TableRow>
                    ) : runs?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No payroll cycles have been initialized.</TableCell></TableRow>
                    ) : runs.map((run) => (
                      <TableRow key={run.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner border border-emerald-500/5 group-hover:rotate-3 transition-transform">
                              <HandCoins className="size-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{run.runNumber}</span>
                              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">Created: {run.createdAt?.toDate ? format(run.createdAt.toDate(), 'dd MMM') : 'Just now'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-5 px-2.5 font-black uppercase border-primary/20 text-primary bg-primary/5">
                            {activePeriods?.find(p => p.id === run.periodId)?.name || 'CURRENT'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm",
                            run.status === 'Posted' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                            'bg-amber-500/10 text-amber-500 ring-amber-500/20 animate-pulse'
                          )}>
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-foreground/80 uppercase">
                          {currency} {run.totalGross?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button variant="ghost" size="sm" className="h-9 px-4 text-[9px] font-black uppercase gap-2 hover:bg-primary/10 hover:text-primary transition-all">
                            View computation <ArrowRight className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-md">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><Landmark className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Audit Integrity</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Payroll runs are linked to open **Fiscal Periods**. Once a run is finalized, the system auto-posts a double-entry journal: DR Salaries Expense, CR Salaries Payable."
                  </p>
                </div>
              </Card>
              <div className="p-8 bg-secondary/10 rounded-[2rem] border border-border/50 flex items-center justify-between group cursor-default shadow-inner">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <Zap className="size-3 text-amber-500" /> Statutory Logic
                  </p>
                  <p className="text-[11px] font-bold leading-tight max-w-[250px]">P.A.Y.E, NSSF, and NHIF calculations are derived from your institutional tax settings at the edge.</p>
                </div>
                <Scale className="size-10 text-primary opacity-10 group-hover:opacity-100 transition-all duration-700 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* INITIALIZE RUN DIALOG */}
        <Dialog open={isRunModalOpen} onOpenChange={setIsRunModalOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2.5rem] overflow-hidden">
            <form onSubmit={handleInitializeRun}>
              <DialogHeader className="bg-secondary/10 p-8 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><HandCoins className="size-5" /></div>
                  <DialogTitle className="text-sm font-black uppercase tracking-widest">Initialize Cycle Run</DialogTitle>
                </div>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Remuneration Provisioning Node</CardDescription>
              </DialogHeader>
              
              <div className="p-8 space-y-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Target Audit Period</Label>
                  <Select name="periodId" required>
                    <SelectTrigger className="h-12 font-black uppercase border-none ring-1 ring-border bg-secondary/5"><SelectValue placeholder="Pick Open Period..." /></SelectTrigger>
                    <SelectContent>
                      {activePeriods?.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start text-primary shadow-inner">
                  <Info className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-[10px] leading-relaxed italic font-medium">
                    Initializing a run aggregates all approved attendance logs and leave records into a draft settlement worksheet.
                  </p>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-8 border-t gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsRunModalOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-12 px-12 font-black uppercase text-[10px] shadow-2xl shadow-emerald-900/40 bg-emerald-600 hover:bg-emerald-700 gap-3 border-none ring-2 ring-emerald-500/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-4" />} Commit Cycle
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
