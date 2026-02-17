
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Truck, 
  Search, 
  Filter, 
  History, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  FileText,
  MapPin,
  User,
  Navigation,
  Loader2
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confirmDelivery } from "@/lib/delivery/delivery.service";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function DeliveryOrdersPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const deliveriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'delivery_orders'), 
      orderBy('dispatchedAt', 'desc'), 
      limit(100)
    );
  }, [db, selectedInstId]);
  const { data: deliveries, isLoading } = useCollection(deliveriesQuery);

  const driversQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'drivers');
  }, [db, selectedInstId]);
  const { data: drivers } = useCollection(driversQuery);

  // Filtering
  const filteredDeliveries = deliveries?.filter(d => 
    d.deliveryNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.destinationAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const stats = {
    total: deliveries?.length || 0,
    inTransit: deliveries?.filter(d => d.status === 'Dispatched').length || 0,
    delivered: deliveries?.filter(d => d.status === 'Delivered').length || 0,
  };

  const handleQuickConfirm = async (deliveryId: string) => {
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);
    try {
      await confirmDelivery(db, selectedInstId, deliveryId);
      toast({ title: "Delivery Confirmed", description: "Fulfillment cycle completed." });
    } catch (err) {
      toast({ variant: "destructive", title: "Action Failed" });
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
              <FileText className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Delivery Ledger</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Master Fulfillment Records</p>
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
            <Button size="sm" variant="outline" className="gap-2 h-9 text-xs font-bold uppercase shadow-sm">
              <Filter className="size-3.5" /> Filter
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Navigation className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to view the fulfillment ledger.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Dispatched</span>
                  <Truck className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{stats.total} ORDERS</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-accent">Active In-Transit</span>
                  <Navigation className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-accent">{stats.inTransit} ROUTES</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-500">Fulfilled Successfully</span>
                  <CheckCircle2 className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-emerald-500">{stats.delivered} COMPLETED</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search delivery or destination..." 
                    className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" className="size-8"><History className="size-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Delivery #</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Destination</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Operator</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Dispatch Date</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs animate-pulse uppercase font-bold">Retrieving Logs...</TableCell></TableRow>
                    ) : filteredDeliveries.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No matching delivery orders.</TableCell></TableRow>
                    ) : filteredDeliveries.map((dl) => (
                      <TableRow key={dl.id} className="h-16 hover:bg-secondary/5 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary uppercase">
                          {dl.deliveryNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold truncate max-w-[250px] uppercase">{dl.destinationAddress}</span>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-1"><MapPin className="size-2" /> Geo-tagged</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <User className="size-3" />
                            </div>
                            <span className="text-[10px] font-bold uppercase opacity-70">
                              {drivers?.find(d => d.id === dl.driverId)?.name || 'Unassigned'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground">
                          {dl.dispatchedAt?.toDate ? format(dl.dispatchedAt.toDate(), 'dd MMM yy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-[8px] h-4 uppercase font-black", 
                            dl.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-500 border-none' : 'bg-accent/10 text-accent border-accent/20'
                          )}>
                            {dl.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            {dl.status === 'Dispatched' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 text-[9px] font-bold uppercase gap-1.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleQuickConfirm(dl.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />} Confirm
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowUpRight className="size-3.5" />
                            </Button>
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
      </div>
    </DashboardLayout>
  );
}
