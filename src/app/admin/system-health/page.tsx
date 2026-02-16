
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Activity, 
  Server, 
  Database, 
  Globe, 
  Cpu, 
  Zap, 
  Clock,
  RefreshCw,
  Wifi,
  ShieldCheck,
  BarChart3,
  Search
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { format } from "date-fns"

export default function SystemHealth() {
  const db = useFirestore()
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
  const [lastCheck, setLastCheck] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Simulated dynamic metrics
  const [cpuLoad, setCpuLoad] = useState(24.2);
  const [memLoad, setMemLoad] = useState(62.8);
  const [diskLoad, setDiskLoad] = useState(12.1);

  // 1. Fetch Institutions for the context selector
  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  // 2. Fetch Audit Logs for the Operational Log
  const logsQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(
      collection(db, 'institutions', selectedInstitutionId, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(5)
    )
  }, [db, selectedInstitutionId])
  
  const { data: liveLogs, isLoading: isLogsLoading } = useCollection(logsQuery)

  // 3. Fetch Users for Traffic stats
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db])
  const { data: allUsers } = useCollection(usersQuery)

  useEffect(() => {
    setLastCheck(new Date().toLocaleTimeString());
    
    // Simulate live metrics fluctuations
    const interval = setInterval(() => {
      setCpuLoad(prev => Math.min(100, Math.max(5, prev + (Math.random() - 0.5) * 2)));
      setMemLoad(prev => Math.min(100, Math.max(10, prev + (Math.random() - 0.5) * 1)));
      setDiskLoad(prev => Math.min(100, Math.max(2, prev + (Math.random() - 0.5) * 0.5)));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const services = [
    { name: "Firestore Database", status: "Operational", latency: "24ms", icon: Database, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Firebase Auth", status: "Operational", latency: "12ms", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "GenAI Inference", status: "Operational", latency: "840ms", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "M-Pesa Gateway", status: "Operational", latency: "1.2s", icon: Wifi, color: "text-emerald-500", bg: "bg-emerald-500/10" },
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
              Infrastructure Node: <span className="text-primary font-mono">GCP-US-CENTRAL1-PRODUCTION</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-full md:w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Monitor Institution..." />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-2 border-primary/20 bg-primary/5"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Polling...' : 'Sync Telemetry'}
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
                  <Cpu className="size-4 text-primary" /> System Core Telemetry
                </CardTitle>
                <BarChart3 className="size-4 text-muted-foreground/30" />
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Cluster Processor Load</span>
                  <span className="text-primary">{cpuLoad.toFixed(1)}%</span>
                </div>
                <Progress value={cpuLoad} className="h-2 bg-secondary" />
                <p className="text-[9px] text-muted-foreground italic">Distributed across 32 logical compute cores.</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Virtual Memory Buffer</span>
                  <span className="text-accent">{memLoad.toFixed(1)}%</span>
                </div>
                <Progress value={memLoad} className="h-2 bg-secondary" />
                <p className="text-[9px] text-muted-foreground italic">Caching 100% of global schema definitions.</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Persistent Disk I/O</span>
                  <span className="text-emerald-500">{diskLoad.toFixed(1)}%</span>
                </div>
                <Progress value={diskLoad} className="h-2 bg-secondary" />
                <p className="text-[9px] text-muted-foreground italic">Write-ahead logging throughput: 1.2 GB/s.</p>
              </div>
            </CardContent>
          </Card>

          {/* Incident Log & Operations */}
          <Card className="border-none ring-1 ring-border shadow-lg bg-card flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity className="size-4 text-emerald-500" /> Operational Event Stream
                </CardTitle>
                <Clock className="size-4 text-muted-foreground/30" />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="divide-y divide-border/30 h-full overflow-y-auto custom-scrollbar max-h-[300px]">
                {!selectedInstitutionId ? (
                  <div className="p-12 text-center text-muted-foreground opacity-50 space-y-2">
                    <Search className="size-8 mx-auto" />
                    <p className="text-xs uppercase font-bold tracking-widest">Select institution to view events</p>
                  </div>
                ) : isLogsLoading ? (
                  <div className="p-12 text-center text-xs animate-pulse uppercase font-bold tracking-widest opacity-50">Streaming events...</div>
                ) : liveLogs?.length === 0 ? (
                  <div className="p-12 text-center text-xs text-muted-foreground uppercase font-bold tracking-widest">No recent operations logged.</div>
                ) : liveLogs?.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-secondary/10 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss') : 'Just now'}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-[8px] font-bold h-4 ${
                          log.status === 'Failure' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {log.status?.toUpperCase() || 'INFO'}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-foreground/90">{log.action} <span className="text-muted-foreground font-normal">in</span> {log.module}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{log.details}</p>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 bg-secondary/20 border-t border-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Live Telemetry Active</span>
                <span className="text-[9px] text-muted-foreground ml-auto">Last sync: {lastCheck}</span>
              </div>
            </div>
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
                  { region: "Nairobi HQ Node", load: institutions?.length ? Math.floor(Math.random() * 100) : 0 },
                  { region: "Mombasa Edge Cache", load: 12 },
                  { region: "Western Kenya API Gateway", load: 8 },
                  { region: "Global Management Console", load: 100 },
                ].map(r => (
                  <div key={r.region} className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold">{r.region}</span>
                      <span className="text-muted-foreground">{r.load}% Load Distribution</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${r.load}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="size-48 shrink-0 flex items-center justify-center border-4 border-dashed border-primary/20 rounded-full relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <Globe className="size-32" />
                </div>
                <div className="text-center z-10">
                  <p className="text-2xl font-bold text-primary">{allUsers?.length || 0}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Total Identities<br/>Registered</p>
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
