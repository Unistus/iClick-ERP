
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Activity, 
  Server, 
  Database, 
  Globe, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Clock,
  RefreshCw,
  Wifi,
  ShieldCheck,
  BarChart3
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function SystemHealth() {
  const [uptime, setUptime] = useState("99.99%");
  const [lastCheck, setLastCheck] = useState(new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const services = [
    { name: "Firestore Database", status: "Operational", latency: "24ms", icon: Database, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Firebase Auth", status: "Operational", latency: "12ms", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "GenAI Inference", status: "Operational", latency: "840ms", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "M-Pesa Gateway", status: "Warning", latency: "4.2s", icon: Wifi, color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "Cloud Functions", status: "Operational", latency: "110ms", icon: Server, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Edge Network", status: "Operational", latency: "8ms", icon: Globe, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ]

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastCheck(new Date().toLocaleTimeString());
    }, 1000);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-headline font-bold">System Health</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">
              Infrastructure Node: <span className="text-primary">GCP-US-CENTRAL1</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Global Uptime</p>
              <p className="text-lg font-mono font-bold text-emerald-500">{uptime}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-2 border-primary/20 bg-primary/5"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking...' : 'Pulse Check'}
            </Button>
          </div>
        </div>

        {/* Real-time Service Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.name} className="bg-card border-none ring-1 ring-border shadow-sm hover:ring-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>
                    <s.icon className="size-5" />
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={`text-[9px] font-bold ${s.color} border-current/20`}>
                      {s.status.toUpperCase()}
                    </Badge>
                    <p className="text-xs font-mono font-bold mt-1.5">{s.latency}</p>
                  </div>
                </div>
                <h3 className="font-bold text-sm">{s.name}</h3>
                <p className="text-[10px] text-muted-foreground mt-1">Stable connection detected from edge.</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Resource Utilization */}
          <Card className="border-none ring-1 ring-border shadow-lg bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                  <Cpu className="size-4 text-primary" /> Core Resources
                </CardTitle>
                <BarChart3 className="size-4 text-muted-foreground/30" />
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Processor Load</span>
                  <span className="text-primary">24.2%</span>
                </div>
                <Progress value={24} className="h-2 bg-secondary" />
                <p className="text-[9px] text-muted-foreground italic">Optimal performance across 16 logic cores.</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Memory Buffer</span>
                  <span className="text-accent">62.8%</span>
                </div>
                <Progress value={62} className="h-2 bg-secondary" />
                <p className="text-[9px] text-muted-foreground italic">Caching active for 1,402 product SKUs.</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Disk I/O</span>
                  <span className="text-emerald-500">12.1%</span>
                </div>
                <Progress value={12} className="h-2 bg-secondary" />
                <p className="text-[9px] text-muted-foreground italic">Audit logging write-latency: 4ms.</p>
              </div>
            </CardContent>
          </Card>

          {/* Incident Log & Operations */}
          <Card className="border-none ring-1 ring-border shadow-lg bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity className="size-4 text-emerald-500" /> Operational Log
                </CardTitle>
                <Clock className="size-4 text-muted-foreground/30" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {[
                  { time: "09:42 AM", event: "M-Pesa STK Push Latency", type: "Warning", details: "Upstream delay in Safaricom API detected." },
                  { time: "08:15 AM", event: "Automated Backup", type: "Success", details: "Full institutional snapshot completed successfully." },
                  { time: "Yesterday", event: "System Update v1.2.4", type: "Success", details: "New document numbering engine deployed." },
                  { time: "Yesterday", event: "User Invitation Bulk", type: "Info", details: "14 new staff accounts provisioned for Nairobi Branch." },
                ].map((log, i) => (
                  <div key={i} className="p-4 hover:bg-secondary/10 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{log.time}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-[8px] font-bold h-4 ${
                          log.type === 'Warning' ? 'bg-amber-500/10 text-amber-500' : 
                          log.type === 'Success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {log.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold">{log.event}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{log.details}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-secondary/20 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Live Telemetry Active</span>
                  <span className="text-[9px] text-muted-foreground ml-auto">Last sync: {lastCheck}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Traffic View Simulation */}
        <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b border-border/50 py-3">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Globe className="size-4 text-primary" /> Traffic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4 w-full">
                {[
                  { region: "Nairobi HQ", load: 85 },
                  { region: "Mombasa Branch", load: 42 },
                  { region: "Kisumu Pharmacy", load: 18 },
                  { region: "Nakuru Retail", load: 31 },
                ].map(r => (
                  <div key={r.region} className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold">{r.region}</span>
                      <span className="text-muted-foreground">{r.load} Active Sessions</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${r.load}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="size-48 shrink-0 flex items-center justify-center border-4 border-dashed border-primary/20 rounded-full relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <Globe className="size-32" />
                </div>
                <div className="text-center z-10">
                  <p className="text-2xl font-bold text-primary">176</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Total Users<br/>Online Now</p>
                </div>
                {/* Simulated pings */}
                <div className="absolute top-4 right-8 size-2 bg-primary rounded-full animate-ping" />
                <div className="absolute bottom-12 left-4 size-2 bg-accent rounded-full animate-ping" style={{ animationDelay: '1s' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
