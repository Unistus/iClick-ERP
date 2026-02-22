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
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createPayrollRun, finalizeAndPostPayroll } from "@/lib/payroll/payroll.service";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function PayrollProcessingPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
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
      toast({ title: "Payroll Run Posted", description: "Ledger updated and payslips generated." });
      setSelectedRunId(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Posting Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedRunId) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedRunId(null)} className="rounded-full">
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-headline font-bold">Audit Worksheet</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Reviewing: {selectedRun?.runNumber}</p>
            </div>
            {selectedRun?.status === 'Draft' && (
              <Button 
                onClick={handlePostRun} 
                disabled={isProcessing} 
                className="ml-auto gap-2 px-8 font-black uppercase text-xs h-10 shadow-xl bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Finalize & Post to Ledger
              </Button>
            )}
          </div>

          <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b border-border/50 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Personnel Net Settlement Matrix</CardTitle>
              <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary uppercase font-black">Period: {selectedRun?.periodId}</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Employee</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right">Gross</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right">PAYE</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right">Statutory</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right">Custom Ded.</TableHead>
                    <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs animate-pulse">Computing Matrix...</TableCell></TableRow>
                  ) : worksheetItems?.map(item => (
                    <TableRow key={item.id} className="h-14 hover:bg-secondary/5 border-b-border/30">
                      <TableCell className="pl-8 font-bold text-xs uppercase tracking-tight">{item.employeeName}</TableCell>
                      <TableCell className="text-right font-mono text-xs opacity-60">{item.gross?.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">{item.paye?.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">{(item.nssf + item.sha + item.housingLevy)?.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">{item.customDeductions?.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-8 font-mono text-xs font-black text-emerald-500">{item.netSalary?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                            run.status === 'Posted' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
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
                            {run.status === 'Draft' ? 'Audit Worksheet' : 'View Summary'} <ArrowRight className="size-3" />
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
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2.5rem] overflow-hidden">
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
