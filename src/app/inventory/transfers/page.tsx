
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { format } from "date-fns";
import { 
  Truck, 
  Plus, 
  Search, 
  ArrowRightLeft, 
  History, 
  CheckCircle2, 
  Box,
  Warehouse,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { transferStock } from "@/lib/inventory/inventory.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function StockTransfersPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

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

  const movementsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'movements'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [db, selectedInstId]);
  const { data: movements, isLoading } = useCollection(movementsQuery);

  // Filter movements to only show transfers (In/Out pairs usually share reference)
  const transferLogs = movements?.filter(m => m.reference?.startsWith('TRF-')) || [];

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const productId = formData.get('productId') as string;
    const fromId = formData.get('fromWarehouseId') as string;
    const toId = formData.get('toWarehouseId') as string;
    const qty = parseFloat(formData.get('quantity') as string);
    const reason = formData.get('reason') as string;

    if (fromId === toId) {
      toast({ variant: "destructive", title: "Invalid Transfer", description: "Source and target warehouses must be different." });
      setIsProcessing(false);
      return;
    }

    try {
      await transferStock(db, selectedInstId, {
        productId,
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        quantity: qty,
        reference: reason
      });

      logSystemEvent(db, selectedInstId, user, 'INVENTORY', 'Stock Transfer', `Moved ${qty} units of product ${productId} from ${fromId} to ${toId}.`);
      toast({ title: "Transfer Successful" });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Transfer Failed", description: err.message });
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
              <Truck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Stock Transfers</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Internal Logistics & Movements</p>
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
              <Plus className="size-4" /> New Transfer
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Truck className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage inter-site movements.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Active Transfers</span>
                  <Truck className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{transferLogs.length / 2} MOVEMENTS</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Source Hubs</span>
                  <Warehouse className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{warehouses?.length || 0} SITES</div>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-500">Inventory Velocity</span>
                  <CheckCircle2 className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-emerald-500">STABLE</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search logs..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase">Real-time Feed</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Timestamp</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Product</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-center">Direction</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Quantity</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Reference / Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse">Scanning logistics hub...</TableCell></TableRow>
                    ) : transferLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No inter-site movements recorded.</TableCell></TableRow>
                    ) : transferLogs.map((m) => (
                      <TableRow key={m.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30">
                        <TableCell className="pl-6 text-[10px] font-mono text-muted-foreground">
                          {m.timestamp?.toDate ? format(m.timestamp.toDate(), 'dd/MM HH:mm') : 'Syncing...'}
                        </TableCell>
                        <TableCell className="text-xs font-bold">
                          {products?.find(p => p.id === m.productId)?.name || 'Unknown Item'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[8px] h-4 uppercase font-bold ${
                            m.type === 'In' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                          }`}>
                            {m.type === 'In' ? 'RECEIVE' : 'DISPATCH'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black">
                          {m.quantity}
                        </TableCell>
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">{m.reference}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">{warehouses?.find(w => w.id === m.warehouseId)?.name}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Transfer Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleTransfer}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="size-5 text-primary" />
                  <DialogTitle className="text-sm font-bold uppercase tracking-wider">Execute inter-site Movement</DialogTitle>
                </div>
                <CardDescription className="text-xs">Physically move stock from one storage node to another.</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Target Product</Label>
                  <Select name="productId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select Item to Move" /></SelectTrigger>
                    <SelectContent>
                      {products?.filter(p => p.type === 'Stock').map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.name} (SKU: {p.sku})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><ArrowRightLeft className="size-3 text-destructive" /> Source Warehouse</Label>
                    <Select name="fromWarehouseId" required>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Dispatch from..." /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><ArrowRightLeft className="size-3 text-emerald-500" /> Target Warehouse</Label>
                    <Select name="toWarehouseId" required>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Receive at..." /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity to Move</Label>
                    <Input name="quantity" type="number" step="0.01" placeholder="0.00" required className="h-10 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference / Batch</Label>
                    <Input name="reason" placeholder="e.g. Restock Branch A" required className="h-10" />
                  </div>
                </div>

                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex gap-3 items-start">
                  <AlertCircle className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-tight italic">
                    This operation is atomic. Stock is deducted from Source and added to Target simultaneously. No sub-ledger journals are required for internal transfers.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-9">Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs px-8">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Truck className="size-3 mr-2" />} Initialize Transfer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
