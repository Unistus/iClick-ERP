
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Server, Database, Globe, Cpu, MemoryStick as Memory, CheckCircle2, AlertTriangle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function SystemHealth() {
  const services = [
    { name: "Firestore Engine", status: "Healthy", latency: "42ms", icon: Database, color: "text-emerald-500" },
    { name: "Auth Service", status: "Healthy", latency: "18ms", icon: Globe, color: "text-emerald-500" },
    { name: "GenAI Engine", status: "Healthy", latency: "1.2s", icon: Activity, color: "text-emerald-500" },
    { name: "M-Pesa Gateway", status: "Warning", latency: "4.5s", icon: Server, color: "text-amber-500" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-headline font-bold">System Health</h1>
          <p className="text-muted-foreground">Real-time status of global infrastructure and services.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <Card key={s.name} className="bg-card border-none ring-1 ring-border shadow-lg">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg bg-secondary ${s.color}`}>
                    <s.icon className="size-6" />
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold uppercase ${s.color}`}>{s.status}</p>
                    <p className="text-lg font-mono font-bold">{s.latency}</p>
                  </div>
                </div>
                <h3 className="font-bold text-sm">{s.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none ring-1 ring-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                <Cpu className="size-4 text-primary" /> Compute Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">CPU Usage</span>
                  <span className="font-bold">24%</span>
                </div>
                <Progress value={24} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Memory Usage</span>
                  <span className="font-bold">62%</span>
                </div>
                <Progress value={62} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-lg bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="size-4" /> Operational Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-background/50 border border-emerald-500/20">
                <p className="text-sm leading-relaxed">
                  All systems are performing within optimal parameters. M-Pesa gateway is experiencing slightly elevated latency due to external provider maintenance. 
                  <br /><br />
                  <span className="font-bold">Next Maintenance Window:</span> Sunday, 2:00 AM UTC.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
