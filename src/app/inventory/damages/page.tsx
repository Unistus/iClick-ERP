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
  Skull, 
  Plus, 
  Search, 
  AlertCircle, 
  History, 
  Loader2, 
  Package,
  Warehouse,
  FileWarning
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { recordStockMovement } from "@/lib/inventory/inventory.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function DamagesLossPage() {
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

  const damageLogs = movements?.filter(m => m.type === 'Damage') || [];

  const handleLogDamage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const productId = formData.get('productId') as string;
    const qty = parseFloat(formData.get('quantity') as string);
    const reason = formData.get('reason') as string;

    try {
      await recordStockMovement(db, selectedInstId, {
        productId,
        warehouseId: formData.get('warehouseId') as string,
        type: 'Damage',
        quantity: qty,
        reference: `Loss: ${reason}`,
        unitCost: 0 
      });

      logSystemEvent(db, selectedInstId, user, 'INVENTORY', 'Log Damage', `Recorded loss of ${qty} units for product ${productId}.`);
      toast({ title: "Loss Recorded", description: "Ledger updated for shrinkage." });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Logging Failed", description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-destructive/20 text-destructive">
              <Skull className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Damage & Write-offs</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Inventory Shrinkage Registry</p>
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

            <Button size="sm" variant="destructive" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-destructive/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Log Loss
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Skull className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access loss records.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Units Lost</span>
                  <Package className="size-3 text-destructive" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{damageLogs.reduce((sum, m) => sum + Math.abs(m.quantity), 0).toLocaleString()} UNITS</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Loss Events</span>
                  <History className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{damageLogs.length} RECORDS</div>
                </CardContent>
              </Card>
              <Card className="bg-destructive/5 border-none ring-1 ring-destructive/20 shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-destructive">Shrinkage Rate</span>
                  <AlertCircle className="size-3 text-destructive" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-destructive">Monitoring</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Timestamp</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold">Product</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold">Warehouse</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Qty Lost</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Reason / Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs uppercase font-bold animate-pulse">Syncing loss records...</TableCell></TableRow>
                  ) : damageLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No write-offs on file.</TableCell></TableRow>
                  ) : damageLogs.map((m) => (
                    <TableRow key={m.id} className="h-14 hover:bg-destructive/5 transition-colors group">
                      <TableCell className="pl-6 text-[10px] font-mono text-muted-foreground">
                        {m.timestamp?.toDate ? format(m.timestamp.toDate(), 'dd/MM HH:mm') : 'Syncing...'}
                      </TableCell>
                      <TableCell className="text-xs font-bold">
                        {products?.find(p => p.id === m.productId)?.name || '...'}
                      </TableCell>
                      <TableCell className="text-[10px] uppercase font-medium">
                        {warehouses?.find(w => w.id === m.warehouseId)?.name || '...'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-destructive">
                        {Math.abs(m.quantity)}
                      </TableCell>
                      <TableCell className="pl-6 text-[11px] text-muted-foreground italic">
                        {m.reference}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleLogDamage}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Skull className="size-5 text-destructive" />
                  <DialogTitle className="text-sm font-bold uppercase tracking-wider">Log Physical Loss</DialogTitle>
                </div>
                <CardDescription className="text-xs">Permanently remove units from stock due to damage or theft.</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Target Product</Label>
                  <Select name="productId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select Item" /></SelectTrigger>
                    <SelectContent>
                      {products?.filter(p => p.type === 'Stock').map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warehouse / Site</Label>
                    <Select name="warehouseId" required>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Location" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity Lost</Label>
                    <Input name="quantity" type="number" step="0.01" placeholder="0.00" required className="h-9 font-bold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason for Write-off</Label>
                  <Input name="reason" placeholder="e.g. Expired on shelf, Physical damage during move" required />
                </div>

                <div className="p-3 bg-destructive/5 border border-destructive/10 rounded-lg flex gap-3 items-start">
                  <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-tight italic">
                    <strong>Ledger Alert:</strong> This will auto-post a journal entry debiting your <strong>Shrinkage Expense</strong> account and crediting <strong>Inventory Asset</strong>.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-9">Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs px-8 bg-destructive hover:bg-destructive/90">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Skull className="size-3 mr-2" />} Commit Write-off
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
