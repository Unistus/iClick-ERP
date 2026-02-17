
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
import { Truck, Plus, Search, CheckCircle2, History, PackageCheck, Loader2, MapPin, Warehouse, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createDeliveryNote } from "@/lib/sales/sales.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function DeliveryNotesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const dnQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'delivery_notes'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: deliveryNotes, isLoading } = useCollection(dnQuery);

  const invoicesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'sales_invoices'), where('status', '==', 'Finalized'));
  }, [db, selectedInstId]);
  const { data: activeInvoices } = useCollection(invoicesQuery);

  const warehousesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'warehouses');
  }, [db, selectedInstId]);
  const { data: warehouses } = useCollection(warehousesRef);

  const handleDispatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const invoiceId = formData.get('invoiceId') as string;
    const warehouseId = formData.get('warehouseId') as string;
    
    const invoice = activeInvoices?.find(i => i.id === invoiceId);
    if (!invoice) return;

    try {
      await createDeliveryNote(db, selectedInstId, {
        invoiceId,
        warehouseId,
        items: invoice.items
      });

      logSystemEvent(db, selectedInstId, user, 'SALES', 'Delivery Note', `Dispatched DN for invoice ${invoice.invoiceNumber}. Stock levels updated.`);
      toast({ title: "Delivery Dispatched", description: "Inventory total stock adjusted automatically." });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Dispatch Failed", description: err.message });
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
              <h1 className="text-2xl font-headline font-bold">Fulfillment & Logistics</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Inventory Deduction & Delivery Audit</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={selectedInstId} 
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold rounded-md px-3"
            >
              <option value="">Select Institution</option>
              {institutions?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Delivery
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <PackageCheck className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage logistics.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search delivery ref..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter text-emerald-500">Inventory Sync: REAL-TIME</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">DN #</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Linked Invoice</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Dispatch Node</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Scanning Logistics Hub...</TableCell></TableRow>
                  ) : deliveryNotes?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No deliveries dispatched.</TableCell></TableRow>
                  ) : deliveryNotes?.map((dn) => (
                    <TableRow key={dn.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">{dn.deliveryNumber}</TableCell>
                      <TableCell className="text-xs font-bold">
                        {activeInvoices?.find(i => i.id === dn.invoiceId)?.invoiceNumber || '...'}
                      </TableCell>
                      <TableCell className="text-[10px] uppercase font-bold text-muted-foreground">
                        {warehouses?.find(w => w.id === dn.warehouseId)?.name || '...'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 border-none uppercase font-black">
                          {dn.status}
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
            <form onSubmit={handleDispatch}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <PackageCheck className="size-5 text-primary" />
                  <DialogTitle>Finalize Dispatch</DialogTitle>
                </div>
                <CardDescription className="text-xs">Convert a finalized invoice into a physical stock deduction.</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Source Invoice</Label>
                  <Select name="invoiceId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select Finalized Invoice" /></SelectTrigger>
                    <SelectContent>
                      {activeInvoices?.map(i => (
                        <SelectItem key={i.id} value={i.id} className="text-xs">
                          {i.invoiceNumber} - {i.customerName} (KES {i.total.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dispatch Warehouse</Label>
                  <Select name="warehouseId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select Pickup Node" /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex gap-3 items-start">
                  <Zap className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    <strong>Inventory King:</strong> This will automatically call the Stock Movement engine to subtract items from your chosen warehouse.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-9">Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs px-8 shadow-lg shadow-primary/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Truck className="size-3 mr-2" />} Confirm Dispatch
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
