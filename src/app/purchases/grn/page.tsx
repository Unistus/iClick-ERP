
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
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import { receiveGRN } from "@/lib/purchases/purchases.service";
import { PackageCheck, Plus, Search, Filter, History, MoreVertical, Loader2, Warehouse, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function GRNHubPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const poQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'purchase_orders'), where('status', '==', 'Draft'));
  }, [db, selectedInstId]);
  const { data: openOrders } = useCollection(poQuery);

  const warehousesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'warehouses');
  }, [db, selectedInstId]);
  const { data: warehouses } = useCollection(warehousesRef);

  const grnQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'grns'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: grns, isLoading } = useCollection(grnQuery);

  const handleReceive = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const poId = formData.get('poId') as string;
    
    try {
      await receiveGRN(db, selectedInstId, {
        poId,
        warehouseId: formData.get('warehouseId') as string,
        items: [] // In MVP we receive the full PO as one GRN
      });
      toast({ title: "Goods Received", description: "Inventory stock counts updated." });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "GRN Receipt Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-500">
              <PackageCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">GRN Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Goods Received & Stock Arrival</p>
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

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Receipt
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <PackageCheck className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to log physical arrivals.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search GRN #..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase text-emerald-500">Inventory Sync: ATOMIC</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">GRN #</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Source PO</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">History</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse">Syncing Arrival Stream...</TableCell></TableRow>
                  ) : grns?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No receipts on record.</TableCell></TableRow>
                  ) : grns?.map((g) => (
                    <TableRow key={g.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6 font-mono text-[11px] font-bold text-emerald-500">{g.grnNumber}</TableCell>
                      <TableCell className="text-xs font-bold uppercase text-muted-foreground">PO: {openOrders?.find(o => o.id === g.poId)?.poNumber || 'PO-1004'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 border-none font-black uppercase">
                          {g.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100"><History className="size-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleReceive}>
              <DialogHeader>
                <DialogTitle>Finalize Stock Receipt</DialogTitle>
                <CardDescription className="text-xs uppercase font-black tracking-tight">Physical Audit Confirmation</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Source Purchase Order</Label>
                  <Select name="poId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select Open PO..." /></SelectTrigger>
                    <SelectContent>
                      {openOrders?.map(o => <SelectItem key={o.id} value={o.id}>{o.poNumber} - {o.supplierName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destination Warehouse</Label>
                  <Select name="warehouseId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select Pickup Node..." /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex gap-3 items-start text-emerald-600">
                  <Zap className="size-4 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed italic">
                    <strong>Inventory King:</strong> Submitting this GRN will instantly update your physical stock counts across the network.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs w-full bg-emerald-600 hover:bg-emerald-700">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <PackageCheck className="size-3 mr-2" />} Finalize Arrival
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
