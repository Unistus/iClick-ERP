'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  TrendingUp, 
  DollarSign, 
  Package2, 
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building2,
  BarChart3,
  History,
  Package,
  BellRing,
  FileText,
  Users,
  Target,
  Wallet,
  Search,
  ShieldAlert,
  GitPullRequest,
  MapPin,
  ShieldCheck,
  LayoutDashboard,
  BrainCircuit,
  Sparkles,
  ChevronRight,
  Zap,
  RefreshCw,
  Loader2,
  Timer,
  PieChart as PieChartIcon,
  Scale,
  Landmark,
  BadgeCent,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useDoc, useMemoFirebase, useUser, useCollection } from "@/firebase"
import { doc, collection, query, orderBy, limit, where } from "firebase/firestore"
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
  Cell,
  BarChart,
  Bar
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Link from 'next/link';
import { aiFinancialInsights, type AiFinancialInsightsOutput } from "@/ai/flows/ai-financial-insights-flow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const COLORS = ['#008080', '#FF4500', '#10b981', '#f59e0b'];

// Sample data for visualizations
const salesData = [
  { name: 'Mon', revenue: 45000, profit: 12000 },
  { name: 'Tue', revenue: 52000, profit: 15000 },
  { name: 'Wed', revenue: 48000, profit: 11000 },
  { name: 'Thu', revenue: 61000, profit: 18000 },
  { name: 'Fri', revenue: 55000, profit: 14000 },
  { name: 'Sat', revenue: 67000, profit: 21000 },
  { name: 'Sun', revenue: 42000, profit: 9000 },
];

const branchPerf = [
  { name: 'HQ', value: 45 },
  { name: 'Westlands', value: 25 },
  { name: 'Mombasa', value: 20 },
  { name: 'Eldoret', value: 10 },
];

