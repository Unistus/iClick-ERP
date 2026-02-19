
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, where, doc, getDoc } from "firebase/firestore";
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
  LogIn
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { recordAttendance } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function AttendanceHubPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const attendanceQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'attendance'), orderBy('timestamp', 'desc'), limit(50));
  }, [db, selectedInstId]);
  const { data: logs, isLoading } = useCollection(attendanceQuery);

  const employeesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employees');
  }, [db, selectedInstId]);
  const { data: employees } = useCollection(employeesRef);

  const handleClock = async (type: 'In' | 'Out') => {
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    // In a real app, we'd find the employee linked to the current user
    const currentEmp = employees?.find(e => e.email === user?.email);
    
    if (!currentEmp) {
      toast({ variant: "destructive", title: "Identity Error", description: "Your user login is not linked to an employee profile." });
      setIsProcessing(false);
      return;
    }

    try {
      await recordAttendance(db, selectedInstId, currentEmp.id, type);
      toast({ title: `Successfully Clocked ${type}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Terminal Error" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-accent/20 text-accent">
              <Timer className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Time Clock</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Attendance & Labor Integrity</p>
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
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Fingerprint className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access the time terminal.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border/10 pb-3">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <LogIn className="size-4 text-primary" /> Shift Entry
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="p-6 bg-secondary/20 rounded-3xl border border-border/50 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Current Network Time</p>
                    <p className="text-3xl font-black font-headline tracking-widest">{format(new Date(), 'HH:mm:ss')}</p>
                    <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <RefreshCw className="size-2.5 animate-spin" /> GPS Lock Active
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => handleClock('In')} 
                      disabled={isProcessing}
                      className="h-14 font-black uppercase text-xs bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-lg shadow-emerald-900/20"
                    >
                      <LogIn className="size-4" /> Clock In
                    </Button>
                    <Button 
                      onClick={() => handleClock('Out')} 
                      disabled={isProcessing}
                      className="h-14 font-black uppercase text-xs bg-destructive hover:bg-destructive/90 gap-2 shadow-lg shadow-destructive/20"
                    >
                      <LogOut className="size-4" /> Clock Out
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Activity className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-2 relative z-10">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Compliance Node</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                    "Attendance logs are hashed and geo-tagged. Manual overrides require institutional admin sign-off."
                  </p>
                </div>
              </Card>
            </div>

            <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Activity Stream</CardTitle>
                <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary">Live Pulse</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Staff Member</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-center">Type</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Timestamp</TableHead>
                      <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Site Node</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse uppercase">Syncing Hub...</TableCell></TableRow>
                    ) : logs?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No logs for today.</TableCell></TableRow>
                    ) : logs?.map((log) => (
                      <TableRow key={log.id} className="h-14 hover:bg-secondary/5 transition-colors border-b-border/30">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight">
                              {employees?.find(e => e.id === log.employeeId)?.firstName || '...'}
                            </span>
                            <span className="text-[8px] text-muted-foreground font-mono">
                              {employees?.find(e => e.id === log.employeeId)?.employeeId || 'ID-000'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-4 uppercase font-black border-none",
                            log.type === 'In' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                          )}>
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono font-bold opacity-60 uppercase">
                          {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm:ss dd/MM') : '...'}
                        </TableCell>
                        <TableCell className="text-right pr-6 text-[9px] font-black uppercase text-muted-foreground">
                          {log.location}
                        </TableCell>
                      </TableRow>
                    ))}
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
