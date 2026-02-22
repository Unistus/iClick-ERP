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
import { collection, query, orderBy, limit, doc, where, serverTimestamp, addDoc } from "firebase/firestore";
import { 
  PlayCircle, 
  Plus, 
  Search, 
  History, 
  CheckCircle2, 
  Calculator, 
  Zap, 
  ShieldCheck, 
  Landmark, 
  ArrowRight,
  Loader2,
  RefreshCw,
  FileText,
  BadgeCent,
  TrendingUp,
  AlertCircle,
  Eye,
  ArrowLeft,
  Lock,
  Wallet,
  CheckCircle,
  Banknote
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createPayrollRun, finalizeAndPostPayroll, settlePayrollRun } from "@/lib/payroll/payroll.service";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { logSystemEvent } from "@/lib/audit-service";

export default function PayrollProcessingPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Runs
  const runsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'payroll_runs'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: runs, isLoading: runsLoading } = useCollection(runsQuery);

  // Data Fetching: Open Fiscal Periods
  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), where('status', '==', 'Open'));
  }, [db, selectedInstId]);
  const { data: activePeriods } = useCollection(periodsQuery);

  // Data Fetching: Bank Accounts for Settlement
  const banksQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'coa'), where('subtype', '==', 'Cash & Bank'), where('isActive', '==', true));
  }, [db, selectedInstId]);
  const { data: bankAccounts } = useCollection(banksQuery);

  // Data Fetching: Run Items (Worksheet)
  const itemsQuery = useMemoFirebase(() => {
    if (!selectedInstId || !selectedRunId) return null;
    return collection(db, 'institutions', selectedInstId, 'payroll_runs', selectedRunId, 'items');
  }, [db, selectedInstId, selectedRunId]);
  const { data: worksheetItems, isLoading: itemsLoading } = useCollection(itemsQuery);

  const selectedRun = runs?.find(r => r.id === selectedRunId);

  const handleInitializeRun = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing || !user) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const periodId = formData.get('periodId') as string;

    try {
      const newRun = await createPayrollRun(db, selectedInstId, periodId, user.uid);
      logSystemEvent(db, selectedInstId, user, 'PAYROLL', 'Init Run', `Payroll run ${newRun.id} initialized for period ${periodId}`);
      toast({ title: "Remuneration Cycle Initialized", description: "Computing statutory and net pay nodes..." });
      setIsRunModalOpen(false);
      if (newRun) setSelectedRunId(newRun.id);
    } catch (err) {
      toast({ variant: "destructive", title: "Initialization Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePostRun = async () => {
    if (!selectedInstId || !selectedRunId || isProcessing) return;
    setIsProcessing(true);
    try {
      await finalizeAndPostPayroll(db, selectedInstId, selectedRunId);
      logSystemEvent(db, selectedInstId, user, 'PAYROLL', 'Post Run', `Payroll run ${selectedRunId} finalized and posted to ledger.`);
      toast({ title: "Payroll Run Posted", description: "Ledger updated and payslips generated." });
      setSelectedRunId(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Posting Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSettleRun = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !selectedRunId || isProcessing || !user) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const bankId = formData.get('bankAccountId') as string;

    try {
      await settlePayrollRun(db, selectedInstId, selectedRunId, bankId, user.uid);
      logSystemEvent(db, selectedInstId, user, 'PAYROLL', 'Settle Run', `Funds disbursed for run ${selectedRunId} from bank ${bankId}.`);
      toast({ title: "Disbursement Complete", description: "Salaries settled and cash outflow recorded." });
      setIsSettlementModalOpen(false);
      setSelectedRunId(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Settlement Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: globalSettings } = useDoc(settingsRef);
  const currency = globalSettings?.general?.currencySymbol || "KES";

  if (selectedRunId) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-card p-6 rounded-[2rem] border shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setSelectedRunId(null)} className="rounded-full shrink-0">
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-black uppercase bg-primary/5 text-primary border-primary/20">Audit Phase</Badge>
                <span className="text-[10px] text-muted-foreground font-mono">/ {selectedRun?.id}</span>
              </div>
              <h1 className="text-2xl font-headline font-bold">Settlement Worksheet</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Reviewing: {selectedRun?.runNumber}</p>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              {selectedRun?.status === 'Draft' && (
                <Button 
                  onClick={handlePostRun} 
                  disabled={isProcessing} 
                  className="flex-1 md:flex-none gap-2 px-8 font-black uppercase text-xs h-11 shadow-xl bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Finalize & Post Ledger
                </Button>
              )}
              {selectedRun?.status === 'Posted' && (
                <Button 
                  onClick={() => setIsSettlementModalOpen(true)} 
                  disabled={isProcessing} 
                  className="flex-1 md:flex-none gap-2 px-8 font-black uppercase text-xs h-11 shadow-xl bg-primary hover:bg-primary/90 transition-all active:scale-95"
                >
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />} Execute Disbursement
                </Button>
              )}
              {selectedRun?.status === 'Settled' && (
                <Badge className="h-11 px-8 font-black uppercase bg-emerald-500/10 text-emerald-500 border-none ring-1 ring-emerald-500/20 text-xs">
                  <CheckCircle className="size-4 mr-2" /> Cycle Fully Reconciled
                </Badge>
              )}
            </div>
          </div>

          <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b border-border/50 flex flex-row items-center justify-between py-4 px-8">
              <div className="space-y-0.5">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Personnel Net Settlement Matrix</CardTitle>
                <p className="text-[9px] text-muted-foreground italic">Statutory calculations verified against Institutional Setup.</p>
              </div>
              <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary uppercase font-black px-3 h-6">Period: {selectedRun?.periodId}</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Staff Node</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">Gross Payload</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">P.A.Y.E (Tax)</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">Statutory Ded.</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">Custom / Loan</TableHead>
                    <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-primary">Final Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="size-8 animate-spin mx-auto text-primary opacity-20 mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Computing Settlement Matrix...</p></TableCell></TableRow>
                  ) : worksheetItems?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-[10px] opacity-20 uppercase font-black italic">No personnel nodes found in this cycle.</TableCell></TableRow>
                  ) : worksheetItems?.map(item => (
                    <TableRow key={item.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] uppercase">{item.employeeName?.[0]}</div>
                          <span className="font-black text-xs uppercase tracking-tight">{item.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs opacity-60">{currency} {item.gross?.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">{currency} {item.paye?.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">{currency} {(item.nssf + item.sha + item.housingLevy)?.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">{currency} {item.customDeductions?.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-8 font-mono text-sm font-black text-emerald-500">{currency} {item.netSalary?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* SETTLEMENT DIALOG */}
          <Dialog open={isSettlementModalOpen} onOpenChange={setIsSettlementModalOpen}>
            <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2.5rem] overflow-hidden p-0 border-none">
              <div className="bg-primary p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Landmark className="size-32 rotate-12" /></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md"><BadgeCent className="size-5" /></div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-widest">Execute Disbursement</h3>
                    <p className="text-[10px] font-bold uppercase opacity-70">Cycle: {selectedRun?.runNumber}</p>
                  </div>
                </div>
                <div className="text-center relative z-10">
                  <p className="text-[9px] font-black uppercase opacity-60 tracking-[0.4em] mb-2">Total Disbursement Value</p>
                  <p className="text-5xl font-black font-headline tracking-tighter">{currency} {selectedRun?.totalNet?.toLocaleString()}</p>
                </div>
              </div>
              
              <form onSubmit={handleSettleRun} className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[10px] tracking-widest opacity-60 text-primary">Funding Source Node</Label>
                  <Select name="bankAccountId" required>
                    <SelectTrigger className="h-12 font-black uppercase border-none ring-1 ring-border bg-secondary/5">
                      <SelectValue placeholder="Pick Bank/Cash Account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts?.map(bank => (
                        <SelectItem key={bank.id} value={bank.id} className="text-[10px] font-black uppercase">
                          {bank.name} ({currency} {bank.balance?.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground italic">Only 'Cash & Bank' nodes are visible for disbursement.</p>
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-4 items-start text-emerald-600 shadow-inner">
                  <CheckCircle2 className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Double-Entry Handshake</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">Finalizing this run will clear the Net Payables liability and record the asset outflow in your General Ledger.</p>
                  </div>
                </div>

                <DialogFooter className="pt-4 gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsSettlementModalOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Abort</Button>
                  <Button type="submit" disabled={isProcessing} className="h-12 px-12 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20 transition-all active:scale-95">
                    {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Commit Settlement
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <RefreshCw className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Settlement Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Institutional Remuneration Lifecycle</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg bg-emerald-600 hover:bg-emerald-700" disabled={!selectedInstId} onClick={() => setIsRunModalOpen(true)}>
              <Plus className="size-4" /> New Cycle
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <PlayCircle className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to manage payroll processing lifecycle.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Run Registry</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Run Reference</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Audit Period</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Workflow Stage</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">Net Disbursement</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runsLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing Cycles...</TableCell></TableRow>
                    ) : (!runs || runs.length === 0) ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No payroll cycles have been initialized.</TableCell></TableRow>
                    ) : runs.map((run) => (
                      <TableRow key={run.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner"><BadgeCent className="size-5" /></div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{run.runNumber}</span>
                              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">{format(run.createdAt?.toDate ? run.createdAt.toDate() : new Date(), 'dd MMM yyyy')}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-5 px-2.5 font-black uppercase border-primary/20 text-primary bg-primary/5">
                            {activePeriods?.find(p => p.id === run.periodId)?.name || 'AUDIT PERIOD'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm",
                            run.status === 'Settled' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                            run.status === 'Posted' ? 'bg-primary/10 text-primary ring-primary/20' :
                            'bg-amber-500/10 text-amber-500 ring-amber-500/20 animate-pulse'
                          )}>
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-foreground/80 uppercase">
                          {currency} {run.totalNet?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 px-4 text-[9px] font-black uppercase gap-2 hover:bg-primary/10 hover:text-primary transition-all group-hover:scale-105"
                            onClick={() => setSelectedRunId(run.id)}
                          >
                            {run.status === 'Draft' ? 'Audit Worksheet' : run.status === 'Posted' ? 'Initialize Payment' : 'View Summary'} <ArrowRight className="size-3" />
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
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><Calculator className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Computation Node</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Initializing a run aggregates all approved **Attendance Logs**, **Leave Records**, and **Recurring Salary Nodes**. The final stage performs an atomic GL posting and generates immutable payslips for the staff vault."
                  </p>
                </div>
              </Card>
              <div className="p-8 bg-secondary/10 rounded-[2rem] border border-border/50 flex items-center justify-between group cursor-default shadow-inner">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <Zap className="size-3 text-amber-500" /> Ledger Automation
                  </p>
                  <p className="text-[11px] font-bold leading-tight max-w-[250px]">Finalizing a cycle run triggers automatic journal entries across mapped Salaries, Tax, and Statutory liability accounts.</p>
                </div>
                <Landmark className="size-10 text-primary opacity-10 group-hover:opacity-100 transition-all duration-700 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <Dialog open={isRunModalOpen} onOpenChange={setIsRunModalOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2.5rem] overflow-hidden border-none p-0">
            <form onSubmit={handleInitializeRun}>
              <DialogHeader className="bg-secondary/10 p-8 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><BadgeCent className="size-5" /></div>
                  <DialogTitle className="text-sm font-black uppercase tracking-widest">Initialize Cycle Run</DialogTitle>
                </div>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Provisioning Node v4.2</CardDescription>
              </DialogHeader>
              
              <div className="p-8 space-y-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Authorized Fiscal Cycle</Label>
                  <Select name="periodId" required>
                    <SelectTrigger className="h-12 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-primary"><SelectValue placeholder="Pick Audit Period..." /></SelectTrigger>
                    <SelectContent>
                      {activePeriods?.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase tracking-tight">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start text-primary shadow-inner">
                  <AlertCircle className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Engine Handshake</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">
                      Initializing this run will freeze the selected period and compile a dynamic worksheet based on the latest staff remuneration nodes.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-8 border-t gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsRunModalOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-12 px-12 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20">
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />} Initialize Computation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
