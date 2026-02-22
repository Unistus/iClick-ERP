'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, where, serverTimestamp, addDoc } from "firebase/firestore";
import { 
  HandCoins, 
  Plus, 
  Search, 
  Filter, 
  History, 
  CheckCircle2, 
  Clock, 
  Activity, 
  ShieldCheck, 
  TrendingDown,
  Loader2,
  RefreshCw,
  Wallet,
  Landmark,
  BadgeCent,
  UserCircle,
  ArrowUpRight,
  PieChart,
  LayoutGrid
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LoanFilter = 'Active' | 'Cleared' | 'All';

export default function LoansAdvancesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<LoanFilter>('Active');

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Loans
  const loansQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'loans'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: loans, isLoading } = useCollection(loansQuery);

  // Data Fetching: Employees
  const employeesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employees');
  }, [db, selectedInstId]);
  const { data: employees } = useCollection(employeesRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const handleIssueLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing || !user) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const duration = parseInt(formData.get('duration') as string) || 1;
    const empId = formData.get('employeeId') as string;
    const emp = employees?.find(e => e.id === empId);

    const data = {
      employeeId: empId,
      employeeName: `${emp?.firstName} ${emp?.lastName}`,
      principal: amount,
      balance: amount,
      monthlyRecovery: amount / duration,
      durationMonths: duration,
      status: 'Active',
      type: formData.get('type'),
      reason: formData.get('reason'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'institutions', selectedInstId, 'loans'), data);
      toast({ title: "Loan Node Initialized", description: "Monthly recovery active in processing hub." });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Issuance Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLoans = useMemo(() => {
    if (!loans) return [];
    return loans.filter(l => {
      const matchesSearch = l.employeeName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [loans, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    if (!loans) return { exposure: 0, recovery: 0, activeCount: 0, clearedCount: 0 };
    return {
      exposure: loans.reduce((sum, l) => sum + (l.balance || 0), 0),
      recovery: loans.filter(l => l.status === 'Active').reduce((sum, l) => sum + (l.monthlyRecovery || 0), 0),
      activeCount: loans.filter(l => l.status === 'Active').length,
      clearedCount: loans.filter(l => l.status === 'Cleared').length,
    };
  }, [loans]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <HandCoins className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Settlement Horizons</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Staff Credit & Recoupment Governance</p>
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

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg bg-primary hover:bg-primary/90" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Issue Advance
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <Wallet className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to manage workforce credit horizons.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* KPI MATRIX */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Institutional Exposure</span>
                  <Landmark className="size-3.5 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-foreground/90">{currency} {stats.exposure.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Active Principal Balance</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-emerald-500/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Monthly Recovery</span>
                  <RefreshCw className="size-3.5 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">{currency} {stats.recovery.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Projected Recoupment</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><ShieldCheck className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Portfolio Status</span>
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-2xl font-black font-headline text-primary">HEALTHY</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">{stats.activeCount} ACTIVE NODES</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Closure Rate</span>
                  <CheckCircle2 className="size-3.5 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{stats.clearedCount} CLEARED</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Historical Settlements</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex gap-1 p-1 bg-secondary/20 rounded-xl w-fit">
                {(['Active', 'Cleared', 'All'] as const).map((s) => (
                  <Button 
                    key={s} 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "h-9 px-6 text-[10px] font-black uppercase tracking-widest transition-all",
                      statusFilter === s ? "bg-background shadow-sm text-primary" : "opacity-50"
                    )}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search personnel identity..." 
                  className="pl-9 h-10 text-[10px] bg-card border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Credit Registry</CardTitle>
                <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary font-black uppercase">Lifecycle Audit: ACTIVE</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Staff Member</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Settlement Arrears</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Monthly Deduction</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">Initial Principal</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing Ledger...</TableCell></TableRow>
                    ) : filteredLoans.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No credit records matching criteria.</TableCell></TableRow>
                    ) : filteredLoans.map((l) => {
                      const settled = l.principal - l.balance;
                      const progress = (settled / l.principal) * 100;
                      return (
                        <TableRow key={l.id} className="h-20 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase shadow-inner"><UserCircle className="size-5" /></div>
                              <div className="flex flex-col">
                                <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{l.employeeName}</span>
                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">{l.type} • REF: {l.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[200px]">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[8px] font-black uppercase">
                                <span className="opacity-40">Arrears Balance</span>
                                <span className={cn(l.balance > 0 ? "text-primary" : "text-emerald-500")}>{currency} {l.balance?.toLocaleString()}</span>
                              </div>
                              <Progress value={progress} className="h-1 bg-secondary [&>div]:bg-primary shadow-inner" />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-black font-mono text-destructive">{currency} {l.monthlyRecovery?.toLocaleString()}</span>
                              <span className="text-[8px] font-bold uppercase opacity-30">AUTO-DEDUCT</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs opacity-50 uppercase">
                            {currency} {l.principal?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase gap-2 hover:bg-primary/10"><History className="size-3" /> Timeline</Button>
                              <Button variant="ghost" size="icon" className="size-8 rounded-xl"><MoreVertical className="size-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Institutional Credit Policy</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Loans and advances are tracked as institutional assets. The recovery engine performs an atomic deduction during the **Payroll Processing** phase, ensuring real-time liability reduction."
                  </p>
                </div>
              </Card>
              <div className="p-8 bg-secondary/10 rounded-[2rem] border border-border/50 flex flex-col justify-between group cursor-default shadow-inner">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <History className="size-3 text-emerald-500" /> Settlement Integrity
                  </p>
                  <p className="text-[11px] font-bold leading-tight max-w-[250px]">Clearing a loan balance automatically transitions the node status to 'Cleared', halting further payroll deductions.</p>
                </div>
                <div className="flex justify-end mt-6">
                  <Button variant="outline" size="sm" className="h-9 px-6 text-[10px] font-black uppercase gap-2 bg-background border-none ring-1 ring-border group hover:ring-primary/30 transition-all">
                    <span>Export Arrears Statement</span>
                    <ArrowUpRight className="size-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ISSUE ADVANCE DIALOG */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2.5rem] overflow-hidden">
            <form onSubmit={handleIssueLoan}>
              <DialogHeader className="bg-secondary/10 p-8 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><HandCoins className="size-5" /></div>
                  <DialogTitle className="text-sm font-black uppercase tracking-widest">Authorize Staff Advance</DialogTitle>
                </div>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Institutional Credit Protocol v4.2</CardDescription>
              </DialogHeader>
              
              <div className="p-8 space-y-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Personnel Identity Node</Label>
                  <Select name="employeeId" required>
                    <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-primary"><SelectValue placeholder="Pick Subject Node..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => (
                        <SelectItem key={e.id} value={e.id} className="text-[10px] font-black uppercase tracking-tight">{e.firstName} {e.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Principal Payload</Label>
                    <Input name="amount" type="number" step="0.01" placeholder="0.00" required className="h-11 font-black text-lg bg-secondary/5 border-none ring-1 ring-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Recoupment Cycle</Label>
                    <Select name="duration" defaultValue="1">
                      <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 MONTH (ADVANCE)</SelectItem>
                        <SelectItem value="3">3 MONTHS</SelectItem>
                        <SelectItem value="6">6 MONTHS</SelectItem>
                        <SelectItem value="12">12 MONTHS (LOAN)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Basis / Justification</Label>
                  <Input name="reason" placeholder="Briefly define the requirement..." required className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start text-primary shadow-inner">
                  <BadgeCent className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Financial Node Lock</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">
                      Initializing this node will create a recurring debit instruction in the workforce ledger. Recoupment begins in the **Next Open Cycle**.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-8 border-t gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-12 px-12 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20 transition-all active:scale-95">
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Deploy Credit Node
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
