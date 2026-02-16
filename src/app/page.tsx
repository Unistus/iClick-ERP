
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package2, 
  Users2,
  Activity
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

const stats = [
  {
    title: "Sales Today",
    value: "KES 124,500",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Cash on Hand",
    value: "KES 42,300",
    change: "-2.1%",
    trend: "down",
    icon: Activity,
  },
  {
    title: "Low Stock Items",
    value: "18",
    change: "Critical",
    trend: "neutral",
    icon: Package2,
    critical: true,
  },
  {
    title: "Active Customers",
    value: "1,204",
    change: "+48 this week",
    trend: "up",
    icon: Users2,
  },
]

export default function HomePage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-headline font-bold">Command Center</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-none bg-card shadow ring-1 ring-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`size-4 ${stat.critical ? 'text-accent' : 'text-primary'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {stat.trend === 'up' && <TrendingUp className="size-3 text-emerald-500" />}
                  {stat.trend === 'down' && <TrendingDown className="size-3 text-destructive" />}
                  <span className={`text-[10px] ${
                    stat.critical ? 'text-accent font-bold' : 
                    stat.trend === 'up' ? 'text-emerald-500' : 
                    stat.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4 bg-card border-none ring-1 ring-border/50">
            <CardHeader className="py-3">
              <CardTitle className="text-lg font-headline">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-2 rounded-lg bg-secondary/30">
                    <div className="size-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                      INV
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">Order #IK-882{i}</p>
                      <p className="text-[10px] text-muted-foreground">2 mins ago</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">KES 2,400.00</p>
                      <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-500 h-4">Completed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 bg-card border-none ring-1 ring-border/50">
            <CardHeader className="py-3">
              <CardTitle className="text-lg font-headline">Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Paracetamol 500mg", stock: 12, min: 50 },
                  { name: "Amoxicillin Caps", stock: 5, min: 20 },
                  { name: "Surgical Spirit", stock: 2, min: 10 },
                  { name: "Face Masks (Box)", stock: 8, min: 25 },
                ].map((item) => (
                  <div key={item.name} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-accent font-bold">{item.stock} left</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent" 
                        style={{ width: `${(item.stock / item.min) * 100}%` }}
                      />
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
