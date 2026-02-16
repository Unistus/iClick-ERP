
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, 
  DollarSign, 
  Package2, 
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building2,
  PieChart as PieChartIcon,
  BarChart3,
  History,
  Package,
  BellRing,
  FileText,
  Users,
  Target,
  Smartphone,
  CreditCard,
  Banknote,
  Wallet,
  PiggyBank,
  RefreshCcw,
  Search,
  AlertTriangle,
  Clock,
  ShieldAlert,
  GitPullRequest,
  CheckCircle2,
  MapPin,
  ArrowRight,
  ShieldCheck,
  LayoutDashboard
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase"
import { doc } from "firebase/firestore"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// --- Mock Data ---
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

const paymentMix = [
  { name: 'M-Pesa', value: 65 },
  { name: 'Card', value: 20 },
  { name: 'Cash', value: 15 },
]

const salesByHour = [
  { hour: '08:00', sales: 12 },
  { hour: '10:00', sales: 45 },
  { hour: '12:00', sales: 82 },
  { hour: '14:00', sales: 65 },
  { hour: '16:00', sales: 110 },
  { hour: '18:00', sales: 145 },
  { hour: '20:00', sales: 55 },
]

const activeAlerts = [
  { id: 1, type: 'Critical', module: 'Inventory', msg: 'Insulin stock depleted at Westlands branch.', time: '2 mins ago', icon: Package, color: 'text-destructive' },
  { id: 2, type: 'Approval', module: 'Accounting', msg: 'New expense requisition (KES 45,000) requires sign-off.', time: '15 mins ago', icon: GitPullRequest, color: 'text-primary' },
  { id: 3, type: 'Security', module: 'System', msg: 'Multiple failed login attempts detected.', time: '45 mins ago', icon: ShieldAlert, color: 'text-destructive' },
  { id: 4, type: 'Operational', module: 'POS', msg: 'M-Pesa Gateway latency exceeded threshold.', time: '1 hour ago', icon: Activity, color: 'text-amber-500' },
]

const COLORS = ['#008080', '#FF4500', '#10b981', '#f59e0b'];

