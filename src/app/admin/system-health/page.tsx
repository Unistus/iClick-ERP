
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Server, Database, Globe, Cpu, CheckCircle2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function SystemHealth() {
  const services = [
    { name: "Firestore", status: "Healthy", latency: "42ms", icon: Database, color: "text-emerald-500" },
    { name: "Auth", status: "Healthy", latency: "18ms", icon: Globe, color: "text-emerald-500" },
    { name: "GenAI", status: "Healthy", latency: "1.2s", icon: Activity, color: "text-emerald-500" },
    { name: "Gateway", status: "Warning", latency: "4.5s", icon: Server, color: "text-amber-500" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-headline font-bold">System Health</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <Card key={s.name} className="bg-card border-none ring-1 ring-border shadow-sm">
              <CardContent className="pt-3 pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className={`p-1.5 rounded bg-secondary ${s.color}`}>
                    <s.icon className="size-4" />
                  </div>
                  <div className="text-right">
                    <p className={`text-[9px] font-bold uppercase ${s.color}`}>{s.status}</p>
                    <p className="text-sm font-mono font-bold">{s.latency}</p>
                  </div>
                </div>
                <h3 className="font-bold text-[11px] text-muted-foreground">{s.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-none ring-1 ring-border shadow">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <Cpu className="size-3.5 text-primary" /> Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-bold">24%</span>
                </div>
                <Progress value={24} className="h-1.5 bg-secondary" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">RAM</span>
                  <span className="font-bold">62%</span>
                </div>
                <Progress value={62} className="h-1.5 bg-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow bg-emerald-500/5">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="size-3.5" /> Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="p-3 rounded bg-background/50 border border-emerald-500/10">
                <p className="text-[11px] leading-relaxed opacity-80">
                  Optimal performance across all regions. M-Pesa latency is expected to normalize within 30 minutes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
