'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, limit } from "firebase/firestore";
import { createPurchaseOrder } from "@/lib/purchases/purchases.service";
import { checkTransactionAgainstBudget } from "@/lib/budgeting/budget.service";
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Filter, 
  History, 
  MoreVertical, 
  Loader2, 
  Zap, 
  ShieldAlert, 
  ShoppingCart, 
  CheckCircle2, 
  FileText, 
  Trash2,
  Activity,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function PurchaseOrdersPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [targetAccountId, setTargetAccountId] = useState<string>("");
  const [poAmount, setPoAmount] = useState<number>(0);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching
  const suppliersRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'suppliers');
  }, [db, selectedInstId]);
  const { data: suppliers } = useCollection(suppliersRef);

  const coaRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'coa');
  }, [db, selectedInstId]);
  const { data: accounts } = useCollection(coaRef);

  const ordersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'purchase_orders'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: orders, isLoading } = useCollection(ordersQuery);

  const budgetSetupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'budgeting');
  }, [db, selectedInstId]);
  const { data: budgetSetup } = useDoc(budgetSetupRef);

  // REAL-TIME BUDGET CHECK
  const [budgetInsight, setBudgetInsight] = useState<{ allowed: boolean; message?: string; utilization?: number } | null>(null);
  const [isCheckingBudget, setIsCheckingBudget] = useState(false);

  useMemo(async () => {
    if (!selectedInstId || !targetAccountId || poAmount <= 0) {
      setBudgetInsight(null);
      return;
    }
    setIsCheckingBudget(true);
    const res = await checkTransactionAgainstBudget(db, selectedInstId, targetAccountId, poAmount);
    setBudgetInsight(res);
    setIsCheckingBudget(false);
  }, [selectedInstId, targetAccountId, poAmount, db]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !user || isProcessing) return;
    
    setIsProcessing(true);
    const supplier = suppliers?.find(s => s.id === selectedSupplierId);

    const data = {
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Unknown',
      total: poAmount,
      expenseAccountId: targetAccountId,
      items: [], 
    };

    try {
      const result = await createPurchaseOrder(db, selectedInstId, data, user.uid);
      
      if (result?.status === 'Pending Approval') {
        toast({ 
          variant: "destructive", 
          title: "Governance Triggered", 
          description: "Order value or budget variance requires managerial sign-off." 
        });
      } else {
        toast({ title: "Purchase Order Created" });
      }

      setIsCreateOpen(false);
      setTargetAccountId("");
      setPoAmount(0);
    } catch (err: any) {
      toast({ variant: "destructive", title: "PO Creation Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner border border-primary/10">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Purchase Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Institutional Procurement Pipeline</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder={instLoading ? "Validating..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg bg-primary hover:bg-primary/90" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Raise PO
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <ShoppingCart className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage its procurement lifecycle.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Pipeline</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-primary">{orders?.filter(o => o.status !== 'Received').length || 0} OPEN</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-accent tracking-widest">Pending Review</span>
                  <Activity className="size-3 text-accent animate-pulse" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-accent">{orders?.filter(o => o.status === 'Pending Approval').length || 0} LOCKS</div>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10"><ShieldCheck className="size-24 text-emerald-500" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Compliance Pulse</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline">SECURE</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Commitment Value</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-primary">KES {(orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search PO # or supplier..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Badge variant="outline" className={cn("text-[9px] h-6 px-3 font-black uppercase border-none ring-1", 
                  budgetSetup?.strictPoEnforcement ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20" : "bg-primary/10 text-primary ring-primary/20"
                )}>
                  Budget Enforcement: {budgetSetup?.strictPoEnforcement ? 'STRICT' : 'ADVISORY'}
                </Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Order Identifier</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Supplier Node</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center">Governance Phase</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-right">Commitment Value</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Syncing Procurement Ledger...</TableCell></TableRow>
                    ) : orders?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No historical orders in the registry.</TableCell></TableRow>
                    ) : orders?.map((o) => (
                      <TableRow key={o.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] font-black text-primary uppercase">{o.poNumber}</span>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Created: {format(o.createdAt?.toDate ? o.createdAt.toDate() : new Date(), 'dd MMM yy')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-black uppercase tracking-tight text-foreground/90">{o.supplierName}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm", 
                            o.status === 'Pending Approval' ? 'bg-amber-500/10 text-amber-500 ring-amber-500/20 animate-pulse' : 
                            o.status === 'Received' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                            'bg-secondary text-muted-foreground ring-border'
                          )}>
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-primary">KES {o.total?.toLocaleString()}</TableCell>
                        <TableCell className="text-right pr-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><MoreVertical className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 shadow-2xl ring-1 ring-border">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Operations</DropdownMenuLabel>
                              <DropdownMenuItem className="text-xs gap-3 font-bold"><FileText className="size-3.5 text-primary" /> View Full Specs</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-3 font-bold"><History className="size-3.5 text-accent" /> Fulfillment History</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs gap-3 font-bold text-destructive"><Trash2 className="size-3.5" /> Terminate Order</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PO CREATION MODAL */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2rem] overflow-hidden p-0 border-none">
            <form onSubmit={handleSubmit}>
              <div className="bg-primary p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><ShoppingCart className="size-32 rotate-12" /></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner"><ClipboardCheck className="size-5" /></div>
                  <div>
                    <DialogTitle className="text-lg font-black uppercase tracking-widest">Raise Requisition</DialogTitle>
                    <p className="text-[10px] font-bold uppercase opacity-70">Procurement Node v4.2</p>
                  </div>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-white">Target Settlement Value</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-white/50 text-sm">KES</span>
                      <Input 
                        name="total" 
                        type="number" 
                        step="0.01" 
                        value={poAmount} 
                        onChange={(e) => setPoAmount(parseFloat(e.target.value) || 0)}
                        className="h-14 pl-14 text-2xl font-black font-headline border-none bg-white/10 backdrop-blur-md text-white placeholder:text-white/30 focus-visible:ring-white/50 shadow-inner" 
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6 bg-card">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Authorized Supplier</Label>
                    <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId} required>
                      <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-primary"><SelectValue placeholder="Pick Vendor Entity..." /></SelectTrigger>
                      <SelectContent>
                        {suppliers?.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase tracking-tight">{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Target Budget Node</Label>
                    <Select value={targetAccountId} onValueChange={setTargetAccountId} required>
                      <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-primary"><SelectValue placeholder="Allocate to Ledger..." /></SelectTrigger>
                      <SelectContent>
                        {accounts?.filter(acc => acc.isTrackedForBudget).map(acc => (
                          <SelectItem key={acc.id} value={acc.id} className="text-[10px] font-black uppercase">
                            [{acc.code}] {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* BUDGET INSIGHT PANEL */}
                {budgetInsight && (
                  <div className={cn("p-4 rounded-2xl border flex gap-4 items-start shadow-inner transition-all animate-in zoom-in-95 duration-300", 
                    budgetInsight.allowed ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600" : "bg-destructive/5 border-destructive/10 text-destructive"
                  )}>
                    {budgetInsight.allowed ? <ShieldCheck className="size-5 shrink-0 mt-0.5" /> : <ShieldAlert className="size-5 shrink-0 mt-0.5 animate-pulse" />}
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest">{budgetInsight.allowed ? 'Audit Clear' : 'Variance Warning'}</p>
                      <p className="text-[10px] leading-relaxed italic font-medium">
                        {budgetInsight.message || `Projected utilization for this node will be ${budgetInsight.utilization?.toFixed(1)}%.`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-4 items-start text-primary">
                  <Sparkles className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-[10px] leading-relaxed italic font-medium">
                    Orders exceeding **KES 50,000** or the **Assigned Budget** will automatically enter the Governance Firewall for sign-off.
                  </p>
                </div>

                <DialogFooter className="pt-4 gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Abort</Button>
                  <Button 
                    type="submit" 
                    disabled={isProcessing || isCheckingBudget || !selectedSupplierId || !targetAccountId} 
                    className="h-12 px-12 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20 transition-all active:scale-95"
                  >
                    {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Initialize Cycle
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
