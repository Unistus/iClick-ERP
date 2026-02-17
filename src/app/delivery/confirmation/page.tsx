'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Search, Truck, MapPin, Loader2, ArrowUpRight, DollarSign } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { confirmDelivery } from "@/lib/delivery/delivery.service";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function DeliveryConfirmationPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const deliveriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'delivery_orders'), where('status', '==', 'Dispatched'));
  }, [db, selectedInstId]);
  const { data: activeDeliveries, isLoading } = useCollection(deliveriesQuery);

  const handleConfirm = async (id: string) => {
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);
    try {
      await confirmDelivery(db, selectedInstId, id);
      toast({ title: "Delivery Confirmed", description: "Revenue recognized and resources freed." });
    } catch (err) {
      toast({ variant: "destructive", title: "Confirmation Failed" });
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
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Fulfillment Proof</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Revenue Recognition & Cycle Completion</p>
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
            <CheckCircle2 className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to confirm deliveries.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5"><DollarSign className="size-24" /></div>
                <CardHeader className="pb-2 pt-4"><span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Recognition Event</span></CardHeader>
                <CardContent>
                  <p className="text-[11px] leading-relaxed italic opacity-70">
                    Confirming a delivery automatically transitions the linked sales invoice to <strong>Settled</strong>, recognizing revenue in the institutional ledger.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5"><Truck className="size-24" /></div>
                <CardHeader className="pb-2 pt-4"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Resource Loop</span></CardHeader>
                <CardContent>
                  <p className="text-[11px] leading-relaxed italic opacity-70">
                    Once marked as delivered, the assigned driver and vehicle are instantly returned to the <strong>Available</strong> resource pool.
                  </p>
                </CardContent>
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Find trip ref..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase text-emerald-500">Awaiting Proof: {activeDeliveries?.length || 0}</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Delivery #</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Destination</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Operator</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Management</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse">Syncing GPS Hub...</TableCell></TableRow>
                    ) : activeDeliveries?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">All trips reconciled.</TableCell></TableRow>
                    ) : activeDeliveries?.map((dl) => (
                      <TableRow key={dl.id} className="h-16 hover:bg-emerald-500/5 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6 font-mono text-[11px] font-black text-primary uppercase">{dl.deliveryNumber}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold truncate max-w-[200px]">{dl.destinationAddress}</span>
                            <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1"><MapPin className="size-2" /> In Transit</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-bold uppercase opacity-60">Staff ID: {dl.driverId?.slice(0, 5)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Button 
                            size="sm" 
                            disabled={isProcessing}
                            className="h-8 text-[9px] font-black uppercase gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20"
                            onClick={() => handleConfirm(dl.id)}
                          >
                            {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />} Confirm Arrival
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
      </div>
    </DashboardLayout>
  );
}