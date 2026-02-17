
'use client';

import { useState } from 'react';
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
  Zap
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
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Link from 'next/link';

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
          <div className="flex items-center gap-2">
            <Link href="/ai-insights">
              <Button size="sm" className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 h-9 font-bold text-[10px] uppercase">
                <BrainCircuit className="size-4" /> AI Strategist
              </Button>
            </Link>
            <div className="flex items-center gap-2 bg-secondary/20 p-1 rounded-lg border border-border/50">
              <Badge variant="outline" className="h-7 gap-1.5 px-3 border-none bg-background text-[10px] font-bold">
                <Calendar className="size-3 text-primary" /> Last 30 Days
              </Badge>
            </div>
          </div>
        </div>

        <Card className="border-none bg-gradient-to-r from-primary/10 via-background to-accent/5 ring-1 ring-primary/20 shadow-xl overflow-hidden group">
          <CardContent className="p-0 flex flex-col md:flex-row items-center">
            <div className="p-6 flex-1 space-y-2">
              <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em]">
                <Sparkles className="size-3 animate-pulse" /> Strategist Insight
              </div>
              <h2 className="text-lg font-bold">Inventory levels are 12% higher than seasonal average.</h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                System detected unallocated capital in medical consumables. Reducing next PO by 15% would free up <span className="font-bold text-emerald-500">KES 120k</span> for payroll overhead.
              </p>
              <div className="pt-2">
                <Link href="/ai-insights">
                  <Button variant="link" size="sm" className="text-primary p-0 h-auto font-bold text-[10px] uppercase gap-1 hover:gap-2 transition-all">
                    View Full Strategy <ChevronRight className="size-3" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-6 bg-primary/5 md:bg-transparent flex flex-col items-center justify-center shrink-0 border-l border-primary/10">
              <Zap className="size-12 text-primary/30 group-hover:scale-110 transition-transform duration-500" />
              <p className="text-[8px] font-black uppercase mt-2 opacity-40">Predictive Engine v2.0</p>
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
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
