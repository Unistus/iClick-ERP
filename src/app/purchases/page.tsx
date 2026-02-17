'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ShoppingCart, 
  Users2, 
  PackageCheck, 
  FileText, 
  ArrowUpRight, 
  TrendingDown, 
  Plus,
  History,
  Zap,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import Link from 'next/link';

export default function PurchasesOverviewPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const poQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'purchase_orders'), orderBy('createdAt', 'desc'), limit(5));
  }, [db, selectedInstId]);
  const { data: recentOrders } = useCollection(poQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
              <ShoppingCart className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Purchases Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Procurement Lifecycle Command</p>
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
            <Link href="/purchases/orders">
              <Button size="sm" className="gap-2 h-10 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId}>
                <Plus className="size-4" /> Raise PO
              </Button>
            </Link>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <ShoppingCart className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access procurement intelligence.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active POs</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-bold font-headline">14 ORDERS</div>
                  <p className="text-[9px] text-primary font-bold mt-1 uppercase">Awaiting Delivery</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-destructive tracking-widest">Payables</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-bold text-destructive font-headline">{currency} 1.2M</div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Due next 30 days</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Received (MTD)</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-bold text-emerald-500 font-headline">{currency} 4.8M</div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Physical Stock Value</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Lead Time</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-bold text-primary font-headline">4.2 DAYS</div>
                  <div className="flex items-center gap-1.5 mt-1 text-primary font-bold text-[9px] uppercase">
                    <TrendingDown className="size-3" /> Optimizing flow
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Procurement Pipeline</CardTitle>
                    <CardDescription className="text-[10px]">Real-time purchase orders and their status.</CardDescription>
                  </div>
                  <Link href="/purchases/orders">
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase gap-1">View All <History className="size-3" /></Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/10">
                    {recentOrders?.length === 0 ? (
                      <div className="p-12 text-center text-xs text-muted-foreground uppercase font-bold">No recent orders raised.</div>
                    ) : recentOrders?.map((po) => (
                      <div key={po.id} className="p-4 flex items-center justify-between hover:bg-secondary/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <ShoppingCart className="size-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase">{po.supplierName}</p>
                            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">{po.poNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black font-mono">{currency} {po.total?.toLocaleString()}</p>
                          <Badge variant="outline" className="text-[8px] h-4 mt-1 bg-background uppercase font-black">{po.status}</Badge>
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
                      <Zap className="size-4 text-primary" /> Tactical Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <Link href="/purchases/grn" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2"><PackageCheck className="size-4 text-emerald-500" /> GRN Hub</span>
                        <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                    <Link href="/purchases/invoices" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2"><FileText className="size-4 text-primary" /> Vendor Invoices</span>
                        <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                    <Link href="/purchases/suppliers" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2"><Users2 className="size-4 text-accent" /> Supplier Directory</span>
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