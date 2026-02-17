
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
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { 
  Layers, 
  Plus, 
  Search, 
  AlertTriangle, 
  History, 
  CheckCircle2, 
  MinusCircle, 
  Package,
  Activity,
  ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { recordStockMovement } from "@/lib/inventory/inventory.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function StockAdjustmentsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleAdjustment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const productId = formData.get('productId') as string;
    const type = formData.get('type') as any;
    const qty = parseFloat(formData.get('quantity') as string);
    const reason = formData.get('reason') as string;

    recordStockMovement(db, selectedInstId, {
      productId,
      warehouseId: formData.get('warehouseId') as string,
      type,
      quantity: qty,
      reference: `ADJ: ${reason}`,
      unitCost: 0 // Will pull from product service in service layer
    }).then(() => {
      logSystemEvent(db, selectedInstId, user, 'INVENTORY', 'Stock Adjustment', `Adjustment of ${qty} units for product ${productId}.`);
      toast({ title: "Stock Corrected" });
      setIsCreateOpen(false);
    }).catch(err => {
      toast({ variant: "destructive", title: "Adjustment Failed", description: err.message });
    }).finally(() => setIsProcessing(false));
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Layers className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Stock Corrections</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Adjustments & Damage Reconciliation</p>
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
              <Plus className="size-4" /> Log Correction
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Activity className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to log physical count differences.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Adjustment Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Timestamp</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold">Item</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-center">Type</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Quantity</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Reason / Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse opacity-50 uppercase font-bold">Streaming movements...</TableCell></TableRow>
                  ) : movements?.filter(m => m.type === 'Adjustment' || m.type === 'Damage').length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground font-bold">No corrections recorded.</TableCell></TableRow>
                  ) : movements?.filter(m => m.type === 'Adjustment' || m.type === 'Damage').map((m) => (
                    <TableRow key={m.id} className="h-14 hover:bg-secondary/10 transition-colors">
                      <TableCell className="pl-6 text-[10px] font-mono text-muted-foreground">
                        {m.timestamp?.toDate ? format(m.timestamp.toDate(), 'dd/MM HH:mm') : 'Syncing...'}
                      </TableCell>
                      <TableCell className="text-xs font-bold">
                        {products?.find(p => p.id === m.productId)?.name || 'Unknown Item'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-[8px] h-4 uppercase font-bold ${
                          m.type === 'Damage' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {m.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black">
                        {m.quantity}
                      </TableCell>
                      <TableCell className="pl-6 text-[11px] text-muted-foreground italic">
                        {m.reference}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Create Adjustment Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleAdjustment}>
              <DialogHeader>
                <DialogTitle>Physical Count Correction</DialogTitle>
                <CardDescription>Adjust on-hand quantities based on audit or damage.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Target Product</Label>
                  <Select name="productId" required>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select Item to Adjust" />
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
                    <Label>Warehouse / Node</Label>
                    <Select name="warehouseId" required>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Source Site" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Adjustment Type</Label>
                    <Select name="type" defaultValue="Adjustment">
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Adjustment" className="text-xs">Inventory Audit</SelectItem>
                        <SelectItem value="Damage" className="text-xs">Physical Damage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quantity to Remove (Absolute)</Label>
                  <div className="relative">
                    <MinusCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-destructive" />
                    <Input name="quantity" type="number" step="0.01" placeholder="0.00" className="pl-10 h-10 font-bold" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason / Memo</Label>
                  <Input name="reason" placeholder="e.g. Expired on shelf or Audit shortfall" required />
                </div>
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-[10px] text-destructive font-black uppercase flex items-center gap-1.5"><AlertTriangle className="size-3" /> Automation King Alert</p>
                  <p className="text-[10px] text-muted-foreground mt-1">This will auto-post a shrinkage journal entry using your mapped accounts.</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs">Commit Adjustment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
