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
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { format, isBefore, addDays, isAfter } from "date-fns";
import { 
  Timer, 
  Plus, 
  Search, 
  AlertTriangle, 
  History, 
  CheckCircle2, 
  Skull, 
  Package,
  Activity,
  ArrowUpRight,
  TrendingDown,
  Filter,
  RefreshCw,
  MoreVertical,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { registerInventoryBatch } from "@/lib/inventory/inventory.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function ExpiryControlPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Expired' | 'Critical' | 'Warning'>('All');

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const batchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'batches'), orderBy('expiryDate', 'asc'));
  }, [db, selectedInstId]);
  const { data: batches, isLoading } = useCollection(batchesQuery);

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

  // Logic & Aggregates
  const now = new Date();
  const criticalThreshold = addDays(now, 30);
  const warningThreshold = addDays(now, 90);

  const filteredBatches = batches?.filter(b => {
    const expiry = b.expiryDate?.toDate();
    if (!expiry) return true;
    if (filter === 'Expired') return isBefore(expiry, now);
    if (filter === 'Critical') return isBefore(expiry, criticalThreshold) && isAfter(expiry, now);
    if (filter === 'Warning') return isBefore(expiry, warningThreshold) && isAfter(expiry, criticalThreshold);
    return true;
  }) || [];

  const expiredCount = batches?.filter(b => isBefore(b.expiryDate?.toDate(), now)).length || 0;
  const criticalCount = batches?.filter(b => isBefore(b.expiryDate?.toDate(), criticalThreshold) && isAfter(b.expiryDate?.toDate(), now)).length || 0;
  
  const totalValueAtRisk = batches?.filter(b => isBefore(b.expiryDate?.toDate(), warningThreshold)).reduce((sum, b) => {
    const prod = products?.find(p => p.id === b.productId);
    return sum + (b.quantity * (prod?.costPrice || 0));
  }, 0) || 0;

  const handleRegisterBatch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      productId: formData.get('productId') as string,
      warehouseId: formData.get('warehouseId') as string,
      batchNumber: formData.get('batchNumber') as string,
      expiryDate: new Date(formData.get('expiryDate') as string),
      quantity: parseFloat(formData.get('quantity') as string),
    };

    setIsCreateOpen(false);

    registerInventoryBatch(db, selectedInstId, data).then(() => {
      logSystemEvent(db, selectedInstId, user, 'INVENTORY', 'New Batch', `Batch ${data.batchNumber} registered for item ${data.productId}.`);
      toast({ title: "Batch Logged" });
    }).catch(err => {
      toast({ variant: "destructive", title: "Registration Failed", description: err.message });
    }).finally(() => setIsProcessing(false));
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Timer className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Expiry Control</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">FEFO Regulatory Compliance</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Batch
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Skull className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to monitor batch lifecycles.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1 tracking-wider">Batches Registered</p>
                  <div className="text-xl font-bold">{batches?.length || 0}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground font-medium">
                    <Package className="size-3" /> System Wide
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-destructive uppercase mb-1 tracking-wider">Expired Batches</p>
                  <div className="text-xl font-bold text-destructive">{expiredCount}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-destructive font-bold text-[9px]">
                    <Skull className="size-3" /> Immediate Write-off
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-amber-500 uppercase mb-1 tracking-wider">Critical (&lt;30D)</p>
                  <div className="text-xl font-bold text-amber-500">{criticalCount}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-amber-500 font-bold text-[9px]">
                    <AlertTriangle className="size-3" /> Liquidate Soon
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-primary uppercase mb-1 tracking-wider">Loss Exposure</p>
                  <div className="text-xl font-bold text-primary">{currency} {totalValueAtRisk.toLocaleString()}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-primary font-bold text-[9px]">
                    <TrendingDown className="size-3" /> Est. Cost Value
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex gap-1 p-1 bg-secondary/20 rounded-lg w-fit">
                {(['All', 'Expired', 'Critical', 'Warning'] as const).map((s) => (
                  <Button 
                    key={s} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 px-4 text-[10px] font-bold uppercase tracking-wider ${filter === s ? 'bg-background shadow-sm text-primary' : 'opacity-50'}`}
                    onClick={() => setFilter(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Find batch number..." className="pl-9 h-9 text-xs bg-card border-none ring-1 ring-border" />
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Product / Batch</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold">Expiry Date</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Quantity</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Est. Value</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs uppercase font-bold animate-pulse opacity-50">Syncing batches...</TableCell></TableRow>
                  ) : filteredBatches.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-30">No risk batches detected.</TableCell></TableRow>
                  ) : filteredBatches.map((b) => {
                    const prod = products?.find(p => p.id === b.productId);
                    const expiry = b.expiryDate?.toDate();
                    const isExpired = isBefore(expiry, now);
                    const isCritical = isBefore(expiry, criticalThreshold) && !isExpired;
                    const isWarning = isBefore(expiry, warningThreshold) && !isCritical && !isExpired;

                    return (
                      <TableRow key={b.id} className="h-16 hover:bg-secondary/10 transition-colors group border-b-border/30">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{prod?.name || 'Loading...'}</span>
                            <span className="text-[10px] font-mono text-primary font-bold uppercase">LOT: {b.batchNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={`text-[11px] font-bold ${isExpired ? 'text-destructive' : isCritical ? 'text-amber-500' : ''}`}>
                              {expiry ? format(expiry, 'dd MMM yyyy') : 'N/A'}
                            </span>
                            <span className="text-[9px] text-muted-foreground uppercase font-medium">
                              {expiry ? (isExpired ? 'Expired' : `${Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} Days Left`) : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">
                          {b.quantity?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-muted-foreground">
                          {currency} {(b.quantity * (prod?.costPrice || 0)).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-3">
                            <Badge variant="outline" className={`text-[9px] h-5 px-2 uppercase font-black border-none ring-1 ${
                              isExpired ? 'bg-destructive/10 text-destructive ring-destructive/20' : 
                              isCritical ? 'bg-amber-500/10 text-amber-500 ring-amber-500/20' : 
                              isWarning ? 'bg-primary/10 text-primary ring-primary/20' : 
                              'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20'
                            }`}>
                              {isExpired ? 'Expired' : isCritical ? 'Critical' : isWarning ? 'Warning' : 'Healthy'}
                            </Badge>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-[10px] font-bold uppercase">Remediation</DropdownMenuLabel>
                                <DropdownMenuItem className="text-xs gap-2">
                                  <TrendingDown className="size-3.5 text-amber-500" /> Apply Markdown
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2">
                                  <Skull className="size-3.5 text-destructive" /> Log Loss / Damage
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs gap-2 text-primary font-bold">
                                  <Zap className="size-3.5" /> Trigger AI Liquidation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Create Batch Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleRegisterBatch}>
              <DialogHeader>
                <DialogTitle>Register Batch Arrival</DialogTitle>
                <CardDescription>Log specific LOT number and expiry for stock tracking.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Target Product</Label>
                  <Select name="productId" required>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select Item" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.filter(p => p.type === 'Stock').map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name} (SKU: {p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Batch / LOT #</Label>
                    <Input name="batchNumber" placeholder="e.g. B-1024" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input name="expiryDate" type="date" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Arrival Quantity</Label>
                    <Input name="quantity" type="number" step="0.01" placeholder="0.00" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Storage Warehouse</Label>
                    <Select name="warehouseId" required>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select Site" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs">Commit Batch</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
