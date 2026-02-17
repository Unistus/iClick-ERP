'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Navigation, 
  Search, 
  RefreshCw, 
  MapPin, 
  Truck, 
  Zap, 
  Activity, 
  ShieldCheck,
  Clock,
  CarFront,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { format } from "date-fns";

export default function DeliveryTrackingPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isPolling, setIsPolling] = useState(false);
  const [ping, setPing] = useState(0);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const deliveriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'delivery_orders'), where('status', '==', 'Dispatched'));
  }, [db, selectedInstId]);
  const { data: activeTrips, isLoading } = useCollection(deliveriesQuery);

  useEffect(() => {
    const interval = setInterval(() => {
      setPing(prev => (prev + 1) % 100);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualPoll = () => {
    setIsPolling(true);
    setTimeout(() => setIsPolling(false), 800);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner">
              <Navigation className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Live Fleet Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Real-time GPS Telemetry & Arrival ETA</p>
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

            <Button size="sm" variant="outline" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId || isPolling} onClick={handleManualPoll}>
              {isPolling ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Poll Satellite
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Navigation className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to track live shipments.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden h-[500px] relative">
                <div className="absolute inset-0 bg-secondary/10 flex flex-col items-center justify-center opacity-30">
                  <div className="size-64 rounded-full border-4 border-dashed border-primary/20 animate-[spin_20s_linear_infinite]" />
                  <MapPin className="size-12 text-primary mt-[-160px]" />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Vector Map Layer Initializing...</p>
                </div>
                
                {activeTrips?.map((trip, idx) => (
                  <div key={trip.id} className="absolute p-2 bg-background border rounded-lg shadow-xl" style={{ top: `${20 + (idx * 15)}%`, left: `${30 + (idx * 10)}%` }}>
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-bold uppercase">{trip.deliveryNumber}</span>
                    </div>
                  </div>
                ))}

                <div className="absolute bottom-4 left-4 p-3 bg-card border rounded-lg shadow-2xl space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                    <ShieldCheck className="size-3 text-emerald-500" /> System Encrypted
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Activity className="size-3 text-primary" /> Latency: 24ms
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Active Satellites</p>
                    <div className="text-lg font-bold">14 ONLINE</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-1">Fleet Occupancy</p>
                    <div className="text-lg font-bold">84.2%</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-[9px] font-black uppercase text-accent tracking-widest mb-1">Avg Idle Time</p>
                    <div className="text-lg font-bold">12 MINS</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-xl bg-card flex flex-col overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Active Stream</CardTitle>
                <Badge variant="outline" className="text-[8px] h-4 bg-primary/10 text-primary uppercase font-bold">Real-time</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1">
                <div className="divide-y divide-border/10">
                  {activeTrips?.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted-foreground opacity-30 italic">No shipments in transit.</div>
                  ) : activeTrips?.map((trip) => (
                    <div key={trip.id} className="p-4 hover:bg-secondary/5 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] font-black text-primary uppercase">{trip.deliveryNumber}</span>
                        <span className="text-[8px] text-muted-foreground uppercase">{trip.dispatchedAt?.toDate ? format(trip.dispatchedAt.toDate(), 'HH:mm') : '...'}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-primary/10 text-primary shrink-0"><CarFront className="size-4" /></div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold truncate uppercase">{trip.destinationAddress}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="size-2.5 text-muted-foreground" />
                            <span className="text-[9px] text-muted-foreground font-bold">ETA: 45 MINS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <div className="p-4 bg-secondary/20 border-t border-border/50 shrink-0">
                <Button variant="outline" className="w-full h-9 text-[10px] font-bold uppercase gap-2 bg-background border-none ring-1 ring-border group">
                  Full Logistics Map <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}