'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Search, Truck, MapPin, Loader2, ArrowUpRight, DollarSign, Users, ShieldCheck, History, RefreshCw, Zap } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where, doc } from "firebase/firestore";
import { confirmDelivery } from "@/lib/delivery/delivery.service";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function DeliveryConfirmationPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Dispatched orders ready for proof
  const deliveriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'delivery_orders'), 
      where('status', '==', 'Dispatched'),
      orderBy('dispatchedAt', 'asc')
    );
  }, [db, selectedInstId]);
  const { data: activeDeliveries, isLoading } = useCollection(deliveriesQuery);

  const driversQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'drivers');
  }, [db, selectedInstId]);
  const { data: drivers } = useCollection(driversQuery);

  const handleConfirm = async (id: string) => {
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(id);
    try {
      await confirmDelivery(db, selectedInstId, id);
      toast({ title: "Fulfillment Cycle Completed", description: "Physical proof verified and resources freed." });
    } catch (err) {
      toast({ variant: "destructive", title: "Confirmation Failed" });
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredDeliveries = activeDeliveries?.filter(d => 
    d.deliveryNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500 shadow-inner border border-emerald-500/10">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Proof of Fulfillment</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Arrival Confirmation & Resource Reconciliation</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => toast({ title: "Scanning GPS Hub..." })}><RefreshCw className="size-4" /></Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <ShieldCheck className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to confirm completed delivery cycles.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-md relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><DollarSign className="size-24" /></div>
                <CardHeader className="pb-2 pt-4"><span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Revenue Settlement</span></CardHeader>
                <CardContent>
                  <p className="text-[11px] leading-relaxed italic opacity-70">
                    Confirming arrival atomically updates the institutional ledger, transitioning the linked Sales Order to <strong>Fulfilled</strong> status.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-md overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Truck className="size-24" /></div>
                <CardHeader className="pb-2 pt-4"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Fleet Loop</span></CardHeader>
                <CardContent>
                  <p className="text-[11px] leading-relaxed italic opacity-70">
                    Confirming arrival instantly returns the assigned pilot and vehicle to the <strong>Available</strong> resource pool for the next cycle.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search by ID or recipient..." 
                    className="pl-9 h-10 text-[10px] bg-secondary/20 border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/5 border-emerald-500/20 px-4 h-8">Awaiting Confirmation: {activeDeliveries?.length || 0}</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Trip Identifier</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Recipient Member</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Deployment Window</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Assigned Pilot</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Fulfillment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing GPS Hub...</TableCell></TableRow>
                    ) : filteredDeliveries.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No shipments awaiting proof.</TableCell></TableRow>
                    ) : filteredDeliveries.map((dl) => (
                      <TableRow key={dl.id} className="h-20 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8 font-mono text-[11px] font-black text-primary uppercase">{dl.deliveryNumber}</TableCell>
                        <TableCell className="text-xs font-black uppercase tracking-tight text-foreground/90">{dl.customerName}</TableCell>
                        <TableCell className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                          {dl.dispatchedAt?.toDate ? format(dl.dispatchedAt.toDate(), 'dd MMM HH:mm') : '...'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shadow-inner border border-border"><Users className="size-3.5" /></div>
                            <span className="text-[10px] font-black uppercase opacity-70">{drivers?.find(d => d.id === dl.driverId)?.name || 'PILOT-NODE'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button 
                            size="sm" 
                            disabled={isProcessing === dl.id}
                            className="h-10 px-6 text-[10px] font-black uppercase gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                            onClick={() => handleConfirm(dl.id)}
                          >
                            {isProcessing === dl.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Confirm Arrival
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start shadow-inner">
              <Zap className="size-6 text-primary shrink-0 animate-pulse" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Compliance Protocol</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                  "Confirming arrival constitutes a legal handshake between the institution and the customer. This event is cryptographically timestamped and logged in the immutable **Audit Stream**."
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