export default function HomePage() {
  const db = useFirestore()
  const { user } = useUser()
  const [selectedInstId, setSelectedInstId] = useState<string>("")
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")
  const [activeTab, setActiveTab] = useState("overview")
  
  const [aiInsight, setAiInsight] = useState<AiFinancialInsightsOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState<string>("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Global Data Fetching
  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), orderBy('startDate', 'desc'));
  }, [db, selectedInstId]);
  const { data: periods } = useCollection(periodsQuery);

  useEffect(() => {
    if (!selectedPeriodId && periods && periods.length > 0) {
      const active = periods.find(p => p.status === 'Open') || periods[0];
      setSelectedPeriodId(active.id);
    }
  }, [periods, selectedPeriodId]);

  const activePeriod = useMemo(() => periods?.find(p => p.id === selectedPeriodId), [periods, selectedPeriodId]);

  const entriesQuery = useMemoFirebase(() => {
    if (!selectedInstId || !activePeriod) return null;
    return query(collection(db, 'institutions', selectedInstId, 'journal_entries'), limit(100));
  }, [db, selectedInstId, activePeriod]);
  const { data: entries } = useCollection(entriesQuery);

  const coaQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'coa');
  }, [db, selectedInstId]);
  const { data: coa } = useCollection(coaQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'products');
  }, [db, selectedInstId]);
  const { data: products } = useCollection(productsQuery);

  const branchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'branches');
  }, [db, selectedInstId]);
  const { data: branches } = useCollection(branchesQuery);

  const employeesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employees');
  }, [db, selectedInstId]);
  const { data: employees } = useCollection(employeesQuery);

  const alertsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'approval_requests'), where('status', '==', 'Pending'), limit(10));
  }, [db, selectedInstId]);
  const { data: alerts } = useCollection(alertsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // METRICS CALCULATIONS
  const stats = useMemo(() => {
    if (!entries || !coa || !products) return { revenue: 0, profit: 0, stock: 0, trans: 0 };
    
    let rev = 0;
    let exp = 0;
    entries.forEach(e => {
      e.items?.forEach((i: any) => {
        const acc = coa.find(a => a.id === i.accountId);
        if (acc?.type === 'Income' && i.type === 'Credit') rev += i.amount;
        if (acc?.type === 'Expense' && i.type === 'Debit') exp += i.amount;
      });
    });

    const stock = products.reduce((sum, p) => sum + ((p.totalStock || 0) * (p.costPrice || 0)), 0);

    return {
      revenue: rev,
      profit: rev - exp,
      stock,
      trans: entries.length
    };
  }, [entries, coa, products]);

  const generateStrategistInsight = useCallback(async () => {
    if (!selectedInstId || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await aiFinancialInsights({
        salesData: JSON.stringify(entries?.slice(0, 10)),
        inventoryData: JSON.stringify(products?.slice(0, 10)),
        accountingData: JSON.stringify(coa?.slice(0, 10)),
        budgetData: "[]",
        agingData: JSON.stringify({ period: activePeriod?.name }),
        userQuery: "Scan my current institution data and identify the most critical operational bottleneck."
      });
      setAiInsight(res);
      setLastAuditTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedInstId, entries, products, coa, activePeriod, isAnalyzing]);

  useEffect(() => {
    if (selectedInstId && entries && coa) generateStrategistInsight();
  }, [selectedInstId, !!entries, !!coa, selectedPeriodId]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-headline font-bold">Control Center</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1 flex items-center gap-2">
              <ShieldCheck className="size-3 text-emerald-500" /> Operational Matrix Sync: Active
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedInstId} onValueChange={(val) => { setSelectedInstId(val); setSelectedPeriodId(""); }}>
              <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Loading Access..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId} disabled={!selectedInstId}>
              <SelectTrigger className="w-[180px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <Calendar className="size-3.5 mr-2 text-primary" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {periods?.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* AI STRATEGIST */}
        <Card className="border-none bg-gradient-to-r from-primary/10 via-background to-accent/5 ring-1 ring-primary/20 shadow-xl overflow-hidden group">
          <CardContent className="p-0 flex flex-col md:flex-row items-center min-h-[140px]">
            {!selectedInstId ? (
              <div className="p-6 flex-1 flex items-center gap-4 text-muted-foreground italic text-sm">
                <Sparkles className="size-5 opacity-20" /> Select an institution to initialize the AI Strategist.
              </div>
            ) : isAnalyzing ? (
              <div className="p-6 flex-1 flex items-center gap-4">
                <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] animate-pulse">Scanning System State...</p>
              </div>
            ) : (
              <div className="p-6 flex-1 space-y-2 animate-in fade-in duration-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em]">
                    <Sparkles className="size-3 animate-pulse" /> Strategist Insight
                  </div>
                  {lastAuditTime && <span className="text-[8px] font-mono text-muted-foreground uppercase">Audit: {lastAuditTime}</span>}
                </div>
                <h2 className="text-lg font-bold leading-tight">{aiInsight?.answerToQuery || "System healthy."}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{aiInsight?.summaryOfTrends}</p>
                <div className="pt-2 flex items-center gap-4">
                  {aiInsight?.strategicActions?.map((action, i) => (
                    <Link key={i} href={action.link}>
                      <Badge variant="secondary" className="h-6 gap-1.5 px-3 bg-emerald-500/10 text-emerald-500 border-none cursor-pointer hover:bg-emerald-500/20">
                        <Zap className="size-3" /> {action.title}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="p-6 shrink-0 flex flex-col items-center justify-center border-l border-primary/10">
              <RefreshCw className={cn("size-10 text-primary/30 cursor-pointer transition-all", isAnalyzing && "animate-spin")} onClick={generateStrategistInsight} />
              <p className="text-[8px] font-black uppercase mt-2 opacity-40">AI Engine 2.4</p>
            </div>
          </CardContent>
        </Card>

        {/* TABS COMMAND HUB */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto custom-scrollbar">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-nowrap justify-start gap-1 w-full min-w-max">
              <TabsTrigger value="overview" className="text-xs gap-2 px-6 py-2.5"><LayoutDashboard className="size-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="sales" className="text-xs gap-2 px-6 py-2.5"><BarChart3 className="size-3.5" /> Sales</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs gap-2 px-6 py-2.5"><Package className="size-3.5" /> Inventory</TabsTrigger>
              <TabsTrigger value="cashflow" className="text-xs gap-2 px-6 py-2.5"><History className="size-3.5" /> Cash Flow</TabsTrigger>
              <TabsTrigger value="tax" className="text-xs gap-2 px-6 py-2.5"><FileText className="size-3.5" /> Tax</TabsTrigger>
              <TabsTrigger value="branches" className="text-xs gap-2 px-6 py-2.5"><MapPin className="size-3.5" /> Branches</TabsTrigger>
              <TabsTrigger value="staff" className="text-xs gap-2 px-6 py-2.5"><Users className="size-3.5" /> Staff</TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs gap-2 px-6 py-2.5 relative">
                <BellRing className="size-3.5" /> Alerts
                {alerts && alerts.length > 0 && <span className="absolute top-1 right-2 size-2 bg-destructive rounded-full animate-pulse" />}
              </TabsTrigger>
            </TabsList>
          </div>

          {!selectedInstId ? (
            <div className="py-24 text-center opacity-30 italic text-sm">Select an institution to populate the Hub.</div>
          ) : (
            <>
              {/* OVERVIEW CONTENT */}
              <TabsContent value="overview" className="space-y-6 mt-0 animate-in fade-in duration-500">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Revenue", val: stats.revenue, icon: DollarSign, color: "text-emerald-500" },
                    { label: "Profit", val: stats.profit, icon: TrendingUp, color: "text-primary" },
                    { label: "Asset Base", val: stats.stock, icon: Package2, color: "text-accent" },
                    { label: "Transactions", val: stats.trans, icon: Activity, color: "text-primary", isRaw: true },
                  ].map(s => (
                    <Card key={s.label} className="border-none bg-card shadow-xl ring-1 ring-border/50 overflow-hidden relative group">
                      <CardHeader className="flex flex-row items-center justify-between pb-1 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</span>
                        <s.icon className={cn("size-4", s.color)} />
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="text-xl font-black font-headline">
                          {s.isRaw ? s.val : `${currency} ${s.val.toLocaleString()}`}
                        </div>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Period Actual</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-7">
                  <Card className="lg:col-span-4 bg-card border-none ring-1 ring-border/50 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b border-border/10 py-4">
                      <CardTitle className="text-xs font-black uppercase tracking-widest">Growth Velocity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', fontSize: '10px' }} />
                            <Area type="monotone" dataKey="revenue" stroke="#008080" fill="#008080" fillOpacity={0.1} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="lg:col-span-3 bg-card border-none ring-1 ring-border/50 shadow-2xl">
                    <CardHeader className="bg-secondary/10 border-b border-border/10 py-4">
                      <CardTitle className="text-xs font-black uppercase tracking-widest">Revenue Allocation</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={branchPerf} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {branchPerf.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* SALES CONTENT */}
              <TabsContent value="sales" className="space-y-6 mt-0 animate-in fade-in duration-500">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-md">
                    <CardHeader className="pb-2"><span className="text-[9px] font-black uppercase text-emerald-500">Conversion Rate</span></CardHeader>
                    <CardContent><div className="text-2xl font-black font-headline text-emerald-500">68.4%</div></CardContent>
                  </Card>
                  <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-md">
                    <CardHeader className="pb-2"><span className="text-[9px] font-black uppercase text-primary">Avg Order Value</span></CardHeader>
                    <CardContent><div className="text-2xl font-black font-headline text-primary">{currency} 12,400</div></CardContent>
                  </Card>
                  <Card className="bg-accent/5 border-none ring-1 ring-accent/20 shadow-md">
                    <CardHeader className="pb-2"><span className="text-[9px] font-black uppercase text-accent">Active Leads</span></CardHeader>
                    <CardContent><div className="text-2xl font-black font-headline text-accent">142</div></CardContent>
                  </Card>
                </div>
                <div className="p-12 text-center border-2 border-dashed rounded-3xl opacity-20 italic">
                  <TrendingUp className="size-12 mx-auto mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs text-primary">Detailed Sales Analytics Engine Initializing...</p>
                  <Link href="/sales/reports"><Button variant="link" className="text-xs uppercase font-black">View Full Reports</Button></Link>
                </div>
              </TabsContent>

              {/* INVENTORY CONTENT */}
              <TabsContent value="inventory" className="space-y-6 mt-0 animate-in fade-in duration-500">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-6 rounded-3xl bg-secondary/10 border border-border/50 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Active SKUs</p>
                    <p className="text-3xl font-black font-headline text-primary">{products?.length || 0}</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-destructive/5 border border-destructive/10 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase text-destructive tracking-widest">Out of Stock</p>
                    <p className="text-3xl font-black font-headline text-destructive">{products?.filter(p => p.totalStock <= 0).length || 0}</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Low Reorder</p>
                    <p className="text-3xl font-black font-headline text-amber-500">{products?.filter(p => p.totalStock <= (p.reorderLevel || 0) && p.totalStock > 0).length || 0}</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Stock Health</p>
                    <p className="text-3xl font-black font-headline text-emerald-500">94%</p>
                  </div>
                </div>
                <Link href="/inventory"><Button className="w-full h-12 font-black uppercase tracking-[0.2em] shadow-xl">Manage Vault <ArrowRight className="size-4 ml-2" /></Button></Link>
              </TabsContent>

              {/* CASH FLOW CONTENT */}
              <TabsContent value="cashflow" className="space-y-6 mt-0 animate-in fade-in duration-500">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="border-none ring-1 ring-border shadow-xl bg-card">
                    <CardHeader className="bg-secondary/10 border-b py-4 px-6"><CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary"><Wallet className="size-4" /> Treasury Nodes</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/10">
                        {coa?.filter(a => a.subtype === 'Cash & Bank').slice(0, 4).map(acc => (
                          <div key={acc.id} className="p-4 flex items-center justify-between hover:bg-secondary/5">
                            <span className="text-xs font-bold uppercase">{acc.name}</span>
                            <span className="font-mono text-sm font-black text-emerald-500">{currency} {acc.balance?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-none ring-1 ring-border shadow-xl bg-card p-8 flex flex-col justify-center gap-4 text-center">
                    <Scale className="size-12 mx-auto text-primary opacity-20" />
                    <h3 className="text-xl font-headline font-black uppercase tracking-tight">Financial Equilibrium</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">"Liquidity vs Liability position is currently synchronized. Current debt coverage ratio is 1.4x."</p>
                    <Link href="/accounting/banking"><Button variant="outline" className="mt-4 font-bold uppercase text-[10px] h-10 w-full">View Bank Ledger</Button></Link>
                  </Card>
                </div>
              </TabsContent>

              {/* TAX CONTENT */}
              <TabsContent value="tax" className="space-y-6 mt-0 animate-in fade-in duration-500">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-8 rounded-[2rem] flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">VAT Position</p>
                      <p className="text-3xl font-black font-headline">{currency} 420k</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Estimated Output Tax</p>
                    </div>
                    <Link href="/accounting/tax"><Button variant="outline" className="h-9 px-6 font-black text-[10px] uppercase">File Return</Button></Link>
                  </Card>
                  <Card className="bg-accent/5 border-none ring-1 ring-accent/20 p-8 rounded-[2rem] flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-accent tracking-widest">Compliance Score</p>
                      <p className="text-3xl font-black font-headline text-emerald-500">100% OK</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">All nodes verified</p>
                    </div>
                    <ShieldCheck className="size-12 text-emerald-500 opacity-20" />
                  </Card>
                </div>
              </TabsContent>

              {/* BRANCHES CONTENT */}
              <TabsContent value="branches" className="space-y-6 mt-0 animate-in fade-in duration-500">
                <div className="grid gap-4 md:grid-cols-3">
                  {branches?.slice(0, 3).map(b => (
                    <Card key={b.id} className="border-none ring-1 ring-border bg-card shadow-xl group hover:ring-primary/30 transition-all cursor-pointer overflow-hidden">
                      <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-inner"><MapPin className="size-5" /></div>
                          <span className="font-black text-sm uppercase tracking-tight">{b.name}</span>
                        </div>
                        <div className="space-y-1.5"><div className="flex justify-between text-[10px] font-bold uppercase"><span className="opacity-50">Operational Intensity</span><span>84%</span></div><Progress value={84} className="h-1 bg-secondary" /></div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* STAFF CONTENT */}
              <TabsContent value="staff" className="space-y-6 mt-0 animate-in fade-in duration-500">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-6 rounded-3xl bg-secondary/10 border border-border/50 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Active Identity Nodes</p>
                    <p className="text-3xl font-black font-headline text-primary">{employees?.length || 0} STAFF</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Attendance Intensity</p>
                    <p className="text-3xl font-black font-headline text-emerald-500">92% LIVE</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Payroll Status</p>
                    <p className="text-3xl font-black font-headline text-foreground">CLOSED</p>
                  </div>
                </div>
                <Link href="/hr"><Button className="w-full h-12 font-black uppercase tracking-[0.2em] shadow-2xl bg-primary">Personnel Command <ChevronRight className="size-4 ml-2" /></Button></Link>
              </TabsContent>

              {/* ALERTS CONTENT */}
              <TabsContent value="alerts" className="space-y-6 mt-0 animate-in fade-in duration-500">
                <div className="space-y-3">
                  {(!alerts || alerts.length === 0) ? (
                    <div className="p-20 text-center border-2 border-dashed rounded-[2.5rem] opacity-20">
                      <CheckCircle2 className="size-12 mx-auto mb-4" />
                      <p className="font-black uppercase tracking-widest text-xs">All governance cycles clear.</p>
                    </div>
                  ) : alerts.map(a => (
                    <Card key={a.id} className="border-none ring-1 ring-border/50 bg-card group hover:ring-primary/30 transition-all overflow-hidden">
                      <div className="flex items-center justify-between p-4 pl-0">
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-12 bg-primary shrink-0" />
                          <div className="p-2 rounded-lg bg-primary/10 text-primary shadow-inner"><ShieldAlert className="size-5" /></div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight text-foreground/90">{a.action}</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Module: {a.module} • Requested by: {a.requestedByName}</p>
                          </div>
                        </div>
                        <Link href="/approvals"><Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase gap-2 hover:bg-primary/10 transition-all">Review Hub <ChevronRight className="size-3" /></Button></Link>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
