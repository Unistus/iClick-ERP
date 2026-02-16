
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package2, 
  Users2,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building2,
  PieChart as PieChartIcon
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useDoc, useMemoFirebase, useUser, useCollection } from "@/firebase"
import { doc, collection, query, limit, orderBy } from "firebase/firestore"
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
  Pie
} from 'recharts'
import { useState } from 'react';

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

  // Load Settings dynamically for currency etc
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
            <h1 className="text-2xl font-headline font-bold">Executive Overview</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Institutional Intelligence Hub</p>
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-none bg-card shadow-xl ring-1 ring-border/50 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <stat.icon className="size-16" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 relative z-10">
                <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {stat.title}
                </CardTitle>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">Revenue Flow & Profitability</CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Real-time financial trajectory vs margins</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-primary" />
                    <span className="text-[9px] font-bold uppercase">Revenue</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-accent" />
                    <span className="text-[9px] font-bold uppercase">Net Profit</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(val) => `${val/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '10px' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                    <Area type="monotone" dataKey="profit" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 bg-card border-none ring-1 ring-border/50 shadow-2xl">
            <CardHeader className="py-4 px-6 border-b border-border/10">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Branch Contribution</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">Market share distribution across active nodes</p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={branchPerf}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {branchPerf.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {branchPerf.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[11px] font-medium">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-bold font-mono">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-card border-none ring-1 ring-border/50 shadow-lg">
            <CardHeader className="py-3 px-4 border-b border-border/10 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Top Velocity Products</CardTitle>
              <TrendingUp className="size-3 text-muted-foreground opacity-30" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {[
                  { name: "Panadol Extra 500mg", sales: 1204, growth: "+12%" },
                  { name: "Surgical Spirit (1L)", sales: 842, growth: "+5%" },
                  { name: "Zinc Supplement", sales: 612, growth: "-2%" },
                  { name: "Amoxicillin Caps", sales: 420, growth: "+18%" },
                ].map((item) => (
                  <div key={item.name} className="p-3.5 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                    <span className="text-[11px] font-medium truncate max-w-[180px]">{item.name}</span>
                    <div className="text-right">
                      <p className="text-[11px] font-bold">{item.sales}</p>
                      <p className={`text-[9px] font-bold ${item.growth.startsWith('+') ? 'text-emerald-500' : 'text-destructive'}`}>{item.growth}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-none ring-1 ring-border/50 shadow-lg">
            <CardHeader className="py-3 px-4 border-b border-border/10 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Active Inventory Risks</CardTitle>
              <Package2 className="size-3 text-muted-foreground opacity-30" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {[
                  { name: "Insulin Injection", status: "Critical", stock: 2 },
                  { name: "Masks (N95)", status: "Warning", stock: 12 },
                  { name: "Gloves (Large)", status: "Critical", stock: 0 },
                  { name: "Cough Syrup", status: "Warning", stock: 8 },
                ].map((item) => (
                  <div key={item.name} className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium">{item.name}</p>
                      <Badge variant="outline" className={`text-[8px] h-4 mt-1 font-bold ${item.status === 'Critical' ? 'border-destructive text-destructive bg-destructive/5' : 'border-amber-500 text-amber-500 bg-amber-500/5'}`}>
                        {item.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-[11px] font-bold font-mono">{item.stock} left</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-none ring-1 ring-border/50 shadow-lg">
            <CardHeader className="py-3 px-4 border-b border-border/10 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Node Connectivity</CardTitle>
              <Building2 className="size-3 text-muted-foreground opacity-30" />
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {[
                  { name: "Main HQ Terminal", status: "Online", ping: "12ms" },
                  { name: "Westlands POS 01", status: "Online", ping: "45ms" },
                  { name: "Westlands POS 02", status: "Online", ping: "24ms" },
                  { name: "Mombasa Sub-Hub", status: "Degraded", ping: "840ms" },
                ].map((node) => (
                  <div key={node.name} className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${node.status === 'Online' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold">{node.name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{node.status} • {node.ping}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
