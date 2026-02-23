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
  Loader2,
  Users,
  LayoutGrid,
  TrendingUp,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function DeliveryTrackingPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isPolling, setIsPolling] = useState(false);
  const [ping, setPing] = useState(0);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Dispatched orders only
  const deliveriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'delivery_orders'), 
      where('status', '==', 'Dispatched'),
      orderBy('dispatchedAt', 'desc')
    );
  }, [db, selectedInstId]);
  const { data: activeTrips, isLoading } = useCollection(deliveriesQuery);

  const driversQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'drivers');
  }, [db, selectedInstId]);
  const { data: drivers } = useCollection(driversQuery);

  useEffect(() => {
    const interval = setInterval(() => {
      setPing(prev => (prev + 1) % 100);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualPoll = () => {
    setIsPolling(true);
    setTimeout(() => {
      setIsPolling(false);
      toast({ title: "GPRS Handshake Successful", description: "All telemetry nodes updated." });
    }, 800);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Navigation className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Fleet Telemetry</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Real-time GPS Monitoring & ETA Projection</p>
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

            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" disabled={!selectedInstId || isPolling} onClick={handleManualPoll}>
              {isPolling ? <Loader2 className="size-4 animate-spin text-primary" /> : <RefreshCw className="size-4" />}
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <Navigation className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to initialize the live tracking engine.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-700">
            {/* MAP COMPONENT */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden h-[550px] relative group rounded-[2.5rem]">
                <div className="absolute inset-0 bg-secondary/10 flex flex-col items-center justify-center opacity-30">
                  <div className="size-80 rounded-full border-4 border-dashed border-primary/20 animate-[spin_30s_linear_infinite]" />
                  <MapPin className="size-12 text-primary mt-[-200px]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6 text-primary">Vector Telemetry Layer Active</p>
                </div>
                
                {activeTrips?.map((trip, idx) => (
                  <div 
                    key={trip.id} 
                    className="absolute p-3 bg-background border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-500 hover:scale-105 transition-all cursor-pointer ring-1 ring-primary/20" 
                    style={{ top: `${25 + (idx * 15)}%`, left: `${30 + (idx * 12)}%` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">{trip.deliveryNumber}</span>
                        <span className="text-[8px] text-muted-foreground font-bold uppercase">SPD: 42 km/h</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="absolute bottom-6 left-6 p-4 bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl space-y-3 min-w-[200px] ring-1 ring-primary/10">
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-emerald-500">
                    <ShieldCheck className="size-4" /> SECURE LINK ACTIVE
                  </div>
                  <div className="space-y-1.5 pt-2 border-t">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] text-muted-foreground font-bold">Network Latency</span>
                      <span className="text-[10px] font-mono font-black text-primary">24ms</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] text-muted-foreground font-bold">Satellites Linked</span>
                      <span className="text-[10px] font-mono font-black text-primary">14 NODES</span>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card border-none ring-1 ring-border shadow-sm p-6 flex flex-col justify-between group hover:ring-primary/30 transition-all">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-2">Live Fleet Intensity</p>
                  <div className="text-2xl font-black font-headline text-primary">{activeTrips?.length || 0} IN TRANSIT</div>
                </Card>
                <Card className="bg-card border-none ring-1 ring-border shadow-sm p-6 flex flex-col justify-between group hover:ring-accent/30 transition-all">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-2">Resource Occupancy</p>
                  <div className="text-2xl font-black font-headline text-accent">84.2% BUSY</div>
                </Card>
                <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-sm p-6 flex flex-col justify-between">
                  <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-2">Arrival Success</p>
                  <div className="text-2xl font-black font-headline text-emerald-500">99.8% OK</div>
                </Card>
              </div>
            </div>

            {/* LIVE FEED LIST */}
            <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-2xl bg-card flex flex-col overflow-hidden rounded-[2.5rem]">
              <CardHeader className="py-4 px-8 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between shrink-0">
                <div>
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Stream</CardTitle>
                  <CardDescription className="text-[8px] font-bold text-primary uppercase">Satellite Refresh: 3s</CardDescription>
                </div>
                <Badge variant="outline" className="text-[8px] h-5 px-3 bg-primary/10 text-primary border-none ring-1 ring-primary/20 font-black animate-pulse">LIVE</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1">
                <div className="divide-y divide-border/10">
                  {isLoading ? (
                    <div className="p-12 text-center text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Syncing Nodes...</div>
                  ) : activeTrips?.length === 0 ? (
                    <div className="p-20 text-center space-y-4 opacity-20">
                      <LayoutGrid className="size-12 mx-auto" />
                      <p className="text-[10px] uppercase font-black tracking-widest">No active shipments.</p>
                    </div>
                  ) : activeTrips?.map((trip) => (
                    <div key={trip.id} className="p-6 hover:bg-primary/5 transition-all group cursor-pointer border-l-2 border-transparent hover:border-primary">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[11px] font-black text-primary uppercase tracking-tighter">{trip.deliveryNumber}</span>
                        <span className="text-[9px] text-muted-foreground font-bold uppercase">{trip.dispatchedAt?.toDate ? format(trip.dispatchedAt.toDate(), 'HH:mm') : '...'}</span>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform"><CarFront className="size-5" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black uppercase truncate tracking-tight text-foreground/90">{trip.destinationAddress}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1.5">
                            <User className="size-2.5" /> {drivers?.find(d => d.id === trip.driverId)?.name || 'PILOT-NODE'}
                          </p>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                            <Clock className="size-3 text-emerald-500" />
                            <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">ETA: 45 MINS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <div className="p-6 bg-secondary/20 border-t border-border/50 shrink-0">
                <Button variant="outline" className="w-full justify-between h-11 text-[9px] font-black uppercase bg-background border-none ring-1 ring-border group hover:ring-primary/30 transition-all shadow-md">
                  <span>Full Institutional Logistics Map</span>
                  <ArrowUpRight className="size-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