export default function HomePage() {
  const db = useFirestore()
  const { user } = useUser()
  const [selectedInstId, setSelectedInstId] = useState<string>("SYSTEM")
  const [activeTab, setActiveTab] = useState("overview")

  const settingsRef = useMemoFirebase(() => {
    return doc(db, 'institutions', selectedInstId, 'settings', 'global')
  }, [db, selectedInstId])
  const { data: settings } = useDoc(settingsRef)

  const currency = settings?.general?.currencySymbol || "KES"

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
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Multi-Tenant Intelligence Hub</p>
          </div>
          <div className="flex items-center gap-2 bg-secondary/20 p-1 rounded-lg border border-border/50">
            <Badge variant="outline" className="h-7 gap-1.5 px-3 border-none bg-background text-[10px] font-bold">
              <Calendar className="size-3 text-primary" /> Last 30 Days
            </Badge>
            <Badge variant="ghost" className="h-7 gap-1.5 px-3 text-[10px] font-bold opacity-50 hover:opacity-100">
              Q3 2024
            </Badge>
          </div>
        </div>

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

          {/* --- OVERVIEW TAB --- */}
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
                    <div className="text-2xl font-bold font-headline">{stat.value}</div>
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
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/></linearGradient>
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

          {/* --- SALES TAB --- */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border/50">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">M-Pesa STK</span>
                  <Smartphone className="size-3.5 text-emerald-500" />
                </CardHeader>
                <CardContent><div className="text-xl font-bold">842</div><p className="text-[9px] text-emerald-500 font-bold mt-1">+12.4% SUCCESS</p></CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border/50">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Card Swipes</span>
                  <CreditCard className="size-3.5 text-blue-500" />
                </CardHeader>
                <CardContent><div className="text-xl font-bold">156</div><p className="text-[9px] text-muted-foreground font-bold mt-1">VISA/MASTERCARD</p></CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border/50">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Cash Sum</span>
                  <Banknote className="size-3.5 text-amber-500" />
                </CardHeader>
                <CardContent><div className="text-xl font-bold">124</div><p className="text-[9px] text-amber-500 font-bold mt-1">DEPOSITED</p></CardContent>
              </Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="bg-card border-none ring-1 ring-border/50 shadow-xl">
                <CardHeader><CardTitle className="text-xs font-bold uppercase">Hourly Sales Traffic</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesByHour}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border/50 shadow-xl">
                <CardHeader><CardTitle className="text-xs font-bold uppercase">Payment Mix</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentMix} innerRadius={60} outerRadius={80} dataKey="value">
                          {paymentMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* --- INVENTORY TAB --- */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Active SKUs", value: "14,204", icon: Package, color: "text-primary" },
                { label: "Out of Stock", value: "42", icon: AlertTriangle, color: "text-destructive" },
                { label: "Low Re-order", value: "156", icon: Clock, color: "text-amber-500" },
                { label: "Stock Health", value: "98.4%", icon: ShieldCheck, color: "text-emerald-500" },
              ].map(i => (
                <Card key={i.label} className="bg-card border-none ring-1 ring-border/50">
                  <CardContent className="pt-4 flex items-center gap-3">
                    <div className={`p-2 rounded bg-secondary ${i.color}`}><i.icon className="size-4" /></div>
                    <div><p className="text-[9px] font-bold uppercase text-muted-foreground">{i.label}</p><p className="text-lg font-bold">{i.value}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="bg-card border-none ring-1 ring-border shadow-xl">
                <CardHeader className="border-b border-border/10"><CardTitle className="text-[10px] font-bold uppercase">Fast Moving Items</CardTitle></CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {[{ n: "Panadol 500mg", t: 85, v: "420k" }, { n: "Masks", t: 72, v: "180k" }, { n: "Sanitizer", t: 64, v: "92k" }].map(item => (
                    <div key={item.n} className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold"><span>{item.n}</span><span className="text-primary">KES {item.v}</span></div>
                      <Progress value={item.t} className="h-1.5 bg-secondary" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-xl">
                <CardHeader className="border-b border-border/10 text-destructive"><CardTitle className="text-[10px] font-bold uppercase">Dead Stock Risk</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/10">
                    {[{ n: "Vintage Stethoscope", d: "184d", l: "12k" }, { n: "Ortho-Brace", d: "92d", l: "45k" }].map(i => (
                      <div key={i.n} className="p-4 flex justify-between items-center text-[11px]">
                        <div><p className="font-bold">{i.n}</p><p className="text-[9px] text-muted-foreground uppercase">No activity: {i.d}</p></div>
                        <div className="text-right"><p className="font-bold text-destructive">KES {i.l}</p></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* --- CASH FLOW TAB --- */}
          <TabsContent value="cashflow" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="py-3 px-4 bg-emerald-500/5 flex justify-between items-center"><span className="text-[10px] font-bold text-emerald-500 uppercase">Net Position</span><Wallet className="size-3.5 text-emerald-500" /></CardHeader>
                <CardContent className="pt-4"><div className="text-2xl font-bold">KES 2.4M</div><div className="text-emerald-500 font-bold text-[10px] mt-1">+18.4% SURPLUS</div></CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="py-3 px-4 bg-primary/5 flex justify-between items-center"><span className="text-[10px] font-bold text-primary uppercase">Receivables</span><PiggyBank className="size-3.5 text-primary" /></CardHeader>
                <CardContent className="pt-4"><div className="text-2xl font-bold">KES 842k</div><div className="text-muted-foreground font-bold text-[10px] mt-1 uppercase">12 Overdue Invoices</div></CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="py-3 px-4 bg-destructive/5 flex justify-between items-center"><span className="text-[10px] font-bold text-destructive uppercase">Payables</span><Banknote className="size-3.5 text-destructive" /></CardHeader>
                <CardContent className="pt-4"><div className="text-2xl font-bold">KES 1.1M</div><div className="text-destructive font-bold text-[10px] mt-1 uppercase">Payroll & Vendors</div></CardContent>
              </Card>
            </div>
            <Card className="bg-card border-none ring-1 ring-border shadow-xl">
              <CardHeader className="border-b border-border/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase">Recent Movement Stream</CardTitle>
                <button className="text-[9px] font-bold uppercase bg-primary text-white px-3 h-7 rounded"><RefreshCcw className="size-3 inline mr-1" /> Reconcile</button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/10">
                  {[{ a: "POS Sales", d: "Today 14:20", t: "In", v: "45,000" }, { a: "MedCo Supplier", d: "Yesterday", t: "Out", v: "12,000" }].map((tx, i) => (
                    <div key={i} className="p-4 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded flex items-center justify-center ${tx.t === 'In' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>{tx.t === 'In' ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}</div>
                        <div><p className="font-bold">{tx.a}</p><p className="text-[9px] text-muted-foreground uppercase">{tx.d}</p></div>
                      </div>
                      <p className={`font-mono font-bold ${tx.t === 'In' ? 'text-emerald-500' : 'text-destructive'}`}>{tx.t === 'In' ? '+' : '-'} KES {tx.v}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- ALERTS TAB --- */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-4">
                {activeAlerts.map(alert => (
                  <Card key={alert.id} className="bg-card border-none ring-1 ring-border/50 hover:ring-primary/30 transition-all overflow-hidden">
                    <CardContent className="p-0 flex">
                      <div className={`w-1.5 ${alert.color.replace('text', 'bg')}`} />
                      <div className="p-4 flex-1 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded bg-secondary ${alert.color}`}><alert.icon className="size-5" /></div>
                          <div>
                            <div className="flex items-center gap-2"><span className={`text-[10px] font-bold uppercase ${alert.color}`}>{alert.type}</span><span className="text-muted-foreground opacity-30">•</span><span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{alert.module}</span></div>
                            <p className="text-sm font-bold mt-0.5">{alert.msg}</p>
                            <div className="text-[9px] text-muted-foreground flex items-center gap-1.5 mt-1"><Clock className="size-2.5" /> {alert.time}</div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold">RESOLVE</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="lg:col-span-4 space-y-4">
                <Card className="bg-card border-none ring-1 ring-border">
                  <CardHeader><CardTitle className="text-[10px] font-bold uppercase">Resolution Metrics</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1"><div className="flex justify-between text-[10px] font-bold"><span>Today's Response</span><span>92%</span></div><Progress value={92} className="h-1" /></div>
                    <p className="text-[10px] text-muted-foreground italic">Avg resolution time: 14 mins</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* --- PLACEHOLDER TABS --- */}
          {["tax", "branches", "staff"].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card className="border-none ring-1 ring-border/50 bg-card/50">
                <CardContent className="py-24 text-center space-y-3">
                  <Activity className="size-12 mx-auto text-muted-foreground opacity-20" />
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Analytics node initializing...</p>
                  <p className="text-[10px] text-muted-foreground/50">Fetching granular metrics for {tab.toUpperCase()} context.</p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
