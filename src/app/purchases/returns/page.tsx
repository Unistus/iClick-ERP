
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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { format } from "date-fns";
import { ArrowLeftRight, Plus, Search, Filter, History, MoreVertical, Loader2, Warehouse, Trash2, Zap, AlertTriangle, BadgeCent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { processPurchaseReturn } from "@/lib/purchases/purchases.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function PurchaseReturnsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const returnsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'purchase_returns'), orderBy('createdAt', 'desc'), limit(50));
  }, [db, selectedInstId]);
  const { data: returns, isLoading } = useCollection(returnsQuery);

  const suppliersRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'suppliers');
  }, [db, selectedInstId]);
  const { data: suppliers } = useCollection(suppliersRef);

  const productsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'products');
  }, [db, selectedInstId]);
  const { data: products } = useCollection(productsRef);

  const warehousesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'warehouses');
  }, [db, selectedInstId]);
  const { data: warehouses } = useCollection(warehousesRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const handleReturn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const supplierId = formData.get('supplierId') as string;
    const productId = formData.get('productId') as string;
    const qty = parseFloat(formData.get('quantity') as string);
    const unitCost = parseFloat(formData.get('unitCost') as string);
    const supplier = suppliers?.find(s => s.id === supplierId);

    const payload = {
      supplierId,
      supplierName: supplier?.name || 'Vendor',
      warehouseId: formData.get('warehouseId') as string,
      total: qty * unitCost,
      reason: formData.get('reason') as string,
      items: [{ productId, qty, unitCost }]
    };

    try {
      await processPurchaseReturn(db, selectedInstId, payload);
      logSystemEvent(db, selectedInstId, user, 'PURCHASES', 'Process Return', `Purchase return PRET for ${payload.total} issued to ${payload.supplierName}.`);
      toast({ title: "Return Processed", description: "Liability reduced and stock adjusted." });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Return Failed", description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-destructive/20 text-destructive shadow-inner">
              <ArrowLeftRight className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Purchase Returns</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Debit Notes & Reverse Logistics</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" variant="destructive" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-destructive/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Issue Return
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <ArrowLeftRight className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage return workflows.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Returns Value</span>
                  <BadgeCent className="size-3 text-destructive" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{currency} {(returns?.reduce((sum, r) => sum + (r.total || 0), 0) || 0).toLocaleString()}</div>
                  <p className="text-[9px] text-destructive font-bold mt-1 uppercase">Total Liability Reversed</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Return Count</span>
                  <History className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{returns?.length || 0} EVENTS</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5"><ArrowLeftRight className="size-24" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Automation Status</span>
                  <Zap className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold uppercase">Real-time GL</div>
                  <p className="text-[9px] text-muted-foreground mt-1 font-medium">Atomic Stock & Ledger Updates</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search return # or vendor..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Button size="icon" variant="ghost" className="size-8"><Filter className="size-3.5" /></Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Return #</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Vendor Entity</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Reason</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Credit Value</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase tracking-widest">Scanning Reversal Logs...</TableCell></TableRow>
                    ) : returns?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No purchase returns recorded.</TableCell></TableRow>
                    ) : returns?.map((r) => (
                      <TableRow key={r.id} className="h-14 hover:bg-destructive/5 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6 font-mono text-[11px] font-bold text-destructive uppercase">{r.returnNumber}</TableCell>
                        <TableCell className="text-xs font-bold uppercase tracking-tight">{r.supplierName}</TableCell>
                        <TableCell className="text-[11px] italic text-muted-foreground max-w-[200px] truncate">{r.reason}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-destructive">
                          {currency} {r.total?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="secondary" className="text-[8px] h-4 bg-destructive/10 text-destructive border-none font-black uppercase">
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* New Return Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleReturn}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowLeftRight className="size-5 text-destructive" />
                  <DialogTitle>Issue Purchase Return</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight text-destructive">Liability Reversal: DEBIT NOTE</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Target Supplier</Label>
                  <Select name="supplierId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select Vendor..." /></SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Item to Return</Label>
                  <Select name="productId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select Catalog SKU..." /></SelectTrigger>
                    <SelectContent>
                      {products?.filter(p => p.type === 'Stock').map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input name="quantity" type="number" step="0.01" placeholder="0.00" required className="h-9 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Cost Credit</Label>
                    <Input name="unitCost" type="number" step="0.01" placeholder="0.00" required className="h-9 font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Return From (Warehouse)</Label>
                    <Select name="warehouseId" required>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Site" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input name="reason" placeholder="e.g. Damaged, Wrong SKU" required />
                  </div>
                </div>

                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex gap-3 items-start">
                  <AlertTriangle className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    <strong>Engine Note:</strong> Finalizing will atomically deduct stock and post a reversal journal: DR Accounts Payable, CR Inventory Asset.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-9">Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs px-8 bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <ArrowLeftRight className="size-3 mr-2" />} Finalize Debit Note
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
