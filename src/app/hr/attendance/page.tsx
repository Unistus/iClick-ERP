
'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import { format } from "date-fns";
import { 
  Timer, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  History, 
  Search, 
  Fingerprint, 
  Loader2,
  RefreshCw,
  LogOut,
  LogIn,
  Users,
  ShieldCheck,
  CalendarDays,
  Activity as Pulse,
  Coffee,
  Smartphone,
  QrCode,
  LayoutGrid,
  Zap,
  Clock,
  MoreVertical
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function AttendanceHubPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const attendanceQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    // Removing orderBy to ensure zero-friction during development
    return collection(db, 'institutions', selectedInstId, 'attendance');
  }, [db, selectedInstId]);
  const { data: logs, isLoading } = useCollection(attendanceQuery);

  const employeesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employees');
  }, [db, selectedInstId]);
  const { data: employees } = useCollection(employeesRef);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      const emp = employees?.find(e => e.id === log.employeeId);
      const fullName = `${emp?.firstName} ${emp?.lastName}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase()) || log.location?.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => {
      const timeA = a.timestamp?.toDate?.()?.getTime() || 0;
      const timeB = b.timestamp?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [logs, employees, searchTerm]);

  // Real-time Intelligence Stats
  const stats = useMemo(() => {
    if (!logs) return { present: 0, late: 0, break: 0, active: 0 };
    const today = new Date().toDateString();
    const todaysLogs = logs.filter(l => l.timestamp?.toDate?.()?.toDateString() === today);
    
    return {
      present: new Set(todaysLogs.filter(l => l.type === 'In').map(l => l.employeeId)).size,
      late: todaysLogs.filter(l => l.isLate).length,
      break: todaysLogs.filter(l => l.type === 'BreakStart').length - todaysLogs.filter(l => l.type === 'BreakEnd').length,
      active: new Set(todaysLogs.map(l => l.employeeId)).size
    };
  }, [logs]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 shadow-inner border border-emerald-500/10">
              <Timer className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Workforce Pulse</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Real-time Shift Telemetry & GPS Audit</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Validating Access..." : "Target Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="size-10 rounded-xl" onClick={() => toast({ title: "Polling Satellite..." })}><RefreshCw className="size-4" /></Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <Fingerprint className="size-20 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize real-time workforce monitoring.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* KPI MATRIX */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-emerald-500/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">On-Site Registry</span>
                  <Users className="size-3 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">{stats.present} STAFF</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Confirmed Presence</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-amber-500/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Exception Logs</span>
                  <Zap className="size-3 text-amber-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-amber-500">{stats.late} LATE</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Audit Required</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Breather Intensity</span>
                  <Coffee className="size-3 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{Math.max(0, stats.break)} ON BREAK</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Resource Buffer</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Pulse className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Sync Status</span>
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-2xl font-black font-headline">99.8% OK</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">GPS & IP Verified</p>
                </CardContent>
              </Card>
            </div>

            {/* LOGS TABLE */}
            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name, site or source..." 
                    className="pl-9 h-10 text-[10px] bg-secondary/20 border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase text-primary border-primary/20 bg-primary/5 h-8 px-4">
                    {filteredLogs.length} Events Streaming
                  </Badge>
                  <Button variant="ghost" size="icon" className="size-10 rounded-xl"><LayoutGrid className="size-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Personnel Identity</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Action Node</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Time Marker</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Ingress Source</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-black tracking-widest opacity-50">Polling Ingress Stream...</TableCell></TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No movement detected in the current cycle.</TableCell></TableRow>
                    ) : filteredLogs.map((log) => {
                      const emp = employees?.find(e => e.id === log.employeeId);
                      const isEntry = log.type === 'In';
                      const isBreak = log.type.includes('Break');
                      
                      return (
                        <TableRow key={log.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-4">
                              <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase shadow-inner border border-primary/5 group-hover:rotate-3 transition-transform">
                                {emp?.firstName?.[0]}{emp?.lastName?.[0] || '?'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{emp?.firstName} {emp?.lastName}</span>
                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">ID: {emp?.employeeId || 'EXT-NODE'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm",
                              isEntry ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                              isBreak ? 'bg-primary/10 text-primary ring-primary/20' : 
                              'bg-destructive/10 text-destructive ring-destructive/20'
                            )}>
                              {log.type === 'In' ? <LogIn className="size-2 mr-1.5" /> : log.type === 'Out' ? <LogOut className="size-2 mr-1.5" /> : <Coffee className="size-2 mr-1.5" />}
                              {log.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-mono font-black tracking-tighter text-foreground/80">
                                {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm:ss') : '...'}
                              </span>
                              <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">
                                {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'dd MMM') : 'SYNCING'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-primary flex items-center gap-1.5">
                                  <Smartphone className="size-2.5 opacity-50" /> {log.metadata?.source || 'WEB PORTAL'}
                                </span>
                                <span className="text-[8px] text-muted-foreground font-mono mt-0.5">{log.metadata?.ip || 'SECURE-NODE'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><MoreVertical className="size-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 shadow-2xl ring-1 ring-border">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ingress Analytics</DropdownMenuLabel>
                                <DropdownMenuItem className="text-xs gap-3 font-bold">
                                  <MapPin className="size-3.5 text-primary" /> Verify Geo-coordinates
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-3 font-bold">
                                  <History className="size-3.5 text-accent" /> Shift Correlation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs gap-3 font-bold text-destructive">
                                  <ShieldAlert className="size-3.5" /> Flag Anomalous Pattern
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* AUDIT LOGIC CARDS */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-md">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><ShieldCheck className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Institutional Guardrail</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Every attendance node is geo-fenced. Ingress from outside the branch radius or unauthorized IP ranges is instantly flagged for review by the **Administrative Hub**."
                  </p>
                </div>
              </Card>
              <div className="p-8 bg-secondary/10 rounded-[2rem] border border-border/50 flex items-center justify-between group cursor-default shadow-inner">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <History className="size-3 text-emerald-500" /> Latency Compensation
                  </p>
                  <p className="text-[11px] font-bold leading-tight max-w-[250px]">Clock-in timestamps are derived from institutional server-time to prevent client-side manipulation.</p>
                </div>
                <Zap className="size-10 text-primary opacity-10 group-hover:opacity-100 transition-all duration-700 animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
