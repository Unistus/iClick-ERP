
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  ArrowRight,
  ChevronDown
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

  const generateStrategistInsight = useCallback(async () => {
    if (!selectedInstId || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const context = `Current Page: Dashboard. Data Context: ${JSON.stringify(entries?.slice(0, 10))}`;
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
  }, [selectedInstId, !!entries, !!coa, selectedPeriodId]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-black tracking-tight">Command Matrix</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[8px] bg-emerald-500/10 text-emerald-500 border-none font-black uppercase">
                Satellite Sync: Active
              </Badge>
              <span className="text-[9px] text-muted-foreground font-mono uppercase opacity-50">Node: GCP-US-C1</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedInstId} onValueChange={(val) => { setSelectedInstId(val); setSelectedPeriodId(""); }}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId} disabled={!selectedInstId}>
              <SelectTrigger className="w-[180px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold">
                <Calendar className="size-3.5 mr-2 text-primary" />
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
          <div className="overflow-x-auto custom-scrollbar">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-8 flex-nowrap justify-start gap-1 w-full min-w-max border-b rounded-none bg-transparent">
              <TabsTrigger value="overview" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><LayoutDashboard className="size-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="sales" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><TrendingUp className="size-3.5" /> Sales</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Package className="size-3.5" /> Inventory</TabsTrigger>
              <TabsTrigger value="cashflow" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Wallet className="size-3.5" /> Cash Flow</TabsTrigger>
              <TabsTrigger value="tax" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Landmark className="size-3.5" /> Tax Audit</TabsTrigger>
              <TabsTrigger value="branches" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><MapPin className="size-3.5" /> Cost Centers</TabsTrigger>
              <TabsTrigger value="staff" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Users className="size-3.5" /> Personnel</TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent relative">
                <BellRing className="size-3.5" /> Exceptions
                {alerts && alerts.length > 0 && <span className="absolute top-2 right-3 size-2 bg-destructive rounded-full animate-pulse shadow-lg" />}
              </TabsTrigger>
              <TabsTrigger value="strategist" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><BrainCircuit className="size-3.5" /> AI Insight</TabsTrigger>
            </TabsList>
          </div>

          {!selectedInstId ? (
            <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] bg-secondary/5 opacity-30">
              <ShieldAlert className="size-16 mb-4" />
              <p className="font-black uppercase tracking-widest text-sm">Target Authorization Node Missing</p>
            </div>
          ) : (
            <>
              {/* OVERVIEW CONTENT */}
              <TabsContent value="overview" className="space-y-6 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Gross Revenue", val: stats.revenue, icon: DollarSign, color: "text-emerald-500", trend: "+12.4%" },
                    { label: "Operating Profit", val: stats.profit, icon: TrendingUp, color: "text-primary", trend: "+8.2%" },
                    { label: "Book Asset Value", val: stats.stock, icon: Package2, color: "text-accent", trend: "Balanced" },
                    { label: "Activity Index", val: stats.trans, icon: Activity, color: "text-primary", isRaw: true, trend: "High" },
                  ].map(s => (
                    <Card key={s.label} className="border-none bg-card shadow-2xl ring-1 ring-border/50 overflow-hidden group">
                      <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</span>
                        <s.icon className={cn("size-4", s.color)} />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-black font-headline">
                          {s.isRaw ? s.val : `${currency} ${s.val.toLocaleString()}`}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[8px] text-muted-foreground font-black uppercase">Current Period</p>
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter bg-emerald-500/10 px-1.5 py-0.5 rounded">{s.trend}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                  <Card className="lg:col-span-8 bg-card border-none ring-1 ring-border/50 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b border-border/10 py-4 px-8 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Revenue Velocity Audit</CardTitle>
                      <Badge variant="secondary" className="h-6 px-3 bg-primary/10 text-primary border-none font-black uppercase">Real-time Pull</Badge>
                    </CardHeader>
                    <CardContent className="p-8">
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
                            <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-primary border-none shadow-2xl text-white overflow-hidden relative group">
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-[-20%] right-[-10%] opacity-10 rotate-12 transition-transform group-hover:scale-110"><DollarSign className="size-48" /></div>
                      <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/60">Net Payout Potential</CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <p className="text-4xl font-black font-headline tracking-tighter">{currency} {stats.profit.toLocaleString()}</p>
                        <div className="mt-6 flex items-center gap-3">
                          <Link href="/accounting/banking" className="flex-1">
                            <Button size="sm" className="w-full bg-white/20 hover:bg-white/30 text-white font-black uppercase text-[10px] h-10 border-none">Execute Cycle</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none ring-1 ring-border/50 shadow-xl bg-secondary/5">
                      <CardHeader><CardTitle className="text-[10px] font-black uppercase tracking-widest">Active Audit Timeline</CardTitle></CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/10">
                          {entries?.slice(0, 3).map(e => (
                            <div key={e.id} className="p-4 flex items-center justify-between group cursor-default">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-tight">{e.description}</p>
                                <p className="text-[8px] font-mono text-muted-foreground uppercase">{e.reference}</p>
                              </div>
                              <ArrowRight className="size-3 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* ENHANCED TAX TAB */}
              <TabsContent value="tax" className="space-y-6 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-8 grid gap-4 md:grid-cols-2">
                    <Card className="bg-card border-none ring-1 ring-border shadow-xl p-8 rounded-[2rem] flex flex-col justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4">Output VAT Liability</p>
                        <p className="text-4xl font-black font-headline text-foreground">{currency} 420,500</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Estimated Accrual (Current Month)</p>
                      </div>
                      <div className="pt-6 border-t mt-6">
                        <div className="flex justify-between text-[10px] font-black uppercase mb-2"><span>Reserve Status</span><span className="text-emerald-500">FULLY FUNDED</span></div>
                        <Progress value={100} className="h-1.5 bg-secondary" />
                      </div>
                    </Card>
                    <Card className="bg-card border-none ring-1 ring-border shadow-xl p-8 rounded-[2rem] flex flex-col justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em] mb-4">P.A.Y.E Obligations</p>
                        <p className="text-4xl font-black font-headline text-foreground">{currency} 842,000</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Locked for Cycle Run: {activePeriod?.name}</p>
                      </div>
                      <div className="flex items-center gap-3 pt-6 border-t mt-6">
                        <ShieldCheck className="size-5 text-emerald-500" />
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Compliant with 2024 Statutory Bands</p>
                      </div>
                    </Card>
                  </div>
                  <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none ring-1 ring-primary/20 bg-primary/5 p-8 rounded-[2rem] relative overflow-hidden group h-full">
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Landmark className="size-32" /></div>
                      <div className="space-y-4 relative z-10 flex flex-col h-full">
                        <Badge variant="secondary" className="w-fit bg-emerald-500 text-white font-black uppercase text-[8px] h-5">Regulatory Check OK</Badge>
                        <h3 className="text-xl font-headline font-black uppercase tracking-tighter leading-none">Filing Countdown</h3>
                        <p className="text-[11px] leading-relaxed text-muted-foreground italic">"Your institutional VAT filing is due in 14 days. The system has automatically provisioned the required reserve in the clearing node."</p>
                        <div className="mt-auto pt-6">
                          <Link href="/accounting/tax"><Button className="w-full h-12 bg-primary hover:bg-primary/90 font-black uppercase text-[10px] gap-2 shadow-2xl">Prepare Returns <ChevronRight className="size-3" /></Button></Link>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* ENHANCED BRANCHES TAB */}
              <TabsContent value="branches" className="space-y-6 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-6 lg:grid-cols-12">
                  <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b py-4 px-8 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Cross-Branch Revenue Matrix</CardTitle>
                      <Button variant="ghost" size="icon" className="size-10"><RefreshCw className="size-4 opacity-30" /></Button>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={branchPerf}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v/1000}k`} />
                            <Tooltip cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.2 }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '10px' }} />
                            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="target" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="lg:col-span-4 grid gap-4">
                    {branches?.slice(0, 3).map((b, i) => (
                      <Card key={b.id} className="border-none ring-1 ring-border shadow-md bg-card group hover:ring-primary/30 transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-2xl bg-secondary/20 flex items-center justify-center text-primary group-hover:rotate-3 transition-transform"><MapPin className="size-5" /></div>
                              <span className="font-black text-sm uppercase tracking-tight">{b.name}</span>
                            </div>
                            <Badge variant="outline" className="text-[8px] h-5 bg-emerald-500/5 text-emerald-500 font-black border-none uppercase">Top Performer</Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase">
                              <span className="opacity-40">Target Realization</span>
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

              {/* ENHANCED INVENTORY TAB */}
              <TabsContent value="inventory" className="space-y-6 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                      <CardHeader className="bg-secondary/10 border-b py-4 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Asset Composition</CardTitle></CardHeader>
                      <CardContent className="p-6">
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={[{name: 'Pharmacy', value: 65}, {name: 'F&B', value: 20}, {name: 'Retail', value: 15}]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {COLORS.map((color, index) => <Cell key={index} fill={color} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 pt-4">
                          {['Pharmacy', 'F&B', 'Retail'].map((cat, i) => (
                            <div key={cat} className="flex items-center justify-between text-[10px] font-bold uppercase">
                              <div className="flex items-center gap-2"><div className="size-2 rounded-full" style={{backgroundColor: COLORS[i]}} /> {cat}</div>
                              <span className="opacity-50">{i === 0 ? '65%' : i === 1 ? '20%' : '15%'}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                      <CardHeader className="bg-secondary/10 border-b py-4 px-8 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Critical Supply Chain Alerts</CardTitle>
                        <Link href="/inventory/reorder"><Button size="sm" variant="ghost" className="text-[10px] font-black uppercase gap-2 hover:bg-primary/10">Full Registry <ArrowRight className="size-3" /></Button></Link>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader className="bg-secondary/20">
                            <TableRow><TableHead className="h-10 text-[9px] font-black uppercase pl-8">Item Identity</TableHead><TableHead className="h-10 text-[9px] font-black uppercase text-center">Status</TableHead><TableHead className="h-10 text-[9px] font-black uppercase text-right pr-8">Risk Level</TableHead></TableRow>
                          </TableHeader>
                          <TableBody>
                            {products?.filter(p => p.totalStock <= (p.reorderLevel || 0)).slice(0, 5).map(p => (
                              <TableRow key={p.id} className="h-14 hover:bg-destructive/5 border-b-border/30 group">
                                <TableCell className="pl-8 font-black text-xs uppercase tracking-tight">{p.name}</TableCell>
                                <TableCell className="text-center"><Badge variant="outline" className="text-[8px] h-5 bg-destructive/10 text-destructive border-none font-black px-2">LOW STOCK: {p.totalStock}</Badge></TableCell>
                                <TableCell className="text-right pr-8"><div className="size-2 rounded-full bg-destructive animate-pulse ml-auto" /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* ENHANCED STAFF TAB */}
              <TabsContent value="staff" className="space-y-6 mt-0 animate-in fade-in duration-700">
                <div className="grid gap-6 lg:grid-cols-12">
                  <Card className="lg:col-span-7 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b py-4 px-8"><CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Staff Distribution</CardTitle></CardHeader>
                    <CardContent className="p-8">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[{name: 'Sales', count: 12}, {name: 'Admin', count: 4}, {name: 'Ops', count: 24}, {name: 'HR', count: 2}]} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', fontSize: '10px' }} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="lg:col-span-5 space-y-6">
                    <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-md h-full">
                      <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 transition-transform group-hover:scale-110"><Users className="size-32 text-emerald-500" /></div>
                      <div className="flex flex-col gap-4 relative z-10 h-full">
                        <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">Attendance Pulse</p>
                        <div className="text-4xl font-black font-headline tracking-tighter">92% PRESENT</div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground italic">"Workforce intensity is high today. 4 staff members are currently on authorized leave cycles."</p>
                        <div className="mt-auto">
                          <Link href="/hr/attendance"><Button variant="outline" className="w-full h-11 border-emerald-500/20 text-emerald-500 font-black uppercase text-[10px] shadow-sm">View Real-time Map</Button></Link>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* STRATEGIST TAB */}
              <TabsContent value="strategist" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-none bg-gradient-to-br from-primary/10 via-background to-accent/10 ring-1 ring-primary/20 shadow-2xl overflow-hidden min-h-[500px]">
                  <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-8">
                    <div className="size-32 rounded-[2.5rem] bg-background shadow-2xl flex items-center justify-center relative group">
                      <BrainCircuit className="size-16 text-primary group-hover:scale-110 transition-transform" />
                      <div className="absolute -top-4 -right-4 size-10 rounded-full bg-accent flex items-center justify-center shadow-xl animate-bounce"><Zap className="size-5 text-white" /></div>
                    </div>
                    <div className="max-w-2xl space-y-4">
                      <h2 className="text-3xl font-headline font-black uppercase tracking-tighter leading-none text-foreground/90">Autonomous Decision Hub</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed italic">"Analyzing your institutional state across all nodes. Ready to provide tactical directives for revenue optimization and risk mitigation."</p>
                    </div>
                    {aiInsight && (
                      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
                        <div className="p-6 rounded-[2rem] bg-background/50 border border-border/50 text-left space-y-3">
                          <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><TrendingUp className="size-4" /> Trend Synthesis</p>
                          <p className="text-xs leading-relaxed opacity-80">{aiInsight.summaryOfTrends}</p>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-background/50 border border-border/50 text-left space-y-3">
                          <p className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center gap-2"><Target className="size-4" /> Strategic Pivot</p>
                          <p className="text-xs leading-relaxed opacity-80">{aiInsight.answerToQuery}</p>
                        </div>
                      </div>
                    )}
                    <Button 
                      className="h-14 px-12 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/40 gap-3"
                      onClick={generateStrategistInsight}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
                      Execute Global Scan
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ALERTS TAB */}
              <TabsContent value="alerts" className="mt-0 animate-in fade-in duration-700">
                <div className="space-y-3">
                  {(!alerts || alerts.length === 0) ? (
                    <div className="p-32 text-center border-2 border-dashed rounded-[3rem] opacity-20">
                      <CheckCircle2 className="size-16 mx-auto mb-4" />
                      <p className="font-black uppercase tracking-widest text-sm">Clear Horizons: No active locks.</p>
                    </div>
                  ) : alerts.map(a => (
                    <Card key={a.id} className="border-none ring-1 ring-border/50 bg-card group hover:ring-primary/30 transition-all overflow-hidden rounded-2xl">
                      <div className="flex items-center justify-between p-6 pl-0">
                        <div className="flex items-center gap-6">
                          <div className="w-2 h-16 bg-primary shrink-0" />
                          <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner border border-primary/5"><ShieldAlert className="size-6" /></div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight text-foreground/90">{a.action}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Target: {a.module} • Node: {a.requestedByName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pr-6">
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-none font-black text-[10px] h-7 px-3">URGENT</Badge>
                          <Link href="/approvals"><Button variant="ghost" size="icon" className="h-10 px-6 font-black uppercase text-[10px] gap-2 border ring-1 ring-border">Review <ChevronRight className="size-3" /></Button></Link>
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
