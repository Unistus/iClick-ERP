
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
import { collection, query, orderBy, where, doc } from "firebase/firestore";
import { dispatchDelivery } from "@/lib/delivery/delivery.service";
import { Zap, Truck, MapPin, Search, Loader2, CheckCircle2, User, CarFront, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function DispatchHubPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const pendingInvoicesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'sales_invoices'), where('status', '==', 'Finalized'));
  }, [db, selectedInstId]);
  const { data: pendingInvoices, isLoading: invoicesLoading } = useCollection(pendingInvoicesQuery);

  const driversQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'drivers'), where('status', '==', 'Available'));
  }, [db, selectedInstId]);
  const { data: availableDrivers } = useCollection(driversQuery);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'vehicles'), where('status', '==', 'Available'));
  }, [db, selectedInstId]);
  const { data: availableVehicles } = useCollection(vehiclesQuery);

  const warehousesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'warehouses');
  }, [db, selectedInstId]);
  const { data: warehouses } = useCollection(warehousesRef);

  const handleDispatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !selectedInvoice || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      invoiceId: selectedInvoice.id,
      driverId: formData.get('driverId') as string,
      vehicleId: formData.get('vehicleId') as string,
      warehouseId: formData.get('warehouseId') as string,
      destinationAddress: formData.get('address') as string,
    };

    try {
      await dispatchDelivery(db, selectedInstId, payload, user!.uid);
      toast({ title: "Delivery Dispatched", description: "Stock deducted and driver assigned." });
      setIsDispatchOpen(false);
      setSelectedInvoice(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Dispatch Error", description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-accent/20 text-accent">
              <Zap className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Dispatch Control</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Fulfillment Queue & Vehicle Matching</p>
            </div>
          </div>
          
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
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Truck className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to process the dispatch queue.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search finalized invoices..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase text-accent">Ready for Dispatch: {pendingInvoices?.length || 0}</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Invoice #</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Customer</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Billing Total</TableHead>
                    <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse uppercase">Scanning Sales Ledger...</TableCell></TableRow>
                  ) : pendingInvoices?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No pending dispatches.</TableCell></TableRow>
                  ) : pendingInvoices?.map((inv) => (
                    <TableRow key={inv.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-xs font-bold uppercase">{inv.customerName}</TableCell>
                      <TableCell className="text-xs font-black">KES {inv.total?.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button 
                          size="sm" 
                          className="h-8 text-[9px] font-bold uppercase gap-1.5 bg-accent hover:bg-accent/90"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDispatchOpen(true);
                          }}
                        >
                          <Zap className="size-3" /> Initialize Dispatch
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isDispatchOpen} onOpenChange={setIsDispatchOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleDispatch}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="size-5 text-accent" />
                  <DialogTitle>Logistics Assignment</DialogTitle>
                </div>
                <CardDescription className="text-xs">Dispatching Invoice {selectedInvoice?.invoiceNumber} for {selectedInvoice?.customerName}</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><User className="size-3 text-primary" /> Driver</Label>
                    <Select name="driverId" required>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select Pilot..." /></SelectTrigger>
                      <SelectContent>
                        {availableDrivers?.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><CarFront className="size-3 text-primary" /> Vehicle</Label>
                    <Select name="vehicleId" required>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select Fleet..." /></SelectTrigger>
                      <SelectContent>
                        {availableVehicles?.map(v => <SelectItem key={v.id} value={v.id} className="text-xs">{v.plateNumber} ({v.model})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Warehouse className="size-3 text-accent" /> Dispatch From (Warehouse)</Label>
                  <Select name="warehouseId" required>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select Source Storage..." /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><MapPin className="size-3 text-destructive" /> Destination Address</Label>
                  <Input name="address" placeholder="e.g. 4th Floor, Westlands Hub" required />
                </div>

                <div className="p-3 bg-accent/5 border border-accent/10 rounded-lg">
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    <strong>Engine Note:</strong> Dispatching will atomically deduct <strong>{selectedInvoice?.items?.length}</strong> SKUs from the selected warehouse and mark the vehicle/driver as busy.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs w-full bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Zap className="size-3 mr-2" />} Confirm Dispatch
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
