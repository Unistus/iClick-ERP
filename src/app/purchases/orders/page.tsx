'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, doc, serverTimestamp } from "firebase/firestore";
import { createPurchaseOrder } from "@/lib/purchases/purchases.service";
import { checkTransactionAgainstBudget } from "@/lib/budgeting/budget.service";
import { ClipboardCheck, Plus, Search, Filter, History, MoreVertical, Loader2, PackageCheck, Zap, ShieldAlert, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

export default function PurchaseOrdersPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

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

  const poQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'purchase_orders'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: orders, isLoading } = useCollection(poQuery);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !user || isProcessing) return;
    
    const formData = new FormData(e.currentTarget);
    const supplierId = formData.get('supplierId') as string;
    const expenseAccountId = formData.get('expenseAccountId') as string;
    const total = parseFloat(formData.get('total') as string);
    const supplier = suppliers?.find(s => s.id === supplierId);

    setIsProcessing(true);

    try {
      // BUDGET GATEKEEPER: Verify allocation before raising PO
      const budgetCheck = await checkTransactionAgainstBudget(db, selectedInstId, expenseAccountId, total);
      
      if (!budgetCheck.allowed) {
        toast({ 
          variant: "destructive", 
          title: "Budget Breach Blocked", 
          description: budgetCheck.message 
        });
        setIsProcessing(false);
        return;
      }

      const data = {
        supplierId,
        supplierName: supplier?.name || 'Unknown',
        total,
        expenseAccountId,
        items: [], 
        status: 'Draft',
      };

      await createPurchaseOrder(db, selectedInstId, data, user.uid);
      toast({ title: "Purchase Order Raised", description: "Fulfillment cycle initiated." });
      setIsCreateOpen(false);
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
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Purchase Orders</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Procurement Pipeline Hub</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New PO
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <ClipboardCheck className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage PO lifecycle.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search PO # or vendor..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-primary">Budget Check: ENFORCED</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">PO #</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Supplier Entity</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right">Value</TableHead>
                    <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Syncing Orders Hub...</TableCell></TableRow>
                  ) : orders?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No purchase orders found.</TableCell></TableRow>
                  ) : orders?.map((o) => (
                    <TableRow key={o.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">{o.poNumber}</TableCell>
                      <TableCell className="text-xs font-bold uppercase tracking-tight">{o.supplierName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[8px] h-4 uppercase font-black", 
                          o.status === 'Draft' ? 'bg-secondary text-muted-foreground' : 'bg-emerald-500/10 text-emerald-500 border-none'
                        )}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-primary">KES {o.total?.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100"><MoreVertical className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><ClipboardCheck className="size-5" /></div>
                  <DialogTitle className="text-lg font-bold">Raise Purchase Order</DialogTitle>
                </div>
                <CardDescription className="text-[10px] uppercase font-black tracking-widest text-primary">Compliance Verification: ACTIVE</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Source Vendor</Label>
                  <Select name="supplierId" required>
                    <SelectTrigger className="h-11 border-none ring-1 ring-border bg-secondary/5 font-black uppercase">
                      <SelectValue placeholder="Search Supplier Registry..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(s => <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase">{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60 text-primary">Allocated Ledger Node (Budget Node)</Label>
                  <Select name="expenseAccountId" required>
                    <SelectTrigger className="h-11 border-none ring-1 ring-border bg-primary/5 font-black uppercase">
                      <SelectValue placeholder="Select Audit Node..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.filter(acc => acc.isTrackedForBudget).map(acc => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs font-bold uppercase">
                          [{acc.code}] {acc.name} (Limit: {acc.monthlyLimit?.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[8px] text-muted-foreground italic">Only accounts marked for 'Budget Tracking' are visible here.</p>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Estimated Total (KES)</Label>
                  <Input name="total" type="number" step="0.01" placeholder="0.00" required className="h-12 font-black text-2xl bg-secondary/5 border-none ring-1 ring-border focus-visible:ring-primary" />
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-4 items-start text-primary shadow-inner">
                  <ShieldAlert className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Budget Gatekeeper</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">
                      Finalizing this PO will perform a real-time check against your institutional ceilings. Invoices exceeding the allowed threshold will be blocked if strict mode is active.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-11 font-black uppercase tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-11 px-10 font-bold uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <ClipboardCheck className="size-4" />} Validate & Commit PO
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
