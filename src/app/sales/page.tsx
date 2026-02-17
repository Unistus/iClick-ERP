'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  ShoppingCart, 
  PackageCheck, 
  History, 
  ArrowUpRight, 
  CheckCircle2, 
  Zap, 
  BrainCircuit,
  FileText,
  Users,
  Wallet,
  Plus,
  ArrowDownLeft,
  DollarSign,
  Activity,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import Link from 'next/link';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell
} from 'recharts';

const salesData = [
  { name: 'Mon', revenue: 45000, profit: 12000 },
  { name: 'Tue', revenue: 52000, profit: 15000 },
  { name: 'Wed', revenue: 48000, profit: 11000 },
  { name: 'Thu', revenue: 61000, profit: 18000 },
  { name: 'Fri', revenue: 55000, profit: 14000 },
  { name: 'Sat', revenue: 67000, profit: 21000 },
  { name: 'Sun', revenue: 42000, profit: 9000 },
];

const COLORS = ['#008080', '#FF4500', '#10b981', '#f59e0b'];

export default function SalesOverviewPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

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
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner">
              <ShoppingCart className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Sales Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Institutional Revenue & Distribution Hub</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={selectedInstId} 
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold rounded-md px-3"
            >
              <option value="">Select Institution</option>
              {institutions?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <Link href="/sales/invoices">
              <Button size="sm" className="gap-2 h-10 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId}>
                <Plus className="size-4" /> Issue Invoice
              </Button>
            </Link>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <TrendingUp className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access live sales metrics.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Monthly Revenue</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold font-headline text-emerald-500">{currency} 4.2M</div>
                  <div className="flex items-center gap-1.5 mt-1 text-emerald-500 font-bold text-[9px] uppercase">
                    <ArrowUpRight className="size-3" /> +12% Growth
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative group hover:ring-accent/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-accent tracking-widest">Pending Orders</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-accent font-headline">12 ORDERS</div>
                  <div className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Awaiting fulfillment</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Conversion Rate</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-primary font-headline">68%</div>
                  <div className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Quotes to Invoices</div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">A/R Position</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-primary font-headline">{currency} 840k</div>
                  <div className="flex items-center gap-1.5 mt-1 text-primary font-bold text-[9px] uppercase">
                    <History className="size-3" /> Debt Collection
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Closed-Sales Velocity</CardTitle>
                    <CardDescription className="text-[10px]">Real-time finalized invoice stream.</CardDescription>
                  </div>
                  <Link href="/sales/reports">
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase gap-1">Full Ledger <ArrowUpRight className="size-3" /></Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v/1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '10px' }} />
                        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <BrainCircuit className="size-4 text-primary" /> Sales Strategist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="p-4 bg-secondary/20 rounded-xl border border-border/50 relative overflow-hidden">
                      <p className="text-[11px] leading-relaxed italic font-medium relative z-10 text-muted-foreground">
                        "Your <span className="text-primary font-bold">Westlands</span> branch is seeing a 15% uptick in credit sales. Recommendation: Trigger automated reminders for invoices past 14 days to preserve liquidity."
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/sales/quotations" className="w-full">
                        <Button variant="outline" className="w-full h-12 flex-col gap-1 bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border">
                          <FileText className="size-4 text-primary" />
                          <span className="text-[8px] font-black uppercase">Open Quotes</span>
                        </Button>
                      </Link>
                      <Link href="/sales/commissions" className="w-full">
                        <Button variant="outline" className="w-full h-12 flex-col gap-1 bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border">
                          <Users className="size-4 text-accent" />
                          <span className="text-[8px] font-black uppercase">Commission</span>
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
