'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Navigation, 
  Zap, 
  CarFront,
  ArrowUpRight,
  TrendingUp,
  History,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function LogisticsDashboard() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  // 1. Data Fetching: Permitted Institutions (Access Control)
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const deliveriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'delivery_orders'), orderBy('updatedAt', 'desc'), limit(5));
  }, [db, selectedInstId]);
  const { data: recentDeliveries } = useCollection(deliveriesQuery);

  const driversQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'drivers');
  }, [db, selectedInstId]);
  const { data: drivers } = useCollection(driversQuery);

  const pendingDispatchQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'sales_invoices'), where('status', '==', 'Finalized'));
  }, [db, selectedInstId]);
  const { data: pendingDispatch } = useCollection(pendingDispatchQuery);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner">
              <Truck className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Logistics Pulse</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Fulfillment & Fleet Command</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder={instLoading ? "Resolving Access..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/delivery/dispatch">
              <Button size="sm" className="gap-2 h-10 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId}>
                <Zap className="size-4" /> Dispatch Center
              </Button>
            </Link>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Navigation className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize real-time logistics monitoring.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative group">
                <div className="absolute -right-4 -bottom-4 opacity-5"><Navigation className="size-24" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Trips</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold font-headline">{recentDeliveries?.filter(d => d.status === 'Dispatched').length || 0} ROUTES</div>
                  <p className="text-[9px] text-emerald-500 font-bold mt-1 uppercase">In-Transit Intelligence</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-accent tracking-widest">Pending Dispatch</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-accent font-headline">{pendingDispatch?.length || 0} INVOICES</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Awaiting vehicle assignment</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Available Fleet</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-primary font-headline">{drivers?.filter(d => d.status === 'Available').length || 0} DRIVERS</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Operational Readiness</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Fulfillment Rate</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-primary font-headline">94.2%</div>
                  <div className="flex items-center gap-1.5 mt-1 text-primary font-bold text-[9px] uppercase">
                    <TrendingUp className="size-3" /> Target: 98%
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Real-time Fulfillment Feed</CardTitle>
                    <CardDescription className="text-[10px]">Tracking dispatched assets and driver telemetry.</CardDescription>
                  </div>
                  <Link href="/delivery/orders">
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase gap-1">Full Ledger <History className="size-3" /></Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/10">
                    {recentDeliveries?.length === 0 ? (
                      <div className="p-12 text-center text-xs text-muted-foreground uppercase font-bold">No active deliveries.</div>
                    ) : recentDeliveries?.map((dl) => (
                      <div key={dl.id} className="p-4 flex items-center justify-between hover:bg-secondary/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`size-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0`}>
                            <Truck className="size-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase">{dl.deliveryNumber}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <MapPin className="size-3 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground truncate max-w-[200px]">{dl.destinationAddress}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={`text-[8px] h-4 uppercase font-black ${
                            dl.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-500 border-none' : 'bg-accent/10 text-accent border-accent/20'
                          }`}>
                            {dl.status}
                          </Badge>
                          <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold">{dl.driverId ? drivers?.find(d => d.id === dl.driverId)?.name : 'Unassigned'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <LayoutGrid className="size-4 text-primary" /> Logistics Operations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <Link href="/delivery/dispatch" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2"><Zap className="size-4 text-accent" /> Dispatch Hub</span>
                        <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                    <Link href="/delivery/fleet" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2"><CarFront className="size-4 text-primary" /> Fleet & Drivers</span>
                        <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                    <Link href="/delivery/confirmation" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /> Confirm Delivery</span>
                        <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
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
