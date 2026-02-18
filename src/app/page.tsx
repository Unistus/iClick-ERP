'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [activeTab, setActiveTab] = useState("overview")
  
  // AI Strategist State
  const [aiInsight, setAiInsight] = useState<AiFinancialInsightsOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState<string>("");

  // Data Fetching for Dashboard & AI Context
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // Context Data for Strategist
  const productsQuery = useMemoFirebase(() => selectedInstId ? collection(db, 'institutions', selectedInstId, 'products') : null, [db, selectedInstId]);
  const { data: products } = useCollection(productsQuery);

  const coaQuery = useMemoFirebase(() => selectedInstId ? collection(db, 'institutions', selectedInstId, 'coa') : null, [db, selectedInstId]);
  const { data: coa } = useCollection(coaQuery);

  const salesQuery = useMemoFirebase(() => selectedInstId ? query(collection(db, 'institutions', selectedInstId, 'journal_entries'), orderBy('date', 'desc'), limit(10)) : null, [db, selectedInstId]);
  const { data: recentSales } = useCollection(salesQuery);

  const arQuery = useMemoFirebase(() => selectedInstId ? query(collection(db, 'institutions', selectedInstId, 'invoices'), where('status', '!=', 'Paid')) : null, [db, selectedInstId]);
  const { data: openInvoices } = useCollection(arQuery);

  const apQuery = useMemoFirebase(() => selectedInstId ? query(collection(db, 'institutions', selectedInstId, 'payables'), where('status', '!=', 'Paid')) : null, [db, selectedInstId]);
  const { data: openBills } = useCollection(apQuery);

  const generateStrategistInsight = useCallback(async () => {
    if (!selectedInstId || isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      const salesContext = recentSales?.map(s => ({ ref: s.reference, desc: s.description, date: s.date?.toDate?.()?.toISOString() })) || [];
      const inventoryContext = products?.map(p => ({ name: p.name, stock: p.totalStock, reorder: p.reorderLevel })) || [];
      const accountingContext = coa?.map(a => ({ name: a.name, type: a.type, balance: a.balance })) || [];
      const budgetContext = coa?.filter(a => a.isTrackedForBudget).map(a => ({ name: a.name, limit: a.monthlyLimit, actual: a.balance })) || [];
      const agingContext = { ar: openInvoices?.length || 0, ap: openBills?.length || 0 };

      const res = await aiFinancialInsights({
        salesData: JSON.stringify(salesContext),
        inventoryData: JSON.stringify(inventoryContext),
        accountingData: JSON.stringify(accountingContext),
        budgetData: JSON.stringify(budgetContext),
        agingData: JSON.stringify(agingContext),
        userQuery: "Provide a concise, high-impact executive summary for the dashboard insight card."
      });

      setAiInsight(res);
      setLastAuditTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Strategist failed:", e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedInstId, recentSales, products, coa, openInvoices, openBills]);

  // Initial trigger and periodic refresh
  useEffect(() => {
    if (selectedInstId && products && coa) {
      generateStrategistInsight();
      const interval = setInterval(generateStrategistInsight, 300000); // Refresh every 5 mins
      return () => clearInterval(interval);
    }
  }, [selectedInstId, !!products, !!coa, generateStrategistInsight]);

  const stats = [
    { title: "Gross Revenue", value: `${currency} 1.2M`, change: "+14.2%", trend: "up", icon: DollarSign },
    { title: "Net Profit", value: `${currency} 482k`, change: "+8.1%", trend: "up", icon: TrendingUp },
    { title: "Stock Value", value: `${currency} 8.4M`, change: "-2.4%", trend: "down", icon: Package2 },
    { title: "Avg Transaction", value: `${currency} 4,200`, change: "+1.2%", trend: "up", icon: Activity },
  ]

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
          <div className="flex items-center gap-2">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Active Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
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
                className={`size-12 text-primary/30 transition-all duration-1000 ${isAnalyzing ? 'animate-spin' : 'group-hover:scale-110'}`} 
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
                        {stat.change} <span className="font-normal text-muted-foreground ml-1">vs last month</span>
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
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
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
