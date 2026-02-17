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
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { format } from "date-fns";
import { Barcode, Plus, Search, Filter, History, MoreHorizontal, Warehouse, Package, Hash, Calendar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { registerInventoryBatch } from "@/lib/inventory/inventory.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function BatchSerialPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const batchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'batches'), orderBy('updatedAt', 'desc'));
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

  const handleCreateBatch = async (e: React.FormEvent<HTMLFormElement>) => {
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

    try {
      await registerInventoryBatch(db, selectedInstId, data);
      logSystemEvent(db, selectedInstId, user, 'INVENTORY', 'Create Batch', `Manual batch ${data.batchNumber} registered.`);
      toast({ title: "Batch Registered" });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: err.message });
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
              <Barcode className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Batch & Serial Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">LOT Traceability & Movement Audit</p>
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
              <Plus className="size-4" /> Manual Entry
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Barcode className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to trace item batches.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search batch or serial..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase">{batches?.length || 0} Batches Tracked</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Batch / LOT #</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Catalog Item</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Storage Site</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Expiry Date</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-bold">Streaming LOT registry...</TableCell></TableRow>
                    ) : batches?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground font-bold">Registry is empty.</TableCell></TableRow>
                    ) : batches?.map((b) => (
                      <TableRow key={b.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30">
                        <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">
                          {b.batchNumber}
                        </TableCell>
                        <TableCell className="text-xs font-bold uppercase">
                          {products?.find(p => p.id === b.productId)?.name || '...'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-[10px] uppercase font-medium">
                            <Warehouse className="size-3 opacity-50" />
                            {warehouses?.find(w => w.id === b.warehouseId)?.name || '...'}
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono">
                          {b.expiryDate?.toDate ? format(b.expiryDate.toDate(), 'dd MMM yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono font-bold text-xs">
                          {b.quantity?.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Manual Batch Entry Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreateBatch}>
              <DialogHeader>
                <DialogTitle>Register Stock Batch</DialogTitle>
                <CardDescription>Manually log a product LOT for institutional tracking.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Target Product</Label>
                  <Select name="productId" required>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select Item" /></SelectTrigger>
                    <SelectContent>
                      {products?.filter(p => p.type === 'Stock').map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Hash className="size-3" /> Batch / LOT #</Label>
                    <Input name="batchNumber" required className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Calendar className="size-3" /> Expiry Date</Label>
                    <Input name="expiryDate" type="date" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input name="quantity" type="number" step="0.01" required className="h-9 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Warehouse</Label>
                    <Select name="warehouseId" required>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Site" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-9">Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs px-8">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Plus className="size-3 mr-2" />} Commit Batch
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
