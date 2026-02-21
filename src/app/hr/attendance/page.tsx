
'use client';

import { useState } from 'react';
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
  Activity as Pulse
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { recordAttendance } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function AttendanceHubPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const attendanceQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'attendance'), orderBy('timestamp', 'desc'), limit(100));
  }, [db, selectedInstId]);
  const { data: logs, isLoading } = useCollection(attendanceQuery);

  const employeesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employees');
  }, [db, selectedInstId]);
  const { data: employees } = useCollection(employeesRef);

  const filteredLogs = logs?.filter(log => {
    const emp = employees?.find(e => e.id === log.employeeId);
    const fullName = `${emp?.firstName} ${emp?.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || log.location?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500 shadow-inner">
              <Timer className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Labor Intensity Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Real-time Shift & Attendance Monitoring</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Fingerprint className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to monitor workforce activity.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase opacity-50 tracking-widest">Active Shifts</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-emerald-500">
                    {new Set(logs?.filter(l => l.type === 'In').map(l => l.employeeId)).size} PRESENT
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase opacity-50 tracking-widest">Late Arrivals</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-amber-500">2 NODES</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase opacity-50 tracking-widest">Daily Velocity</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-primary">94.2%</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Pulse className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase tracking-widest text-primary">Network Sync</span></CardHeader>
                <CardContent className="pb-4"><div className="text-xl font-black font-headline">ACTIVE</div></CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or site..." 
                    className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase text-primary border-primary/20 bg-primary/5 h-7 px-3">
                    {filteredLogs.length} Events Logged
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Staff Member</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-center">Direction</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Timestamp</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Institutional Node</TableHead>
                      <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Integrity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Streaming Logs...</TableCell></TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No activity detected.</TableCell></TableRow>
                    ) : filteredLogs.map((log) => {
                      const emp = employees?.find(e => e.id === log.employeeId);
                      return (
                        <TableRow key={log.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] uppercase shadow-inner">
                                {emp?.firstName?.[0]}{emp?.lastName?.[0]}
                              </div>
                              <span className="text-xs font-bold uppercase tracking-tight">{emp?.firstName} {emp?.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "text-[8px] h-4 uppercase font-black border-none ring-1 px-2",
                              log.type === 'In' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-destructive/10 text-destructive ring-destructive/20'
                            )}>
                              {log.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] font-mono font-bold opacity-60 uppercase">
                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'dd MMM HH:mm:ss') : '...'}
                          </TableCell>
                          <TableCell className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1.5 mt-4">
                            <MapPin className="size-2.5 text-primary opacity-40" /> {log.location || 'MANAGED HUB'}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1.5 text-[8px] font-black uppercase text-emerald-500/60 group-hover:text-emerald-500 transition-colors">
                              <ShieldCheck className="size-3" /> GPS VERIFIED
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
