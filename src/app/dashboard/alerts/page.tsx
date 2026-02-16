
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BellRing, 
  AlertTriangle, 
  ShieldAlert, 
  Zap, 
  GitPullRequest, 
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const activeAlerts = [
  { 
    id: 1, 
    type: 'Critical', 
    module: 'Inventory', 
    msg: 'Insulin stock depleted at Westlands branch.', 
    time: '2 mins ago',
    icon: Package,
    color: 'text-destructive'
  },
  { 
    id: 2, 
    type: 'Approval', 
    module: 'Accounting', 
    msg: 'New expense requisition (KES 45,000) requires sign-off.', 
    time: '15 mins ago',
    icon: GitPullRequest,
    color: 'text-primary'
  },
  { 
    id: 3, 
    type: 'Security', 
    module: 'System', 
    msg: 'Multiple failed login attempts detected for Admin Node.', 
    time: '45 mins ago',
    icon: ShieldAlert,
    color: 'text-destructive'
  },
  { 
    id: 4, 
    type: 'Operational', 
    module: 'POS', 
    msg: 'M-Pesa Gateway latency exceeded 2.0s threshold.', 
    time: '1 hour ago',
    icon: Zap,
    color: 'text-amber-500'
  },
]

export default function RealTimeAlerts() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-headline font-bold">Alert Command</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Real-time Exception & Workflow Management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase gap-2">
              <CheckCircle2 className="size-3.5" /> Clear All
            </Button>
            <Button size="sm" className="h-8 text-[10px] font-bold uppercase gap-2">
              <BellRing className="size-3.5" /> Config Rules
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            {activeAlerts.map((alert) => (
              <Card key={alert.id} className="bg-card border-none ring-1 ring-border/50 hover:ring-primary/30 transition-all overflow-hidden group">
                <CardContent className="p-0 flex">
                  <div className={`w-1.5 shrink-0 ${alert.color.replace('text', 'bg')}`} />
                  <div className="flex-1 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg bg-secondary/50 ${alert.color}`}>
                        <alert.icon className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-tighter ${alert.color}`}>{alert.type}</span>
                          <span className="text-[10px] text-muted-foreground font-bold">•</span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{alert.module}</span>
                        </div>
                        <p className="text-[13px] font-bold text-foreground/90">{alert.msg}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-medium">
                          <Clock className="size-3" /> {alert.time}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold px-3">DISMISS</Button>
                      <Button size="sm" className="h-8 text-[10px] font-bold px-3">RESOLVE</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card className="bg-card border-none ring-1 ring-border shadow-xl">
              <CardHeader className="py-3 px-4 border-b border-border/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Alert Channels</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {[
                  { label: "SMS Gateway", status: "Active", icon: Zap },
                  { label: "Email Engine", status: "Active", icon: BellRing },
                  { label: "App Push", status: "Disabled", icon: XCircle },
                ].map((channel) => (
                  <div key={channel.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <channel.icon className={`size-3.5 ${channel.status === 'Active' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-[11px] font-bold">{channel.label}</span>
                    </div>
                    <Badge variant={channel.status === 'Active' ? 'secondary' : 'outline'} className="text-[8px] font-bold h-4">
                      {channel.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border-none ring-1 ring-border shadow-xl">
              <CardHeader className="py-3 px-4 border-b border-border/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Recent Resolutions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/10">
                  {[
                    { msg: "POS Terminal 02 connection restored", time: "2h ago" },
                    { msg: "Tax filing sequence reset", time: "5h ago" },
                    { msg: "Daily backup archive validated", time: "8h ago" },
                  ].map((res, i) => (
                    <div key={i} className="p-3.5">
                      <p className="text-[10px] font-medium leading-tight opacity-70">{res.msg}</p>
                      <p className="text-[8px] text-emerald-500 font-bold mt-1 uppercase">Resolved {res.time}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
