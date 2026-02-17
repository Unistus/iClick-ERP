'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  RefreshCw, 
  Timer,
  Box,
  Scale,
  TrendingUp,
  Activity,
  ArrowRightLeft,
  Warehouse,
  History,
  ArrowUpRight,
  TrendingDown,
  BrainCircuit,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { format, isBefore, addDays } from "date-fns";
import Link from 'next/link';

export default function InventoryDashboardPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'products'), orderBy('updatedAt', 'desc'), limit(10));
  }, [db, selectedInstId]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const batchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'batches');
  }, [db, selectedInstId]);
  const { data: batches } = useCollection(batchesQuery);

  const movementsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'movements'), orderBy('timestamp', 'desc'), limit(10));
  }, [db, selectedInstId]);
  const { data: movements } = useCollection(movementsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // Calculations
  const totalStockItems = products?.filter(p => p.type === 'Stock').length || 0;
  const lowStockCount = products?.filter(p => p.type === 'Stock' && p.totalStock <= (p.reorderLevel || 0)).length || 0;
  
  const now = new Date();
  const criticalThreshold = addDays(now, 30);
  const expiryRiskCount = batches?.filter(b => isBefore(b.expiryDate?.toDate(), criticalThreshold)).length || 0;

  const totalAssetValue = products?.reduce((sum, p) => sum + ((p.totalStock || 0) * (p.costPrice || 0)), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-primary/20 text-primary">
              <Package className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Stock Vault Intelligence</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Institutional Inventory Command Hub</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/inventory/products">
              <Button size="sm" className="gap-2 h-10 text-xs font-bold uppercase shadow-lg shadow-primary/20">
                <Plus className="size-4" /> New Item
              </Button>
            </Link>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Zap className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize real-time supply chain monitoring.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* High-Level Pulse */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 opacity-5"><Box className="size-24" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Asset Valuation</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-bold">{currency} {totalAssetBase.toLocaleString()}</div>
                  <p className="text-[9px] text-emerald-500 font-bold uppercase mt-1">Estimated Book Value</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 opacity-5"><AlertTriangle className="size-24" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-destructive tracking-widest">Stock Outs</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-bold text-destructive">{lowStockCount} SKUs</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Below Reorder Point</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 opacity-5"><Timer className="size-24" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-accent tracking-widest">Expiry Risk</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-bold text-accent">{expiryRiskCount} Batches</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Expiring within 30D</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10"><RefreshCw className="size-24 animate-spin-slow" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Live Sync</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-bold text-primary">Active</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Streaming from Edge</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Recent Activity Stream */}
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Movement Velocity</CardTitle>
                    <CardDescription className="text-[10px]">Real-time audit trail of institutional stock flow.</CardDescription>
                  </div>
                  <Link href="/inventory/adjustments">
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase gap-1">View All <History className="size-3" /></Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {movements?.length === 0 ? (
                        <TableRow><TableCell className="text-center py-12 text-xs text-muted-foreground">No recent stock movements detected.</TableCell></TableRow>
                      ) : movements?.map((m) => (
                        <TableRow key={m.id} className="h-14 hover:bg-secondary/5 transition-colors group">
                          <TableCell className="pl-6 w-10">
                            <div className={`p-2 rounded shrink-0 ${
                              m.type === 'In' ? 'bg-emerald-500/10 text-emerald-500' : 
                              m.type === 'Out' ? 'bg-destructive/10 text-destructive' : 
                              'bg-primary/10 text-primary'
                            }`}>
                              {m.type === 'In' ? <TrendingUp className="size-3.5" /> : m.type === 'Out' ? <TrendingDown className="size-3.5" /> : <ArrowRightLeft className="size-3.5" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{products?.find(p => p.id === m.productId)?.name || 'Unknown Item'}</span>
                              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">{m.reference}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[8px] h-4 font-bold bg-background/50 border-none ring-1 ring-border uppercase">{m.type}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6 font-mono font-black text-xs">
                            {m.type === 'In' ? '+' : '-'}{m.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Quick Jump & Insights */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card">
                  <CardHeader className="pb-3 border-b border-border/10">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <BrainCircuit className="size-4 text-primary" /> Supply Chain Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold text-primary uppercase">Optimized Reorder</span>
                        <Zap className="size-3 text-primary animate-pulse" />
                      </div>
                      <p className="text-[11px] leading-relaxed italic text-muted-foreground">
                        "System detects high turnover in <strong>Amoxicillin</strong> at CBD branch. Recommending immediate 20% stock buffer increase."
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/inventory/stock-levels" className="w-full">
                        <Button variant="outline" className="w-full h-12 flex-col gap-1 bg-secondary/10">
                          <Warehouse className="size-4" />
                          <span className="text-[8px] font-bold uppercase">Stock Levels</span>
                        </Button>
                      </Link>
                      <Link href="/inventory/expiry" className="w-full">
                        <Button variant="outline" className="w-full h-12 flex-col gap-1 bg-secondary/10">
                          <Timer className="size-4" />
                          <span className="text-[8px] font-bold uppercase">Expiry Control</span>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border shadow-xl bg-card">
                  <CardHeader className="pb-3 border-b border-border/10">
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Inventory Setup Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Warehouses Registered</span>
                      <span className="font-bold">Active</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Valuation Logic</span>
                      <Badge variant="secondary" className="text-[8px] h-4 font-bold">{settings?.inventory?.valuationMethod || 'WeightedAvg'}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Price Lists Deployed</span>
                      <span className="font-bold">3 Tiers</span>
                    </div>
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
