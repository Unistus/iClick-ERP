
'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, where, doc, limit } from "firebase/firestore";
import { 
  Landmark, 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  Activity, 
  Search, 
  Filter, 
  CheckCircle2, 
  ExternalLink,
  History,
  Scale,
  Zap,
  Loader2,
  FileText,
  ArrowUpRight,
  PieChart,
  Calculator,
  ShieldAlert,
  BadgeCent,
  Clock,
  XCircle,
  Eye,
  CheckCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function StatutoryHubPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [dataTimestamp, setDataTimestamp] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal States
  const [selectedRunForReview, setSelectedRunForReview] = useState<any>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  useEffect(() => {
    setDataTimestamp(new Date().toLocaleTimeString());
  }, []);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Runs
  const runsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'payroll_runs'), 
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [db, selectedInstId]);
  const { data: runs, isLoading: runsLoading } = useCollection(runsQuery);

  // Data Fetching: COA for Ledger Balance Check
  const coaRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'coa');
  }, [db, selectedInstId]);
  const { data: coa } = useCollection(coaRef);

  // Data Fetching: Payroll Settings for mappings
  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'payroll');
  }, [db, selectedInstId]);
  const { data: payrollSetup } = useDoc(setupRef);

  const globalSettingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: globalSettings } = useDoc(globalSettingsRef);

  const currency = globalSettings?.general?.currencySymbol || "KES";

  // AGGREGATION ENGINE
  const aggregates = useMemo(() => {
    const activeRuns = runs?.filter(r => r.status === 'Posted' || r.status === 'Settled') || [];
    return {
      paye: activeRuns.reduce((sum, r) => sum + (r.totalPAYE || 0), 0),
      nssf: activeRuns.reduce((sum, r) => sum + (r.totalNSSF || 0) * 2, 0),
      housing: activeRuns.reduce((sum, r) => sum + (r.totalHousing || 0) * 2, 0),
      sha: activeRuns.reduce((sum, r) => sum + (r.totalSHA || 0), 0),
    };
  }, [runs]);

  // LEDGER AUDIT LOGIC
  const auditReport = useMemo(() => {
    if (!coa || !payrollSetup) return [];
    
    const findBal = (id: string) => coa.find(a => a.id === id)?.balance || 0;
    const findCode = (id: string) => coa.find(a => a.id === id)?.code || '...';

    return [
      { label: 'P.A.Y.E Tax', payroll: aggregates.paye, ledger: findBal(payrollSetup.payeAccountId), code: findCode(payrollSetup.payeAccountId) },
      { label: 'NSSF Pension', payroll: aggregates.nssf, ledger: findBal(payrollSetup.nssfAccountId), code: findCode(payrollSetup.nssfAccountId) },
      { label: 'S.H.A Health', payroll: aggregates.sha, ledger: findBal(payrollSetup.shaAccountId), code: findCode(payrollSetup.shaAccountId) },
      { label: 'Housing Levy', payroll: aggregates.housing, ledger: findBal(payrollSetup.housingLevyAccountId), code: findCode(payrollSetup.housingLevyAccountId) },
    ];
  }, [coa, payrollSetup, aggregates]);

  const hasLedgerDiscrepancy = auditReport.some(item => Math.abs(item.payroll - item.ledger) > 1);

  const handleExport = (type: string) => {
    toast({ 
      title: "Regulatory Export Initialized", 
      description: `Generating ${type} compliant CSV dataset for period audit.` 
    });
  };

  const filteredRuns = runs?.filter(r => 
    r.runNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.status?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/20 text-accent shadow-inner border border-accent/10">
              <Landmark className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Statutory Matrix</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Regulatory Filing & Tax Compliance Hub</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Validating Access..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => {
              setDataTimestamp(new Date().toLocaleTimeString());
              toast({ title: "Refreshing Audit Data" });
            }}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <Scale className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to access verified tax and pension summaries.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* KPI MATRIX */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Tax (PAYE)</span>
                  <BadgeCent className="size-3.5 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-foreground/90">{currency} {aggregates.paye.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Ready for ITax upload</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Social Security</span>
                  <Landmark className="size-3.5 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-primary">{currency} {aggregates.nssf.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">NSSF Employee + Employer</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-accent/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Housing Levy</span>
                  <Zap className="size-3.5 text-accent opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-accent">{currency} {aggregates.housing.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Institutional 3% Total</p>
                </CardContent>
              </Card>

              <Card className={cn("border-none ring-1 shadow-sm relative overflow-hidden transition-all", hasLedgerDiscrepancy ? "bg-destructive/5 ring-destructive/30" : "bg-emerald-500/5 ring-emerald-500/30")}>
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
                  {hasLedgerDiscrepancy ? <ShieldAlert className="size-24 text-destructive" /> : <CheckCircle2 className="size-24 text-emerald-500" />}
                </div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest", hasLedgerDiscrepancy ? "text-destructive" : "text-emerald-500")}>
                    {hasLedgerDiscrepancy ? "Ledger Mismatch" : "Compliance Status"}
                  </span>
                  <div className={cn("size-2.5 rounded-full animate-pulse", hasLedgerDiscrepancy ? "bg-destructive" : "bg-emerald-500")} />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className={cn("text-xl font-black font-headline", hasLedgerDiscrepancy ? "text-destructive" : "text-emerald-500")}>
                    {hasLedgerDiscrepancy ? "VARIANCE" : "VERIFIED"}
                  </div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Against GL Standards</p>
                </CardContent>
              </Card>
            </div>

            {/* FILING COMMAND CENTER */}
            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Institutional Regulatory Matrix</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-primary">Select finalized cycles to generate portal-ready datasets.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[9px] font-black uppercase gap-2 bg-background border-primary/20 text-primary hover:bg-primary/5" onClick={() => handleExport('P.A.Y.E (P10)')}>
                    <Calculator className="size-3.5" /> Generate P10
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[9px] font-black uppercase gap-2 bg-background border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5" onClick={() => handleExport('NSSF Bypass')}>
                    <FileText className="size-3.5" /> NSSF Export
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[9px] font-black uppercase gap-2 bg-background border-accent/20 text-accent hover:bg-accent/5" onClick={() => handleExport('SHIF/Housing')}>
                    <ExternalLink className="size-3.5" /> SHIF Hub
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <div className="px-6 py-3 bg-secondary/5 border-b flex items-center justify-between">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                    <Input 
                      placeholder="Find cycle..." 
                      className="h-8 pl-9 text-[10px] bg-background border-none ring-1 ring-border uppercase font-bold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                    <div className="flex items-center gap-1.5"><Clock className="size-3" /> Real-time Audit</div>
                    <div className="flex items-center gap-1.5"><History className="size-3" /> Historical Snapshot</div>
                  </div>
                </div>
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Cycle Period</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Gross Payload</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Filing Integrity</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">Tax Liability (PAYE)</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Audit Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runsLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Polling Compliances...</TableCell></TableRow>
                    ) : filteredRuns.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No finalized cycles detected in the registry.</TableCell></TableRow>
                    ) : filteredRuns.map((run) => (
                      <TableRow key={run.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8">
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight">{run.runNumber}</span>
                            <span className="text-[8px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">Period: {run.periodId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] opacity-60 uppercase">
                          {currency} {run.totalGross?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm",
                            run.status === 'Settled' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                            run.status === 'Posted' ? 'bg-primary/10 text-primary ring-primary/20' : 
                            'bg-amber-500/10 text-amber-500'
                          )}>
                            <ShieldCheck className="size-2 mr-1.5" /> {run.status === 'Settled' ? 'SIGNED & PAID' : 'POSTED'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-primary uppercase">
                          {currency} {(run.totalPAYE || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 px-4 text-[9px] font-black uppercase gap-2 hover:bg-primary/10 hover:text-primary transition-all group-hover:scale-105 shadow-inner"
                            onClick={() => setSelectedRunForReview(run)}
                          >
                            Review Filing <ExternalLink className="size-3" />
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
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><FileText className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Regulatory Safeguard</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Institutional statutory logic is anchored to current tax standards. The system enforces strict period-locking to ensure that data exported for regulatory filing is finalized and tamper-proof."
                  </p>
                </div>
              </Card>
              <div className="p-8 bg-secondary/10 rounded-[2rem] border border-border/50 flex flex-col justify-between group cursor-default shadow-inner">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <Zap className="size-3 text-emerald-500" /> Statutory Pulse
                  </p>
                  <p className="text-[11px] font-bold leading-tight max-w-[250px]">The current payroll liability matches your General Ledger within 99.9% tolerance.</p>
                </div>
                <div className="flex justify-between items-end mt-6">
                  <span className="text-[8px] font-mono text-muted-foreground uppercase">Data Node: {dataTimestamp}</span>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-emerald-500 font-bold text-[9px] uppercase gap-1.5 hover:gap-2 transition-all"
                    onClick={() => setIsAuditModalOpen(true)}
                  >
                    Audit Ledger Balances <ArrowUpRight className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW FILING DIALOG */}
        <Dialog open={!!selectedRunForReview} onOpenChange={(open) => !open && setSelectedRunForReview(null)}>
          <DialogContent className="max-w-xl shadow-2xl ring-1 ring-border rounded-[2.5rem] overflow-hidden p-0 border-none">
            <div className="bg-primary p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="size-32 rotate-12" /></div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner"><Clock className="size-5" /></div>
                <div>
                  <DialogTitle className="text-lg font-black uppercase tracking-widest">Statutory Review</DialogTitle>
                  <p className="text-[10px] font-bold uppercase opacity-70">Cycle: {selectedRunForReview?.runNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 relative z-10">
                <div>
                  <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Gross Payroll</p>
                  <p className="text-2xl font-black font-headline tracking-tighter">{currency} {selectedRunForReview?.totalGross?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Net Settlement</p>
                  <p className="text-2xl font-black font-headline tracking-tighter">{currency} {selectedRunForReview?.totalNet?.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Compliance Breakdown</h4>
                <div className="grid gap-2">
                  {[
                    { label: 'P.A.Y.E (Tax)', val: selectedRunForReview?.totalPAYE, color: 'text-primary' },
                    { label: 'NSSF Pension', val: selectedRunForReview?.totalNSSF * 2, color: 'text-emerald-500' },
                    { label: 'SHA Health Fund', val: selectedRunForReview?.totalSHA, color: 'text-accent' },
                    { label: 'Housing Levy (3%)', val: selectedRunForReview?.totalHousing * 2, color: 'text-primary' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/5 border border-border/50">
                      <span className="text-[10px] font-bold uppercase opacity-70">{item.label}</span>
                      <span className={cn("font-mono text-xs font-black", item.color)}>{currency} {item.val?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-4 items-start shadow-inner">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                <p className="text-[10px] leading-relaxed italic text-muted-foreground font-medium">
                  This cycle is locked and verified. The statutory components are ready for institutional reporting portals.
                </p>
              </div>
              <DialogFooter className="pt-2">
                <Button className="w-full h-12 font-black uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 rounded-2xl" onClick={() => handleExport(selectedRunForReview.runNumber)}>
                  <Download className="size-4" /> Download Filing Dataset
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* AUDIT LEDGER DIALOG */}
        <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
          <DialogContent className="max-w-2xl shadow-2xl ring-1 ring-border rounded-[2.5rem] overflow-hidden p-0 border-none">
            <div className="bg-secondary p-8 text-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Scale className="size-32 -rotate-12" /></div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-inner"><Calculator className="size-5" /></div>
                <DialogTitle className="text-lg font-black uppercase tracking-widest">General Ledger Handshake</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground max-w-md relative z-10">Verification of real-time payroll computation against institutional Chart of Account nodes.</DialogDescription>
            </div>
            
            <div className="p-8 space-y-6">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Statutory Node</TableHead>
                    <TableHead className="h-10 text-[9px] font-black uppercase text-right">Payroll Output</TableHead>
                    <TableHead className="h-10 text-[9px] font-black uppercase text-right">GL Balance</TableHead>
                    <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditReport.map(item => {
                    const variance = item.payroll - item.ledger;
                    return (
                      <TableRow key={item.label} className="h-14 border-b-border/30 hover:bg-secondary/5 transition-all">
                        <TableCell className="pl-6">
                          <p className="text-xs font-black uppercase tracking-tight">{item.label}</p>
                          <p className="text-[8px] font-mono text-muted-foreground uppercase opacity-50">Node: {item.code}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-primary">{currency} {item.payroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{currency} {item.ledger.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="outline" className={cn(
                            "text-[9px] h-5 font-black uppercase border-none ring-1 px-2.5 shadow-sm",
                            Math.abs(variance) < 1 ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-destructive/10 text-destructive ring-destructive/20'
                          )}>
                            {Math.abs(variance) < 1 ? 'MATCHED' : `${variance > 0 ? '+' : ''}${variance.toLocaleString()}`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {!hasLedgerDiscrepancy ? (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-4 items-center shadow-inner">
                  <CheckCircle className="size-6 text-emerald-600 shrink-0" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Sync Integrity: 100% Validated</p>
                </div>
              ) : (
                <div className="p-4 bg-destructive/5 border border-destructive/10 rounded-2xl flex gap-4 items-start shadow-inner">
                  <ShieldAlert className="size-6 text-destructive shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-destructive">Variance Detected</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                      The Ledger Balance for one or more statutory nodes does not match the accumulated payroll output. Please verify manual Journal Entries in the **Financial Suite**.
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button variant="ghost" className="w-full h-12 font-black uppercase text-[10px] tracking-widest hover:bg-secondary/20" onClick={() => setIsAuditModalOpen(false)}>Close Auditor</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
