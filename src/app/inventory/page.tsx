'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Package, 
  AlertTriangle, 
  RefreshCw, 
  Timer,
  Box,
  TrendingUp,
  Activity,
  ArrowRightLeft,
  Warehouse,
  History,
  TrendingDown,
  BrainCircuit,
  Zap,
  LayoutGrid,
  Search,
  ShoppingCart,
  Banknote,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { isBefore, addDays } from "date-fns";
import Link from 'next/link';

export default function InventoryDashboardPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'products'), orderBy('updatedAt', 'desc'), limit(10));
  }, [db, selectedInstId]);
  const { data: products } = useCollection(productsQuery);

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

  const stockItems = products?.filter(p => p.type === 'Stock') || [];
  const lowStockCount = stockItems.filter(p => p.totalStock <= (p.reorderLevel || 0)).length;
  
  const now = new Date();
  const criticalThreshold = addDays(now, 30);
  const expiryRiskCount = batches?.filter(b => isBefore(b.expiryDate?.toDate(), criticalThreshold)).length || 0;

  const totalAssetBase = stockItems.reduce((sum, p) => sum + ((p.totalStock || 0) * (p.costPrice || 0)), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner">
              <LayoutGrid className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Inventory Pulse</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Institutional Supply Chain Intelligence</p>
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
              <Button size="sm" className="gap-2 h-10 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId}>
                <Plus className="size-4" /> Register Item
              </Button>
            </Link>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <RefreshCw className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize real-time supply chain monitoring.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative group hover:ring-primary/30 transition-all">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Banknote className="size-24" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Book Valuation</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold font-headline">{currency} {totalAssetBase.toLocaleString()}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-emerald-500 font-bold text-[9px] uppercase">
                    <TrendingUp className="size-3" /> Balanced Asset Base
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative group hover:ring-destructive/30 transition-all">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><AlertTriangle className="size-24" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-destructive tracking-widest">Out of Stock</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-destructive font-headline">{lowStockCount} SKUs</div>
                  <Progress value={lowStockCount > 0 ? 100 : 0} className="h-1 mt-2 [&>div]:bg-destructive" />
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative group hover:ring-accent/30 transition-all">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Timer className="size-24" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-accent tracking-widest">Expiry Risk</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-accent font-headline">{expiryRiskCount} Batches</div>
                  <div className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Expiring within 30D</div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10"><RefreshCw className="size-24" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Network Health</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-primary font-headline">99.8%</div>
                  <div className="flex items-center gap-1.5 mt-1 text-primary font-bold text-[9px] uppercase">
                    <CheckCircle2 className="size-3" /> Syncing from Edge
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Flow Velocity</CardTitle>
                    <CardDescription className="text-[10px]">Bidirectional audit trail of institutional stock movement.</CardDescription>
                  </div>
                  <Link href="/inventory/stock-levels">
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase gap-1">View Matrix <History className="size-3" /></Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {movements?.length === 0 ? (
                        <TableRow><TableCell className="text-center py-12 text-xs text-muted-foreground uppercase font-bold">No movement data detected.</TableCell></TableRow>
                      ) : movements?.map((m) => (
                        <TableRow key={m.id} className="h-14 hover:bg-secondary/5 transition-colors group">
                          <TableCell className="pl-6 w-10">
                            <div className={`p-2 rounded-lg shrink-0 ${
                              m.quantity > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                            }`}>
                              {m.quantity > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase">{products?.find(p => p.id === m.productId)?.name || 'Catalog Item'}</span>
                              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">{m.reference}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[8px] h-4 font-black bg-background/50 border-none ring-1 ring-border uppercase">{m.type}</Badge>
                          </TableCell>
                          <TableCell className={`text-right pr-6 font-mono font-black text-xs ${m.quantity > 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                            {m.quantity > 0 ? '+' : ''}{m.quantity.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <BrainCircuit className="size-4 text-primary" /> Supply Chain Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="p-4 bg-secondary/20 rounded-xl border border-border/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12"><Zap className="size-12 text-primary" /></div>
                      <p className="text-[11px] leading-relaxed italic font-medium relative z-10">
                        "Current turnover velocity indicates <span className="text-primary font-bold">Safety Stock</span> thresholds for Pharmacy category are optimal. Suggesting 5% buffer reduction on fast-movers to improve cash position."
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/inventory/stock-levels" className="w-full">
                        <Button variant="outline" className="w-full h-12 flex-col gap-1 bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border">
                          <Warehouse className="size-4 text-primary" />
                          <span className="text-[8px] font-black uppercase">Site Levels</span>
                        </Button>
                      </Link>
                      <Link href="/inventory/expiry" className="w-full">
                        <Button variant="outline" className="w-full h-12 flex-col gap-1 bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border">
                          <Timer className="size-4 text-accent" />
                          <span className="text-[8px] font-black uppercase">Expiry Map</span>
                        </Button>
                      </Link>
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