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
  Loader2
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
  Cell
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Link from 'next/link';
import { aiFinancialInsights, type AiFinancialInsightsOutput } from "@/ai/flows/ai-financial-insights-flow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

const salesData = [
  { name: 'Mon', revenue: 45000, profit: 12000 },
  { name: 'Tue', revenue: 52000, profit: 15000 },
  { name: 'Wed', revenue: 48000, profit: 11000 },
  { name: 'Thu', revenue: 61000, profit: 18000 },
  { name: 'Fri', revenue: 55000, profit: 14000 },
  { name: 'Sat', revenue: 67000, profit: 21000 },
  { name: 'Sun', revenue: 42000, profit: 9000 },
]

const branchPerf = [
  { name: 'Nairobi CBD', value: 45 },
  { name: 'Westlands', value: 25 },
  { name: 'Mombasa', value: 20 },
  { name: 'Kisumu', value: 10 },
]

const COLORS = ['#008080', '#FF4500', '#10b981', '#f59e0b'];

export default function HomePage() {
  const db = useFirestore()
  const { user } = useUser()
  const [selectedInstId, setSelectedInstId] = useState<string>("")
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")
  const [activeTab, setActiveTab] = useState("overview")
  
  // AI Strategist State
  const [aiInsight, setAiInsight] = useState<AiFinancialInsightsOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState<string>("");

  // 1. Data Fetching: Permitted Institutions (Tenancy Control)
  const { institutions, isSuperAdmin, isLoading: instLoading } = usePermittedInstitutions();

  // 2. Data Fetching: Fiscal Periods
  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), orderBy('startDate', 'desc'));
  }, [db, selectedInstId]);
  const { data: periods } = useCollection(periodsQuery);

  // Auto-select current/latest period
  useEffect(() => {
    if (!selectedPeriodId && periods && periods.length > 0) {
      const active = periods.find(p => p.status === 'Open') || periods[0];
      setSelectedPeriodId(active.id);
    }
  }, [periods, selectedPeriodId]);

  const activePeriod = useMemo(() => periods?.find(p => p.id === selectedPeriodId), [periods, selectedPeriodId]);

  // 3. Data Fetching: Ledger Entries for selected period
  const entriesQuery = useMemoFirebase(() => {
    if (!selectedInstId || !activePeriod) return null;
    const start = new Date(activePeriod.startDate);
    const end = new Date(activePeriod.endDate);
    return query(
      collection(db, 'institutions', selectedInstId, 'journal_entries'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
  }, [db, selectedInstId, activePeriod]);
  const { data: entries } = useCollection(entriesQuery);

  // 4. Data Fetching: Account Types for categorization
  const coaQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'coa');
  }, [db, selectedInstId]);
  const { data: coa } = useCollection(coaQuery);

  // 5. Data Fetching: Products for Stock Value
  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'products');
  }, [db, selectedInstId]);
  const { data: products } = useCollection(productsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // AGGREGATION ENGINE: Derive stats from Real-time Ledger
  const metrics = useMemo(() => {
    if (!entries || !coa) return { revenue: 0, expenses: 0, profit: 0, transCount: 0, avg: 0 };

    let rev = 0;
    let exp = 0;
    let count = 0;

    entries.forEach(entry => {
      let entryIsSale = false;
      entry.items?.forEach((item: any) => {
        const acc = coa.find(a => a.id === item.accountId);
        if (acc?.type === 'Income' && item.type === 'Credit') {
          rev += item.amount;
          entryIsSale = true;
        }
        if (acc?.type === 'Expense' && item.type === 'Debit') {
          exp += item.amount;
        }
      });
      if (entryIsSale) count++;
    });

    return {
      revenue: rev,
      expenses: exp,
      profit: rev - exp,
      transCount: count,
      avg: count > 0 ? rev / count : 0
    };
  }, [entries, coa]);

  const stockValue = useMemo(() => {
    if (!products) return 0;
    return products.reduce((sum, p) => sum + ((p.totalStock || 0) * (p.costPrice || 0)), 0);
  }, [products]);

  const stats = [
    { title: "Gross Revenue", value: `${currency} ${metrics.revenue.toLocaleString()}`, change: "Period Total", trend: "up", icon: DollarSign },
    { title: "Net Profit", value: `${currency} ${metrics.profit.toLocaleString()}`, change: "Period Margin", trend: metrics.profit >= 0 ? "up" : "down", icon: TrendingUp },
    { title: "Stock Value", value: `${currency} ${stockValue.toLocaleString()}`, change: "Asset Base", trend: "up", icon: Package2 },
    { title: "Avg Transaction", value: `${currency} ${metrics.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: "Sales Logic", trend: "up", icon: Activity },
  ];

  // AI Strategist Integration
  const generateStrategistInsight = useCallback(async () => {
    if (!selectedInstId || isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      const salesContext = entries?.slice(0, 10).map(s => ({ ref: s.reference, desc: s.description })) || [];
      const inventoryContext = products?.slice(0, 20).map(p => ({ name: p.name, stock: p.totalStock })) || [];
      const accountingContext = coa?.map(a => ({ name: a.name, balance: a.balance })) || [];
      const agingContext = { period: activePeriod?.name || 'Current' };

      const res = await aiFinancialInsights({
        salesData: JSON.stringify(salesContext),
        inventoryData: JSON.stringify(inventoryContext),
        accountingData: JSON.stringify(accountingContext),
        budgetData: "[]",
        agingData: JSON.stringify(agingContext),
        userQuery: "Analyze the current fiscal performance and suggest one high-impact tactical action."
      });

      setAiInsight(res);
      setLastAuditTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Strategist failed:", e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedInstId, entries, products, coa, activePeriod, isAnalyzing]);

  useEffect(() => {
    if (selectedInstId && entries && coa) {
      generateStrategistInsight();
    }
  }, [selectedInstId, !!entries, !!coa, selectedPeriodId]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-headline font-bold">Command Center</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1 flex items-center gap-2">
              <ShieldCheck className="size-3 text-emerald-500" /> Multi-Tenant Intelligence Hub
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedInstId} onValueChange={(val) => { setSelectedInstId(val); setSelectedPeriodId(""); }}>
              <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder={instLoading ? "Loading Access..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId} disabled={!selectedInstId}>
              <SelectTrigger className="w-[180px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <Calendar className="size-3.5 mr-2 text-primary" />
                <SelectValue placeholder="Fiscal Period" />
              </SelectTrigger>
              <SelectContent>
                {periods?.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name} {p.status === 'Closed' ? '🔒' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Link href="/ai-insights">
              <Button size="sm" className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 h-9 font-bold text-[10px] uppercase">
                <BrainCircuit className="size-4" /> Strategist Hub
              </Button>
            </Link>
          </div>
        </div>

        {/* AI STRATEGIST CARD */}
        <Card className="border-none bg-gradient-to-r from-primary/10 via-background to-accent/5 ring-1 ring-primary/20 shadow-xl overflow-hidden group">
          <CardContent className="p-0 flex flex-col md:flex-row items-center min-h-[140px]">
            {!selectedInstId ? (
              <div className="p-6 flex-1 flex items-center gap-4 text-muted-foreground italic text-sm">
                <Sparkles className="size-5 opacity-20" />
                Select an institution to initialize the Autonomous Strategist.
              </div>
            ) : isAnalyzing ? (
              <div className="p-6 flex-1 flex items-center gap-4">
                <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] animate-pulse">Scanning System State</p>
                  <p className="text-xs text-muted-foreground">Aggregating cross-module telemetry...</p>
                </div>
              </div>
            ) : (
              <div className="p-6 flex-1 space-y-2 animate-in fade-in duration-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em]">
                    <Sparkles className="size-3 animate-pulse" /> Strategist Insight
                  </div>
                  {lastAuditTime && <span className="text-[8px] font-mono text-muted-foreground uppercase">Audit: {lastAuditTime}</span>}
                </div>
                <h2 className="text-lg font-bold leading-tight">
                  {aiInsight?.answerToQuery || "System stability verified across all cost centers."}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  {aiInsight?.summaryOfTrends || "Ready to provide tactical directives once significant data patterns are detected in your sales or inventory flows."}
                </p>
                <div className="pt-2 flex items-center gap-4">
                  <Link href="/ai-insights">
                    <Button variant="link" size="sm" className="text-primary p-0 h-auto font-bold text-[10px] uppercase gap-1 hover:gap-2 transition-all">
                      Full Intelligence Report <ChevronRight className="size-3" />
                    </Button>
                  </Link>
                  {aiInsight?.strategicActions?.[0] && (
                    <Link href={aiInsight.strategicActions[0].link}>
                      <Badge variant="secondary" className="h-6 gap-1.5 px-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-none cursor-pointer">
                        <Zap className="size-3" /> Recommended: {aiInsight.strategicActions[0].title}
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            )}
            <div className="p-6 bg-primary/5 md:bg-transparent flex flex-col items-center justify-center shrink-0 border-l border-primary/10">
              <RefreshCw 
                className={`size-12 text-primary/30 cursor-pointer transition-all duration-1000 ${isAnalyzing ? 'animate-spin' : 'group-hover:scale-110'}`} 
                onClick={generateStrategistInsight}
              />
              <p className="text-[8px] font-black uppercase mt-2 opacity-40">Predictive Engine v2.4</p>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-wrap justify-start gap-1">
            <TabsTrigger value="overview" className="text-xs gap-2"><LayoutDashboard className="size-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs gap-2"><BarChart3 className="size-3.5" /> Sales</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs gap-2"><Package className="size-3.5" /> Inventory</TabsTrigger>
            <TabsTrigger value="cashflow" className="text-xs gap-2"><History className="size-3.5" /> Cash Flow</TabsTrigger>
            <TabsTrigger value="tax" className="text-xs gap-2"><FileText className="size-3.5" /> Tax</TabsTrigger>
            <TabsTrigger value="branches" className="text-xs gap-2"><MapPin className="size-3.5" /> Branches</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs gap-2"><Users className="size-3.5" /> Staff</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs gap-2 relative">
              <BellRing className="size-3.5" /> Alerts
              <span className="absolute -top-1 -right-1 size-2 bg-destructive rounded-full" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.title} className="border-none bg-card shadow-xl ring-1 ring-border/50 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <stat.icon className="size-16" />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 relative z-10">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{stat.title}</CardTitle>
                    <stat.icon className="size-3.5 text-primary" />
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-lg font-bold font-headline">{stat.value}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {stat.trend === 'up' ? <ArrowUpRight className="size-3 text-emerald-500" /> : <ArrowDownLeft className="size-3 text-destructive" />}
                      <span className={`text-[10px] font-bold ${stat.trend === 'up' ? 'text-emerald-500' : 'text-destructive'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-7">
              <Card className="lg:col-span-4 bg-card border-none ring-1 ring-border/50 shadow-2xl">
                <CardHeader className="py-4 px-6 border-b border-border/10">
                  <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest">
                    <span>Revenue Flow & Profitability</span>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-primary" /> <span className="text-[9px]">Revenue</span></div>
                      <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-accent" /> <span className="text-[9px]">Net Profit</span></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorProfit" x1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v/1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '10px' }} />
                        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
                        <Area type="monotone" dataKey="profit" stroke="hsl(var(--accent))" fill="url(#colorProfit)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-3 bg-card border-none ring-1 ring-border/50 shadow-2xl">
                <CardHeader className="py-4 px-6 border-b border-border/10">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">Branch Contribution</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={branchPerf} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {branchPerf.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {branchPerf.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2"><div className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /> <span>{item.name}</span></div>
                        <span className="font-bold font-mono">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
