'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Route as RouteIcon, 
  Plus, 
  Search, 
  Zap, 
  MapPin, 
  Clock, 
  CarFront, 
  User, 
  ArrowUpRight, 
  Navigation,
  ListTree,
  CheckCircle2,
  RefreshCw,
  Loader2,
  MoreVertical,
  Flag
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function DeliveryRoutesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const deliveriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'delivery_orders'), where('status', '==', 'Dispatched'));
  }, [db, selectedInstId]);
  const { data: activeDeliveries, isLoading } = useCollection(deliveriesQuery);

  const driversQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'drivers');
  }, [db, selectedInstId]);
  const { data: drivers } = useCollection(driversQuery);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'vehicles');
  }, [db, selectedInstId]);
  const { data: vehicles } = useCollection(vehiclesQuery);

  const handleOptimize = () => {
    if (!selectedInstId) return;
    setIsProcessing(true);
    // Simulate AI optimization sequence
    setTimeout(() => {
      setIsProcessing(false);
      toast({ title: "Routes Optimized", description: "System has re-sequenced 14 stops for maximum fuel efficiency." });
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner">
              <RouteIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Route Planning</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Multi-stop Optimization & Dispatch Logistics</p>
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

            <Button 
              size="sm" 
              className="gap-2 h-9 text-xs font-bold uppercase bg-primary shadow-lg shadow-primary/20" 
              disabled={!selectedInstId || isProcessing}
              onClick={handleOptimize}
            >
              {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Optimize Logic
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Navigation className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access its logistics map.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Active Routes</span>
                  <RouteIcon className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{activeDeliveries?.length || 0} PATHS</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-500">Efficiency Rating</span>
                  <Zap className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-emerald-500">92% OPTIMAL</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Fleet Saturation</span>
                  <CarFront className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">84% BUSY</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                  <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input placeholder="Search route ID or stop..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase text-primary">Routing Engine v1.0</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Route Ref</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-black">Consolidated Stops</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-black">Pilot & Fleet</TableHead>
                        <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeDeliveries?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No active routes planned.</TableCell></TableRow>
                      ) : activeDeliveries?.map((route) => {
                        const driver = drivers?.find(d => d.id === route.driverId);
                        const vehicle = vehicles?.find(v => v.id === route.vehicleId);
                        return (
                          <TableRow key={route.id} className="h-16 hover:bg-secondary/5 transition-colors border-b-border/30 group">
                            <TableCell className="pl-6">
                              <div className="flex flex-col">
                                <span className="font-mono text-[11px] font-black text-primary uppercase">{route.deliveryNumber}</span>
                                <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="size-2" /> ETA: 45m</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-secondary/50 border border-border">
                                  <MapPin className="size-3 text-destructive" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold uppercase truncate max-w-[200px]">{route.destinationAddress}</span>
                                  <span className="text-[9px] text-muted-foreground font-medium">Stop 1 of 1</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                  <User className="size-3.5" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold uppercase">{driver?.name || 'Assigned Pilot'}</span>
                                  <span className="text-[9px] font-mono text-muted-foreground uppercase">{vehicle?.plateNumber || 'FLEET-NODE'}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-2">
                                <Badge variant="secondary" className="text-[8px] h-4 bg-primary/10 text-primary border-none uppercase font-black">
                                  En-Route
                                </Badge>
                                <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="bg-primary/5 border-b border-border/10 pb-3">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <ListTree className="size-4 text-primary" /> Multi-Stop Queue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="relative pl-6 space-y-6">
                      <div className="absolute left-2.5 top-1 bottom-1 w-px bg-dashed border-l border-primary/30" />
                      
                      <div className="relative">
                        <div className="absolute -left-5 top-1 size-3 rounded-full bg-primary border-4 border-background ring-1 ring-primary/20" />
                        <p className="text-[10px] font-black uppercase tracking-tighter text-primary">Warehouse Origin</p>
                        <p className="text-[9px] text-muted-foreground">Central Distribution Center</p>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-5 top-1 size-3 rounded-full bg-accent border-4 border-background" />
                        <p className="text-[10px] font-black uppercase tracking-tighter">Transit Hub A</p>
                        <p className="text-[9px] text-muted-foreground">Sorting Facility</p>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-5 top-1 size-3 rounded-full bg-muted border-4 border-background" />
                        <p className="text-[10px] font-black uppercase tracking-tighter opacity-40">Final Destination</p>
                        <p className="text-[9px] text-muted-foreground opacity-40">Client Site</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/50">
                      <Button variant="outline" className="w-full justify-between h-10 text-[10px] font-bold uppercase bg-secondary/10 border-none ring-1 ring-border group">
                        <span>Calculate Fuel & Tolls</span>
                        <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Flag className="size-24 text-emerald-500" /></div>
                  <CardHeader className="pb-2"><span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Efficiency Insight</span></CardHeader>
                  <CardContent>
                    <p className="text-[11px] leading-relaxed italic text-muted-foreground relative z-10">
                      "Batching orders for <strong>Nairobi West</strong> has reduced total fleet idle time by <strong>14%</strong> this period."
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
