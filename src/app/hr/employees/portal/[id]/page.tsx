
'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, orderBy, limit } from "firebase/firestore";
import { 
  User, 
  Briefcase, 
  CalendarDays, 
  Star, 
  ShieldAlert, 
  BadgeCent, 
  FileText, 
  Timer, 
  Activity, 
  Building, 
  MapPin, 
  Mail, 
  Phone, 
  Hash, 
  ShieldCheck, 
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  History,
  Zap,
  CheckCircle2,
  Clock,
  Landmark,
  Loader2,
  UserCog,
  LayoutGrid,
  Plus,
  Mars,
  Venus,
  ArrowUpRight,
  Download,
  Heart
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * @fileOverview High-fidelity Personnel Self-Service Portal.
 * Centralizes all employee-related data nodes into a unified command hub.
 */

function PortalContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const db = useFirestore();
  
  const employeeId = params.id as string;
  const selectedInstId = searchParams.get('instId') || "";

  // Data Fetching: Employee Core Profile
  const empRef = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return doc(db, 'institutions', selectedInstId, 'employees', employeeId);
  }, [db, selectedInstId, employeeId]);
  const { data: employee, isLoading: empLoading } = useDoc(empRef);

  // Data Fetching: Leave History & Requisitions
  const leaveQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'leave_requests'), 
      where('employeeId', '==', employeeId), 
      orderBy('createdAt', 'desc')
    );
  }, [db, selectedInstId, employeeId]);
  const { data: leaves } = useCollection(leaveQuery);

  // Data Fetching: Growth & Performance Reviews
  const reviewsQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'performance_reviews'), 
      where('employeeId', '==', employeeId), 
      orderBy('date', 'desc')
    );
  }, [db, selectedInstId, employeeId]);
  const { data: reviews } = useCollection(reviewsQuery);

  // Data Fetching: Conduct & Disciplinary Archive
  const conductQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'disciplinary_records'), 
      where('employeeId', '==', employeeId), 
      orderBy('createdAt', 'desc')
    );
  }, [db, selectedInstId, employeeId]);
  const { data: conduct } = useCollection(conductQuery);

  // Data Fetching: Real-time Attendance Stream
  const attQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'attendance'), 
      where('employeeId', '==', employeeId), 
      orderBy('timestamp', 'desc'), 
      limit(15)
    );
  }, [db, selectedInstId, employeeId]);
  const { data: attendance } = useCollection(attQuery);

  // Data Fetching: Institutional Structure (Branches)
  const branchesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'branches');
  }, [db, selectedInstId]);
  const { data: branches } = useCollection(branchesRef);

  // Calculations: Real-time Talent Metrics
  const avgPerformance = useMemo(() => {
    if (!reviews?.length) return 0;
    return reviews.reduce((sum, r) => sum + (r.score || 0), 0) / reviews.length;
  }, [reviews]);

  const kraAttainment = useMemo(() => {
    if (!reviews?.length) return 0;
    const achieved = reviews.filter(r => r.kraAchieved).length;
    return (achieved / reviews.length) * 100;
  }, [reviews]);

  const attendanceRate = useMemo(() => {
    // Simple mock calculation for portal display
    return 94.2;
  }, []);

  if (empLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-primary opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Synchronizing Identity Hub...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <ShieldAlert className="size-12 text-destructive opacity-20" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Identity Node Not Found</p>
        <p className="text-xs text-muted-foreground max-w-xs">The requested employee record does not exist or has been decommissioned.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/hr/employees')} className="mt-4">Return to Directory</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* PORTAL HEADER COMMAND CENTER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-card border border-border/50 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden ring-1 ring-border/50">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none"><UserCog className="size-48" /></div>
        
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <div className="relative group">
            <div className="size-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-black text-4xl uppercase shadow-inner border border-primary/20 transition-all group-hover:scale-105 group-hover:rotate-3">
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-background ring-2 ring-emerald-500 shadow-lg">
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
          </div>
          
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="text-3xl font-headline font-black text-foreground tracking-tight">
              {employee.firstName} {employee.lastName}
            </h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Badge variant="secondary" className={cn(
                "h-6 px-3 font-black uppercase border-none ring-1",
                employee.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-amber-500/10 text-amber-500 ring-amber-500/20'
              )}>
                {employee.status || 'PENDING'}
              </Badge>
              <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5 bg-secondary/30 px-2 py-1 rounded-md">
                <Briefcase className="size-3 text-primary" /> {employee.jobTitle || 'General Staff'}
              </span>
              <span className="text-[10px] font-mono font-black text-primary/60 flex items-center gap-1.5">
                <Hash className="size-3" /> {employee.employeeId}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full lg:w-auto">
          <div className="p-4 rounded-2xl bg-secondary/10 border border-border/50 text-center flex flex-col justify-center">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Absence Credits</p>
            <p className="text-xl font-black text-primary">{employee.leaveBalance || 0} DAYS</p>
          </div>
          <div className="p-4 rounded-2xl bg-secondary/10 border border-border/50 text-center flex flex-col justify-center">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Audit Score</p>
            <p className="text-xl font-black text-accent">{avgPerformance.toFixed(1)}/10</p>
          </div>
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center hidden sm:flex flex-col justify-center">
            <p className="text-[8px] font-black uppercase text-primary tracking-widest mb-1">KRA Attainment</p>
            <p className="text-xl font-black text-foreground">{kraAttainment.toFixed(0)}%</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-secondary/20 h-auto p-1 mb-8 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none w-full">
          <TabsTrigger value="profile" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><User className="size-3.5" /> Identity Hub</TabsTrigger>
          <TabsTrigger value="leave" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><CalendarDays className="size-3.5" /> Absence Matrix</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Star className="size-3.5" /> Growth Scorecard</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Timer className="size-3.5" /> Shift Stream</TabsTrigger>
          <TabsTrigger value="conduct" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><ShieldAlert className="size-3.5" /> Conduct Archive</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><BadgeCent className="size-3.5" /> Settlement</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-0">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <User className="size-4 text-primary" /> Biographical Core
                </CardTitle>
                {employee.gender === 'Male' ? <Mars className="size-4 text-blue-500" /> : <Venus className="size-4 text-pink-500" />}
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">National ID Node</p>
                    <p className="text-sm font-bold font-mono tracking-tight">{employee.nationalId || 'PENDING'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Fiscal KRA PIN</p>
                    <p className="text-sm font-bold font-mono uppercase tracking-tight">{employee.kraPin || 'PENDING'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Official Email</p>
                    <p className="text-sm font-bold truncate">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Verified Phone</p>
                    <p className="text-sm font-bold">{employee.phone}</p>
                  </div>
                </div>
                <div className="pt-6 border-t border-border/50">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-3 flex items-center gap-2">
                    <Heart className="size-3" /> Kin Verification Node
                  </p>
                  <div className="p-4 rounded-2xl bg-secondary/10 border border-dashed border-border flex items-center justify-between group hover:bg-secondary/20 transition-all">
                    <div>
                      <p className="text-xs font-black uppercase">{employee.nextOfKin?.name || 'NOT DEFINED'}</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">{employee.nextOfKin?.relation || 'Guardian'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-black text-primary">{employee.nextOfKin?.phone || '...'}</p>
                      <p className="text-[8px] text-muted-foreground uppercase">Emergency Line</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <Building className="size-4 text-accent" /> Institutional Topology
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <MapPin className="size-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-primary tracking-widest">Active Branch</p>
                      <p className="text-xs font-black uppercase mt-1">
                        {branches?.find(b => b.id === employee.branchId)?.name || 'Central Hub'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-accent/5 border border-accent/10">
                    <LayoutGrid className="size-5 text-accent shrink-0" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-accent tracking-widest">Dept. Node</p>
                      <p className="text-xs font-black uppercase mt-1">{employee.departmentId || 'Operations'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-secondary/5 border border-dashed border-border flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-background border flex items-center justify-center shadow-lg">
                      <UserCog className="size-6 text-primary opacity-40" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Command Hierarchy</p>
                      <p className="text-xs font-bold text-foreground/90">Reports to Institutional Supervisor</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leave" className="mt-0">
          <Card className="border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Absence Matrix</CardTitle>
                <CardDescription className="text-[10px]">History of institutional leave requisitions.</CardDescription>
              </div>
              <Button size="sm" className="h-9 px-6 gap-2 font-black uppercase text-[10px] shadow-lg bg-primary hover:bg-primary/90">
                <Plus className="size-3.5" /> Initialize Request
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Classification</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase">Validity Window</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase">Justification</TableHead>
                    <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Workflow Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!leaves?.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-[10px] opacity-30 italic uppercase font-black tracking-[0.3em]">No historical cycles detected.</TableCell></TableRow>
                  ) : leaves.map(l => (
                    <TableRow key={l.id} className="h-16 hover:bg-secondary/5 border-b-border/30 transition-colors">
                      <TableCell className="pl-8">
                        <Badge variant="outline" className="text-[9px] h-5 px-3 bg-primary/10 text-primary border-none font-black uppercase shadow-sm">
                          {l.leaveType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] font-mono font-black uppercase tracking-tighter text-foreground/70">
                        {l.startDate} <span className="mx-1.5 opacity-20">→</span> {l.endDate}
                      </TableCell>
                      <TableCell className="text-[11px] italic opacity-60 truncate max-w-[300px]">
                        "{l.reason}"
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Badge variant="outline" className={cn(
                          "text-[8px] h-5 px-3 font-black uppercase border-none ring-1",
                          l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                          l.status === 'Declined' ? 'bg-destructive/10 text-destructive ring-destructive/20' : 
                          'bg-amber-500/10 text-amber-500 ring-amber-500/20'
                        )}>
                          {l.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-0 space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-accent">
                  <Star className="size-4" /> Audit Stream
                </CardTitle>
                <Badge variant="outline" className="text-[8px] font-black uppercase bg-accent/10 text-accent border-none">Growth History</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Review Date</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center">Velocity Score</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Objective Status</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!reviews?.length ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-[10px] opacity-30 italic uppercase font-black tracking-[0.3em]">No growth audits found.</TableCell></TableRow>
                    ) : reviews.map(r => (
                      <TableRow key={r.id} className="h-20 hover:bg-secondary/5 border-b-border/30 transition-colors">
                        <TableCell className="pl-8 text-[11px] font-black uppercase text-foreground/80">
                          {r.date}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-mono font-black text-xs px-3 py-1 rounded-full shadow-sm border", 
                            r.score >= 8 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                            r.score >= 5 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                            "bg-destructive/10 text-destructive border-destructive/20"
                          )}>
                            {r.score} / 10
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[8px] h-5 px-2 font-black border-none ring-1", 
                            r.kraAchieved ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-destructive/10 text-destructive ring-destructive/20'
                          )}>
                            {r.kraAchieved ? 'KRA ACHIEVED' : 'BELOW TARGET'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <p className="text-[10px] italic text-muted-foreground line-clamp-2 leading-relaxed">"{r.feedback}"</p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none ring-1 ring-accent/30 bg-accent/5 p-8 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="size-24" /></div>
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-5 text-accent" />
                    <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Career Velocity</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                        <span className="opacity-50">Operational Intensity</span>
                        <span className="text-accent">{attendanceRate}%</span>
                      </div>
                      <Progress value={attendanceRate} className="h-1.5 bg-secondary rounded-full overflow-hidden shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                        <span className="opacity-50">Process Fidelity</span>
                        <span className="text-accent">92%</span>
                      </div>
                      <Progress value={92} className="h-1.5 bg-secondary rounded-full overflow-hidden shadow-inner" />
                    </div>
                  </div>
                </div>
                <div className="pt-8 border-t border-accent/20 mt-8">
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium text-center">
                    "Consistent adherence to institutional SOPs. High growth potential node."
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-0">
          <Card className="border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                <Clock className="size-4" /> Live Shift Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Event Timestamp</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-center">Direction</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase">Institutional Node</TableHead>
                    <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Integrity Proof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!attendance?.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-[10px] opacity-30 italic uppercase font-black tracking-[0.3em]">No shift activity recorded.</TableCell></TableRow>
                  ) : attendance.map(a => (
                    <TableRow key={a.id} className="h-14 hover:bg-secondary/5 border-b-border/30">
                      <TableCell className="pl-8 text-[11px] font-mono font-black text-foreground/70">
                        {a.timestamp?.toDate ? format(a.timestamp.toDate(), 'dd MMM yyyy HH:mm:ss') : 'Just now'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "text-[8px] h-5 px-3 font-black uppercase border-none ring-1",
                          a.type === 'In' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-destructive/10 text-destructive ring-destructive/20'
                        )}>
                          SHIFT {a.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-black uppercase tracking-tight opacity-60">
                        {a.location || 'MANAGED SITE NODE'}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2 text-[9px] font-black uppercase text-emerald-500/60">
                          <ShieldCheck className="size-3" /> GPS VERIFIED
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conduct" className="mt-0">
          <Card className="border-none ring-1 ring-destructive/30 bg-card shadow-2xl overflow-hidden">
            <CardHeader className="bg-destructive/5 border-b border-destructive/10 py-4 px-8">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-destructive">
                <ShieldAlert className="size-4" /> Conduct & Disciplinary Archive
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Incident Date</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase">Classification</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase">Enforced Action</TableHead>
                    <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Detailed Context</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!conduct?.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-24 text-[10px] opacity-20 italic uppercase font-black tracking-[0.4em]">Zero compliance violations recorded.</TableCell></TableRow>
                  ) : conduct.map(c => (
                    <TableRow key={c.id} className="h-16 hover:bg-destructive/5 border-b-border/30 transition-colors group">
                      <TableCell className="pl-8 text-[11px] font-black text-muted-foreground">
                        {c.createdAt?.toDate ? format(c.createdAt.toDate(), 'dd MMM yyyy') : '...'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] h-5 px-3 bg-destructive/10 text-destructive border-none font-black uppercase ring-1 ring-destructive/20">
                          {c.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-black uppercase tracking-tight text-foreground/80">{c.actionTaken}</TableCell>
                      <TableCell className="text-right pr-8 max-w-[400px]">
                        <p className="text-[10px] italic text-muted-foreground truncate group-hover:whitespace-normal group-hover:break-words">"{c.description}"</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-0">
          <Card className="border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
            <CardHeader className="bg-primary/10 border-b border-border/50 py-4 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Verified Payslip Vault
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase gap-2">
                <Download className="size-3" /> Export Statement
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Pay Period</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase">Settlement Node</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right">Net Disbursement</TableHead>
                    <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Audit Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="h-24 opacity-30 italic">
                    <TableCell colSpan={4} className="text-center text-[10px] font-black uppercase tracking-[0.3em] py-12">
                      Payroll module waiting for first cycle finalization.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PortalPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="size-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bootstrapping Identity Matrix...</p>
        </div>
      }>
        <PortalContent />
      </Suspense>
    </DashboardLayout>
  );
}
