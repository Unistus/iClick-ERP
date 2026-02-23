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
  Loader2,
  Package,
  Zap
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confirmDelivery } from "@/lib/delivery/delivery.service";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function DeliveryOrdersPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching
  const deliveriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'delivery_orders'), 
      orderBy('createdAt', 'desc'), 
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
    d.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const stats = {
    total: deliveries?.length || 0,
    pending: deliveries?.filter(d => d.status === 'Pending').length || 0,
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
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Package className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Fulfillment Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Master Delivery Lifecycle</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-[2rem] bg-secondary/5">
            <Navigation className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access the delivery ledger.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">To Dispatch</span>
                  <Zap className="size-3 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-primary">{stats.pending} ORDERS</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm group hover:ring-accent/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-accent tracking-widest">In Transit</span>
                  <Navigation className="size-3 text-accent opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-accent">{stats.inTransit} ROUTES</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm group hover:ring-emerald-500/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Delivered</span>
                  <CheckCircle2 className="size-3 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-emerald-500">{stats.delivered} COMPLETED</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Truck className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase tracking-widest text-primary">Fleet Ready</span></CardHeader>
                <CardContent className="pb-4"><div className="text-xl font-black font-headline">94.2%</div></CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search by delivery # or member..." 
                    className="pl-9 h-10 text-[10px] bg-secondary/20 border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 border-primary/20 px-3 h-8">Fulfillment Registry</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Identifier</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Recipient Member</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center">Lifecycle Phase</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Fulfillment Point</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Polling Satellite Data...</TableCell></TableRow>
                    ) : filteredDeliveries.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No movement detected in the registry.</TableCell></TableRow>
                    ) : filteredDeliveries.map((dl) => (
                      <TableRow key={dl.id} className="h-20 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] font-black text-primary uppercase">{dl.deliveryNumber}</span>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Created: {dl.createdAt?.toDate ? format(dl.createdAt.toDate(), 'dd MMM HH:mm') : '...'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-black uppercase tracking-tight text-foreground/90">{dl.customerName}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm", 
                            dl.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                            dl.status === 'Dispatched' ? 'bg-accent/10 text-accent ring-accent/20 animate-pulse' : 
                            'bg-secondary text-muted-foreground ring-border'
                          )}>
                            {dl.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase truncate max-w-[200px] text-muted-foreground">{dl.destinationAddress || 'Await Dispatch'}</span>
                            <span className="text-[8px] font-mono text-primary font-bold mt-0.5">SOURCE: {dl.warehouseId || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            {dl.status === 'Pending' && (
                              <Button variant="ghost" size="sm" className="h-9 px-4 text-[9px] font-black uppercase gap-2 text-primary hover:bg-primary/10 shadow-inner" onClick={() => router.push('/delivery/dispatch')}>
                                <Zap className="size-3.5" /> Initialize Dispatch
                              </Button>
                            )}
                            {dl.status === 'Dispatched' && (
                              <Button size="sm" variant="ghost" className="h-9 px-4 text-[9px] font-black uppercase gap-2 text-emerald-500 hover:bg-emerald-500/10 shadow-inner" onClick={() => handleQuickConfirm(dl.id)}>
                                <CheckCircle2 className="size-3.5" /> Confirm Proof
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="size-9 rounded-xl"><MoreVertical className="size-4" /></Button>
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
