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
import { Zap, Truck, MapPin, Search, Loader2, CheckCircle2, User, CarFront, Warehouse, Navigation, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function DispatchHubPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const pendingDeliveriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'delivery_orders'), where('status', '==', 'Pending'));
  }, [db, selectedInstId]);
  const { data: pendingDeliveries, isLoading: deliveriesLoading } = useCollection(pendingDeliveriesQuery);

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
    if (!selectedInstId || !selectedDelivery || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      deliveryId: selectedDelivery.id,
      driverId: formData.get('driverId') as string,
      vehicleId: formData.get('vehicleId') as string,
      warehouseId: formData.get('warehouseId') as string,
      destinationAddress: formData.get('address') as string,
    };

    try {
      await dispatchDelivery(db, selectedInstId, payload, user!.uid);
      toast({ title: "Unit Dispatched", description: "Atomic stock update and pilot assignment successful." });
      setIsDispatchOpen(false);
      setSelectedDelivery(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Dispatch Guard Triggered", description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-accent/20 text-accent shadow-inner border border-accent/10">
              <Zap className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Dispatch Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Real-time Asset Assignment Hub</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder="Select Institution" />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-[2rem] bg-secondary/5">
            <Truck className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to process the logistics queue.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Wait Queue</span>
                  <History className="size-3 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{pendingDeliveries?.length || 0} PENDING</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Pilots Online</span>
                  <User className="size-3 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">{availableDrivers?.length || 0} AVAILABLE</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Fleet Ready</span>
                  <CarFront className="size-3 text-accent opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-accent">{availableVehicles?.length || 0} READY</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search pending deliveries..." className="pl-9 h-10 text-[10px] bg-secondary/20 border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" />
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase bg-accent/10 text-accent border-accent/20 h-8 px-4">
                  Dispatch Required: {pendingDeliveries?.length || 0}
                </Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Delivery Identifier</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Target Member</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Consolidated Items</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveriesLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse uppercase font-black">Scanning Pipeline...</TableCell></TableRow>
                    ) : pendingDeliveries?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No pending dispatches.</TableCell></TableRow>
                    ) : pendingDeliveries?.map((dl) => (
                      <TableRow key={dl.id} className="h-20 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8 font-mono text-[11px] font-black text-primary uppercase">{dl.deliveryNumber}</TableCell>
                        <TableCell className="text-xs font-black uppercase tracking-tight text-foreground/90">{dl.customerName}</TableCell>
                        <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{dl.items?.length || 0} Unique SKUs</TableCell>
                        <TableCell className="text-right pr-8">
                          <Button 
                            size="sm" 
                            className="h-10 px-6 text-[10px] font-black uppercase gap-2 bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20"
                            onClick={() => {
                              setSelectedDelivery(dl);
                              setIsDispatchOpen(true);
                            }}
                          >
                            <Zap className="size-3.5" /> Initialize Unit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={isDispatchOpen} onOpenChange={setIsDispatchOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2rem] overflow-hidden p-0 border-none">
            <form onSubmit={handleDispatch}>
              <div className="bg-accent p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Truck className="size-32 rotate-12" /></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner"><Navigation className="size-5" /></div>
                  <div>
                    <DialogTitle className="text-lg font-black uppercase tracking-widest">Resource Assignment</DialogTitle>
                    <p className="text-[10px] font-bold uppercase opacity-70">Unit: {selectedDelivery?.deliveryNumber}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8 space-y-6 bg-card text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Certified Pilot</Label>
                    <Select name="driverId" required>
                      <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-accent"><SelectValue placeholder="Pick Pilot..." /></SelectTrigger>
                      <SelectContent>
                        {availableDrivers?.map(d => <SelectItem key={d.id} value={d.id} className="text-[10px] font-black uppercase">{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Fleet Unit</Label>
                    <Select name="vehicleId" required>
                      <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-accent"><SelectValue placeholder="Pick Fleet..." /></SelectTrigger>
                      <SelectContent>
                        {availableVehicles?.map(v => <SelectItem key={v.id} value={v.id} className="text-[10px] font-black uppercase">{v.plateNumber} ({v.model})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Pickup Node (Warehouse)</Label>
                  <Select name="warehouseId" required>
                    <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-accent"><SelectValue placeholder="Select Site..." /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-[10px] font-black uppercase">{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Final Geo-target Address</Label>
                  <Input name="address" placeholder="Building, Floor, Street..." required className="h-11 bg-secondary/5 border-none ring-1 ring-border focus:ring-accent" />
                </div>

                <div className="p-4 bg-accent/5 border border-accent/10 rounded-2xl flex gap-4 items-start text-accent shadow-inner">
                  <CheckCircle2 className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Inventory Handshake</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">Finalizing will instantly deduct stock and lock fleet assets for the duration of the trip.</p>
                  </div>
                </div>

                <DialogFooter className="pt-2 gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsDispatchOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                  <Button type="submit" disabled={isProcessing} className="h-12 px-12 font-black uppercase text-[10px] shadow-2xl shadow-accent/40 bg-accent hover:bg-accent/90 gap-3 border-none ring-2 ring-accent/20 transition-all active:scale-95 flex-1">
                    {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Confirm Dispatch
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
