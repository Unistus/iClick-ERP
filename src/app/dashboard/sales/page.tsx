
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { ShoppingBag, CreditCard, Smartphone, Banknote, Target, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

export default function SalesAnalytics() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-headline font-bold text-foreground">Sales Analytics</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Operational Performance & Payment Mix</p>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 gap-2 h-8 px-4 font-bold text-[10px]">
            <Target className="size-3" /> 102% OF TARGET
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">M-Pesa STK Pushes</span>
              <Smartphone className="size-3.5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">842</div>
              <p className="text-[9px] text-emerald-500 font-bold mt-1">+12.4% SUCCESS RATE</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Card Transactions</span>
              <CreditCard className="size-3.5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">156</div>
              <p className="text-[9px] text-muted-foreground font-bold mt-1">VISA/MASTERCARD MIX</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cash Collections</span>
              <Banknote className="size-3.5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">124</div>
              <p className="text-[9px] text-amber-500 font-bold mt-1">PETTY CASH DEPOSITED</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card border-none ring-1 ring-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Hourly Sales Traffic</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByHour}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="hour" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.2 }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '10px' }}
                    />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-none ring-1 ring-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Payment Method Mix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMix}
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentMix.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
