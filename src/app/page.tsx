'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown,
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
  ArrowRight,
  ChevronDown,
  Smartphone,
  Banknote,
  Boxes,
  Quote,
  ClipboardCheck,
  ShoppingCart
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
  { name: 'HQ CBD', revenue: 450000, target: 500000 },
  { name: 'Westlands', revenue: 320000, target: 300000 },
  { name: 'Mombasa', revenue: 210000, target: 250000 },
  { name: 'Eldoret', revenue: 120000, target: 150000 },
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

  // SALES MODULE SUMMARY DATA
  const quotesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'sales_quotations');
  }, [db, selectedInstId]);
  const { data: allQuotes } = useCollection(quotesQuery);

  const salesOrdersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'sales_orders');
  }, [db, selectedInstId]);
  const { data: allOrders } = useCollection(salesOrdersQuery);

  const salesInvoicesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'sales_invoices');
  }, [db, selectedInstId]);
  const { data: allInvoices } = useCollection(salesInvoicesQuery);

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
    return { revenue: rev, profit: rev - exp, stock, trans: entries.length };
  }, [entries, coa, products]);

  const salesSummaries = useMemo(() => {
    const quoteVal = allQuotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0;
    const orderVal = allOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const invoiceVal = allInvoices?.reduce((sum, i) => sum + (i.total || 0), 0) || 0;

    return {
      quotes: { count: allQuotes?.length || 0, val: quoteVal },
      orders: { count: allOrders?.length || 0, val: orderVal },
      invoices: { count: allInvoices?.length || 0, val: invoiceVal }
    };
  }, [allQuotes, allOrders, allInvoices]);

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
        userQuery: "Examine cross-departmental efficiency and fiscal ceilings."
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
  }, [selectedInstId, !!entries, !!coa, selectedPeriodId, generateStrategistInsight]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-headline font-black tracking-tight">Command Matrix</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[7px] px-1.5 h-4 bg-emerald-500/10 text-emerald-500 border-none font-black uppercase">
                Satellite Sync: Active
              </Badge>
              <span className="text-[8px] text-muted-foreground font-mono uppercase opacity-50">Node: GCP-US-C1</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedInstId} onValueChange={(val) => { setSelectedInstId(val); setSelectedPeriodId(""); }}>
              <SelectTrigger className="w-[200px] h-9 bg-card border-none ring-1 ring-border text-[10px] font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId} disabled={!selectedInstId}>
              <SelectTrigger className="w-[140px] h-9 bg-card border-none ring-1 ring-border text-[10px] font-bold">
                <Calendar className="size-3 mr-1.5 text-primary" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {periods?.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TABS COMMAND HUB */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto custom-scrollbar -mx-1 px-1">
            <TabsList className="bg-secondary/20 h-auto p-0.5 mb-4 flex-nowrap justify-start gap-0.5 w-full min-w-max border-b rounded-none bg-transparent">
              <TabsTrigger value="overview" className="text-[10px] font-bold uppercase tracking-tight gap-1.5 px-4 py-2.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent transition-all"><LayoutDashboard className="size-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="sales" className="text-[10px] font-bold uppercase tracking-tight gap-1.5 px-4 py-2.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent transition-all"><TrendingUp className="size-3.5" /> Sales</TabsTrigger>
              <TabsTrigger value="inventory" className="text-[10px] font-bold uppercase tracking-tight gap-1.5 px-4 py-2.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent transition-all"><Package className="size-3.5" /> Inventory</TabsTrigger>
              <TabsTrigger value="cashflow" className="text-[10px] font-bold uppercase tracking-tight gap-1.5 px-4 py-2.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent transition-all"><Wallet className="size-3.5" /> Cash Flow</TabsTrigger>
              <TabsTrigger value="tax" className="text-[10px] font-bold uppercase tracking-tight gap-1.5 px-4 py-2.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent transition-all"><Landmark className="size-3.5" /> Tax Audit</TabsTrigger>
              <TabsTrigger value="branches" className="text-[10px] font-bold uppercase tracking-tight gap-1.5 px-4 py-2.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent transition-all"><MapPin className="size-3.5" /> Cost Centers</TabsTrigger>
              <TabsTrigger value="staff" className="text-[10px] font-bold uppercase tracking-tight gap-1.5 px-4 py-2.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent transition-all"><Users className="size-3.5" /> Personnel</TabsTrigger>
              <TabsTrigger value="alerts" className="text-[10px] font-bold uppercase tracking-tight gap-1.5 px-4 py-2.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent transition-all relative">
                <BellRing className="size-3.5" /> Exceptions
                {alerts && alerts.length > 0 && <span className="absolute top-1 right-1.5 size-1.5 bg-destructive rounded-full animate-pulse shadow-lg" />}
              </TabsTrigger>
              <TabsTrigger value="strategist" className="text-[10px] font-bold uppercase tracking-tight gap-1.5 px-4 py-2.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent transition-all"><BrainCircuit className="size-3.5" /> AI Insight</TabsTrigger>
            </TabsList>
          </div>

          {!selectedInstId ? (
            <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] bg-secondary/5 opacity-30">
              <ShieldAlert className="size-12 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">Target Authorization Node Missing</p>
            </div>
          ) : (
            <>
              <TabsContent value="overview" className="space-y-4 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Gross Revenue", val: stats.revenue, icon: DollarSign, color: "text-emerald-500", trend: "+12.4%" },
                    { label: "Operating Profit", val: stats.profit, icon: TrendingUp, color: "text-primary", trend: "+8.2%" },
                    { label: "Book Asset Value", val: stats.stock, icon: Package2, color: "text-accent", trend: "Balanced" },
                    { label: "Activity Index", val: stats.trans, icon: Activity, color: "text-primary", isRaw: true, trend: "High" },
                  ].map(s => (
                    <Card key={s.label} className="border-none bg-card shadow-lg ring-1 ring-border/50 overflow-hidden group">
                      <CardHeader className="flex flex-row items-center justify-between py-2 pb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</span>
                        <s.icon className={cn("size-3.5", s.color)} />
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="text-xl font-black font-headline">
                          {s.isRaw ? s.val : `${currency} ${s.val.toLocaleString()}`}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[7px] text-muted-foreground font-black uppercase">Active Period</p>
                          <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter bg-emerald-500/10 px-1 py-0.5 rounded">{s.trend}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-12">
                  <Card className="lg:col-span-8 bg-card border-none ring-1 ring-border/50 shadow-xl overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b border-border/10 py-3 px-6 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Revenue Velocity Audit</CardTitle>
                      <Badge variant="secondary" className="text-[7px] h-5 px-2 bg-primary/10 text-primary border-none font-black uppercase">Real-time Pull</Badge>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={salesData}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v/1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '9px' }} />
                            <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="lg:col-span-4 space-y-4">
                    <Card className="bg-primary border-none shadow-xl text-white overflow-hidden relative group">
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-[-10%] right-[-10%] opacity-10 rotate-12 transition-transform group-hover:scale-110"><DollarSign className="size-32" /></div>
                      <CardHeader className="relative z-10 py-3">
                        <CardTitle className="text-[9px] font-black uppercase tracking-widest text-white/60">Net Payout Potential</CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 pb-4">
                        <p className="text-3xl font-black font-headline tracking-tighter">{currency} {stats.profit.toLocaleString()}</p>
                        <div className="mt-4 flex items-center gap-2">
                          <Link href="/accounting/banking" className="flex-1">
                            <Button size="sm" className="w-full bg-white/20 hover:bg-white/30 text-white font-black uppercase text-[9px] h-9 border-none">Execute Cycle</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none ring-1 ring-border/50 shadow-lg bg-secondary/5">
                      <CardHeader className="py-3"><CardTitle className="text-[9px] font-black uppercase tracking-widest">Audit Timeline</CardTitle></CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/10 text-[10px]">
                          {entries?.slice(0, 3).map(e => (
                            <div key={e.id} className="p-3 flex items-center justify-between group cursor-default">
                              <div className="space-y-0.5">
                                <p className="font-bold uppercase truncate max-w-[150px]">{e.description}</p>
                                <p className="text-[7px] font-mono text-muted-foreground uppercase">{e.reference}</p>
                              </div>
                              <ArrowRight className="size-2.5 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sales" className="space-y-4 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-3 md:grid-cols-3">
                  <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                    <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Quotes Hub</span>
                      <Quote className="size-3.5 text-primary opacity-50" />
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="text-xl font-black font-headline">{salesSummaries.quotes.count} ISSUED</div>
                      <p className="text-[10px] text-primary font-bold uppercase mt-1">{currency} {salesSummaries.quotes.val.toLocaleString()}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-accent/30 transition-all">
                    <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Order Pipeline</span>
                      <ClipboardCheck className="size-3.5 text-accent opacity-50" />
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="text-xl font-black font-headline">{salesSummaries.orders.count} ACTIVE</div>
                      <p className="text-[10px] text-accent font-bold uppercase mt-1">{currency} {salesSummaries.orders.val.toLocaleString()}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-emerald-500/30 transition-all">
                    <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Revenue Node</span>
                      <ShoppingCart className="size-3.5 text-emerald-500 opacity-50" />
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="text-xl font-black font-headline">{salesSummaries.invoices.count} BILLED</div>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase mt-1">{currency} {salesSummaries.invoices.val.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-12">
                  <Card className="lg:col-span-8 bg-card border-none ring-1 ring-border/50 shadow-xl overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b border-border/10 py-3 px-6 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Revenue Growth Curve</CardTitle>
                      <Badge variant="outline" className="text-[7px] bg-emerald-500/10 text-emerald-500 border-none font-black uppercase">Live Yield</Badge>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={salesData}>
                            <defs>
                              <linearGradient id="colorRevenueSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v/1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '9px' }} />
                            <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#colorRevenueSales)" strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="lg:col-span-4 space-y-4">
                    <Card className="border-none ring-1 ring-border shadow-xl bg-card">
                      <CardHeader className="bg-secondary/10 border-b py-3 px-6">
                        <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em]">Payment Mix</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="h-[150px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={[{name: 'M-Pesa', value: 65}, {name: 'Card', value: 20}, {name: 'Cash', value: 15}]} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                                {COLORS.map((color, index) => <Cell key={index} fill={color} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-1.5 pt-3">
                          {['M-Pesa', 'Card', 'Cash'].map((m, i) => (
                            <div key={m} className="flex items-center justify-between text-[9px] font-bold uppercase">
                              <div className="flex items-center gap-1.5"><div className="size-1.5 rounded-full" style={{backgroundColor: COLORS[i]}} /> {m}</div>
                              <span className="opacity-50">{i === 0 ? '65%' : i === 1 ? '20%' : '15%'}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-4 space-y-4">
                    <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                      <CardHeader className="bg-secondary/10 border-b py-3 px-6"><CardTitle className="text-[9px] font-black uppercase tracking-[0.2em]">Asset Composition</CardTitle></CardHeader>
                      <CardContent className="p-6">
                        <div className="h-[220px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={[{name: 'Pharmacy', value: 65}, {name: 'F&B', value: 20}, {name: 'Retail', value: 15}]} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                                {COLORS.map((color, index) => <Cell key={index} fill={color} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-1.5 pt-3">
                          {['Pharmacy', 'F&B', 'Retail'].map((cat, i) => (
                            <div key={cat} className="flex items-center justify-between text-[9px] font-bold uppercase">
                              <div className="flex items-center gap-1.5"><div className="size-1.5 rounded-full" style={{backgroundColor: COLORS[i]}} /> {cat}</div>
                              <span className="opacity-50">{i === 0 ? '65%' : i === 1 ? '20%' : '15%'}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="lg:col-span-8 space-y-4">
                    <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                      <CardHeader className="bg-secondary/10 border-b border-border/10 py-3 px-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Supply Chain Risk</CardTitle>
                        <Link href="/inventory/reorder"><Button size="sm" variant="ghost" className="text-[9px] font-black uppercase gap-1.5 h-8 hover:bg-primary/10">Full Hub <ArrowRight className="size-2.5" /></Button></Link>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader className="bg-secondary/20">
                            <TableRow><TableHead className="h-10 text-[8px] font-black uppercase pl-6">Item Identity</TableHead><TableHead className="h-10 text-[8px] font-black uppercase text-center">Status</TableHead><TableHead className="h-10 text-[8px] font-black uppercase text-right pr-6">Safety Pulse</TableHead></TableRow>
                          </TableHeader>
                          <TableBody>
                            {products?.filter(p => p.totalStock <= (p.reorderLevel || 0)).slice(0, 5).map(p => (
                              <TableRow key={p.id} className="h-12 hover:bg-destructive/5 border-b-border/30 group">
                                <TableCell className="pl-6 font-black text-[10px] uppercase tracking-tight">{p.name}</TableCell>
                                <TableCell className="text-center"><Badge variant="outline" className="text-[7px] h-4 bg-destructive/10 text-destructive border-none font-black px-1.5 uppercase">LOW: {p.totalStock}</Badge></TableCell>
                                <TableCell className="text-right pr-6"><div className="size-1.5 rounded-full bg-destructive animate-pulse ml-auto" /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="cashflow" className="space-y-4 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-3 md:grid-cols-3">
                  <Card className="bg-card border-none ring-1 ring-border shadow-md">
                    <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                      <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Reserves</span>
                      <Wallet className="size-3 text-emerald-500 opacity-50" />
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="text-xl font-black font-headline text-foreground/90">{currency} 2.4M</div>
                      <p className="text-[7px] text-emerald-500 font-bold mt-0.5 uppercase">Ready for Payout</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-none ring-1 ring-border shadow-md">
                    <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                      <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">A/R Position</span>
                      <TrendingDown className="size-3 text-primary opacity-50" />
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="text-xl font-black font-headline text-primary">{currency} 842k</div>
                      <p className="text-[7px] text-muted-foreground font-bold mt-0.5 uppercase">Unsettled Bills</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-none ring-1 ring-border shadow-md">
                    <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                      <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Payables</span>
                      <History className="size-3 text-accent opacity-50" />
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="text-xl font-black font-headline text-accent">{currency} 1.1M</div>
                      <p className="text-[7px] text-muted-foreground font-bold mt-0.5 uppercase">Suppliers</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b border-border/10 py-3 px-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em]">Ledger Movement Hub</CardTitle>
                    <Badge variant="outline" className="text-[7px] bg-background border-primary/20 text-primary uppercase font-black px-1.5 h-5">Audit Stream</Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {[
                          { desc: "POS Terminal Sales", ref: "SALE-1004", amount: 45000, type: "In" },
                          { desc: "Vendor Payout: MedCo", ref: "PAY-502", amount: 12000, type: "Out" },
                          { desc: "Client Settlement: Acme", ref: "REC-201", amount: 125000, type: "In" },
                        ].map((tx, idx) => (
                          <TableRow key={idx} className="h-12 hover:bg-secondary/10 border-b-border/30">
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-2">
                                <div className={cn("size-7 rounded flex items-center justify-center", tx.type === 'In' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive')}>
                                  {tx.type === 'In' ? <ArrowUpRight className="size-3" /> : <ArrowDownLeft className="size-3" />}
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black uppercase truncate max-w-[180px]">{tx.desc}</p>
                                  <p className="text-[7px] font-mono text-muted-foreground uppercase">{tx.ref}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6 font-mono text-[10px] font-black">
                              <span className={tx.type === 'In' ? 'text-emerald-500' : 'text-destructive'}>
                                {tx.type === 'In' ? '+' : '-'} {currency} {tx.amount.toLocaleString()}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tax" className="space-y-4 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-8 grid gap-3 md:grid-cols-2">
                    <Card className="bg-card border-none ring-1 ring-border shadow-xl p-6 rounded-[1.5rem] flex flex-col justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black uppercase text-primary tracking-[0.2em] mb-2">VAT Liability</p>
                        <p className="text-2xl font-black font-headline text-foreground">{currency} 420,500</p>
                        <p className="text-[7px] font-bold text-muted-foreground uppercase">Estimated Current Period</p>
                      </div>
                      <div className="pt-4 border-t mt-4">
                        <div className="flex justify-between text-[8px] font-black uppercase mb-1"><span>Reserve Status</span><span className="text-emerald-500">FUNDED</span></div>
                        <Progress value={100} className="h-1 bg-secondary" />
                      </div>
                    </Card>
                    <Card className="bg-card border-none ring-1 ring-border shadow-xl p-6 rounded-[1.5rem] flex flex-col justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black uppercase text-accent tracking-[0.2em] mb-2">P.A.Y.E Nodes</p>
                        <p className="text-2xl font-black font-headline text-foreground">{currency} 842,000</p>
                        <p className="text-[7px] font-bold text-muted-foreground uppercase">Locked Cycle: {activePeriod?.name}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-4 border-t mt-4">
                        <ShieldCheck className="size-4 text-emerald-500" />
                        <p className="text-[8px] font-bold uppercase text-muted-foreground">Statutory Standard OK</p>
                      </div>
                    </Card>
                  </div>
                  <div className="lg:col-span-4">
                    <Card className="border-none ring-1 ring-primary/20 bg-primary/5 p-6 rounded-[1.5rem] relative overflow-hidden group h-full">
                      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:scale-110 transition-transform"><Landmark className="size-24" /></div>
                      <div className="space-y-3 relative z-10 flex flex-col h-full">
                        <Badge variant="secondary" className="w-fit bg-emerald-500 text-white font-black uppercase text-[7px] h-4 px-1.5">Compliance OK</Badge>
                        <h3 className="text-lg font-headline font-black uppercase tracking-tighter leading-none">Filing Horizon</h3>
                        <p className="text-[10px] leading-relaxed text-muted-foreground italic line-clamp-2">VAT and Payroll filings are provisioned against your General Ledger nodes.</p>
                        <div className="mt-auto pt-4">
                          <Link href="/accounting/tax"><Button className="w-full h-10 bg-primary hover:bg-primary/90 font-black uppercase text-[9px] gap-1.5 shadow-xl">Audit Returns <ChevronRight className="size-2.5" /></Button></Link>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="branches" className="space-y-4 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-4 lg:grid-cols-12">
                  <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b py-3 px-6 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Cross-Branch Revenue Matrix</CardTitle>
                      <Button variant="ghost" size="icon" className="size-8"><RefreshCw className="size-3" opacity-20 /></Button>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={branchPerf}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v/1000}k`} />
                            <Tooltip cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.2 }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '9px' }} />
                            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={35} />
                            <Bar dataKey="target" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} barSize={35} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="lg:col-span-4 grid gap-3">
                    {branches?.slice(0, 3).map((b) => (
                      <Card key={b.id} className="border-none ring-1 ring-border shadow-sm bg-card group hover:ring-primary/30 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="size-8 rounded-xl bg-secondary/20 flex items-center justify-center text-primary group-hover:rotate-3 transition-transform"><MapPin className="size-4" /></div>
                              <span className="font-black text-xs uppercase tracking-tight">{b.name}</span>
                            </div>
                            <Badge variant="outline" className="text-[7px] h-4 bg-emerald-500/5 text-emerald-500 font-black border-none uppercase">Top Hub</Badge>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-black uppercase">
                              <span className="opacity-40">Target Yield</span>
                              <span className="text-primary">94.2%</span>
                            </div>
                            <Progress value={94.2} className="h-1 bg-secondary" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="staff" className="space-y-4 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-4 lg:grid-cols-12">
                  <Card className="lg:col-span-7 border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b py-3 px-6"><CardTitle className="text-[9px] font-black uppercase tracking-[0.2em]">Identity Distribution</CardTitle></CardHeader>
                    <CardContent className="p-6">
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[{name: 'Sales', count: 12}, {name: 'Admin', count: 4}, {name: 'Ops', count: 24}, {name: 'HR', count: 2}]} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', fontSize: '9px' }} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="lg:col-span-5">
                    <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 p-6 rounded-[1.5rem] relative overflow-hidden group shadow-md h-full">
                      <div className="absolute -right-2 -bottom-2 opacity-5 rotate-12 transition-transform group-hover:scale-110"><Users className="size-24 text-emerald-500" /></div>
                      <div className="flex flex-col gap-3 relative z-10 h-full">
                        <p className="text-[8px] font-black uppercase text-emerald-500 tracking-[0.2em]">Attendance Pulse</p>
                        <div className="text-3xl font-black font-headline tracking-tighter">92% PRESENT</div>
                        <p className="text-[10px] leading-relaxed text-muted-foreground italic">"Operational intensity is nominal. All branch-nodes reported stable check-in telemetry."</p>
                        <div className="mt-auto">
                          <Link href="/hr/attendance"><Button variant="outline" className="w-full h-10 border-emerald-500/20 text-emerald-500 font-black uppercase text-[9px] shadow-sm">Real-time Stream</Button></Link>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="strategist" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Card className="border-none bg-gradient-to-br from-primary/10 via-background to-accent/10 ring-1 ring-primary/20 shadow-2xl overflow-hidden min-h-[450px]">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-6">
                    <div className="size-24 rounded-[2rem] bg-background shadow-2xl flex items-center justify-center relative group">
                      <BrainCircuit className="size-12 text-primary group-hover:scale-110 transition-transform" />
                      <div className="absolute -top-2 -right-2 size-8 rounded-full bg-accent flex items-center justify-center shadow-xl animate-bounce"><Zap className="size-4 text-white" /></div>
                    </div>
                    <div className="max-w-xl space-y-2">
                      <h2 className="text-2xl font-headline font-black uppercase tracking-tighter leading-none text-foreground/90">Autonomous Decision Hub</h2>
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic">"Analyzing your institutional state across all nodes. Ready to provide tactical directives."</p>
                    </div>
                    {aiInsight && (
                      <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl">
                        <div className="p-5 rounded-[1.5rem] bg-background/50 border border-border/50 text-left space-y-2">
                          <p className="text-[8px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5"><TrendingUp className="size-3" /> Trend Synthesis</p>
                          <p className="text-[10px] leading-relaxed opacity-80">{aiInsight.summaryOfTrends}</p>
                        </div>
                        <div className="p-5 rounded-[1.5rem] bg-background/50 border border-border/50 text-left space-y-2">
                          <p className="text-[8px] font-black uppercase text-accent tracking-widest flex items-center gap-1.5"><Target className="size-3" /> Strategic Pivot</p>
                          <p className="text-[10px] leading-relaxed opacity-80">{aiInsight.answerToQuery}</p>
                        </div>
                      </div>
                    )}
                    <Button 
                      className="h-12 px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/40 gap-2"
                      onClick={generateStrategistInsight}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      Execute Global Scan
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alerts" className="mt-0 animate-in fade-in duration-700">
                <div className="space-y-2">
                  {(!alerts || alerts.length === 0) ? (
                    <div className="p-24 text-center border-2 border-dashed rounded-[2rem] opacity-20">
                      <CheckCircle2 className="size-12 mx-auto mb-3" />
                      <p className="font-black uppercase tracking-widest text-[10px]">Zero active exceptions.</p>
                    </div>
                  ) : alerts.map(a => (
                    <Card key={a.id} className="border-none ring-1 ring-border/50 bg-card group hover:ring-primary/30 transition-all overflow-hidden rounded-xl">
                      <div className="flex items-center justify-between p-4 pl-0">
                        <div className="flex items-center gap-4">
                          <div className="w-1 h-12 bg-primary shrink-0" />
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner border border-primary/5"><ShieldAlert className="size-5" /></div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight text-foreground/90">{a.action}</p>
                            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Node: {a.module} • {a.requestedByName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pr-4">
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-none font-black text-[8px] h-6 px-2">LOCK</Badge>
                          <Link href="/approvals"><Button variant="ghost" size="sm" className="h-8 px-4 font-black uppercase text-[9px] gap-1.5 border ring-1 ring-border">Review <ChevronRight className="size-2.5" /></Button></Link>
                        </div>
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
