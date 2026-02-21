
'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, where, doc, limit } from "firebase/firestore";
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
  Heart,
  Fingerprint,
  Scale,
  LogOut,
  LogIn
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { recordAttendance } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";

function PortalContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user: authUser } = useUser();
  
  const employeeId = params.id as string;
  const selectedInstId = searchParams.get('instId') || "";

  // Attendance Modal State
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const [isClocking, setIsClocking] = useState(false);

  // Data Fetching: Employee Core Profile
  const empRef = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return doc(db, 'institutions', selectedInstId, 'employees', employeeId);
  }, [db, selectedInstId, employeeId]);
  const { data: employee, isLoading: empLoading } = useDoc(empRef);

  // Data Fetching: Global Leave Types (from setup)
  const leaveTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'leave_types');
  }, [db, selectedInstId]);
  const { data: allLeaveTypes } = useCollection(leaveTypesRef);

  // Data Fetching: Leave History
  const leaveQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'leave_requests'), 
      where('employeeId', '==', employeeId)
    );
  }, [db, selectedInstId, employeeId]);
  const { data: leaves } = useCollection(leaveQuery);

  // Data Fetching: Growth & Performance Reviews
  const reviewsQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'performance_reviews'), 
      where('employeeId', '==', employeeId)
    );
  }, [db, selectedInstId, employeeId]);
  const { data: reviews } = useCollection(reviewsQuery);

  // Data Fetching: Conduct & Disciplinary Archive
  const conductQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'disciplinary_records'), 
      where('employeeId', '==', employeeId)
    );
  }, [db, selectedInstId, employeeId]);
  const { data: conduct } = useCollection(conductQuery);

  // Data Fetching: Real-time Attendance Stream
  const attQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'attendance'), 
      where('employeeId', '==', employeeId),
      limit(20)
    );
  }, [db, selectedInstId, employeeId]);
  const { data: attendance } = useCollection(attQuery);

  // Data Fetching: Institutional Structure
  const branchesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'branches');
  }, [db, selectedInstId]);
  const { data: branches } = useCollection(branchesRef);

  const deptsRef = useMemoFirebase(() => {
    if (!selectedInstId || !employee?.branchId) return null;
    return collection(db, 'institutions', selectedInstId, 'branches', employee.branchId, 'departments');
  }, [db, selectedInstId, employee?.branchId]);
  const { data: departments } = useCollection(deptsRef);

  // Resolve Names
  const resolvedDeptName = useMemo(() => {
    if (!departments || !employee?.departmentId) return "Operations Node";
    return departments.find(d => d.id === employee.departmentId)?.name || "Operations Node";
  }, [departments, employee?.departmentId]);

  const resolvedBranchName = useMemo(() => {
    if (!branches || !employee?.branchId) return "Central Hub";
    return branches.find(b => b.id === employee.branchId)?.name || "Central Hub";
  }, [branches, employee?.branchId]);

  // LEAVE LOGIC: Calculate usage per type
  const leaveMatrix = useMemo(() => {
    if (!allLeaveTypes || !employee) return [];
    
    // Filter types by gender
    const eligible = allLeaveTypes.filter(lt => 
      lt.genderApplicability === 'All' || 
      lt.genderApplicability === employee.gender
    );

    return eligible.map(type => {
      const used = leaves?.filter(l => l.leaveType === type.name && l.status === 'Approved')
        .reduce((sum, l) => sum + (parseInt(l.days) || 0), 0) || 0;
      
      const requested = leaves?.filter(l => l.leaveType === type.name && l.status === 'Pending')
        .reduce((sum, l) => sum + (parseInt(l.days) || 0), 0) || 0;

      return {
        ...type,
        used,
        requested,
        remaining: (type.daysPerYear || 0) - used
      };
    });
  }, [allLeaveTypes, employee, leaves]);

  const handleClockAction = async (type: 'In' | 'Out') => {
    if (!selectedInstId || isClocking) return;
    setIsClocking(true);
    try {
      await recordAttendance(db, selectedInstId, employeeId, type, resolvedBranchName);
      toast({ title: `Successfully Clocked ${type}` });
      setIsClockModalOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Clock Error" });
    } finally {
      setIsClocking(false);
    }
  };

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
        <Button variant="outline" size="sm" onClick={() => router.push('/hr/employees')} className="mt-4">Return to Directory</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsClockModalOpen(true)}
                className="h-7 text-[10px] font-black uppercase gap-2 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 shadow-sm"
              >
                <Clock className="size-3" /> Quick Clock
              </Button>
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
            <p className="text-xl font-black text-accent">{(reviews?.length ? reviews.reduce((s, r) => s + r.score, 0) / reviews.length : 0).toFixed(1)}/10</p>
          </div>
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center hidden sm:flex flex-col justify-center">
            <p className="text-[8px] font-black uppercase text-primary tracking-widest mb-1">Status</p>
            <p className="text-xl font-black text-foreground">{employee.status?.toUpperCase()}</p>
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

        {/* PROFILE TAB */}
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
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Official Email</p>
                    <p className="text-sm font-bold truncate">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Verified Phone</p>
                    <p className="text-sm font-bold">{employee.phone}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-4 flex items-center gap-2">
                    <Fingerprint className="size-3" /> Statutory & Compliance Matrix
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-secondary/5 border border-border/50">
                      <p className="text-[8px] font-black uppercase text-muted-foreground opacity-50 mb-1">National ID</p>
                      <p className="text-xs font-black font-mono tracking-tighter">{employee.nationalId || 'NOT RECORDED'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/5 border border-border/50">
                      <p className="text-[8px] font-black uppercase text-muted-foreground opacity-50 mb-1">KRA PIN</p>
                      <p className="text-xs font-black font-mono uppercase tracking-tighter">{employee.kraPin || 'NOT RECORDED'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/5 border border-border/50">
                      <p className="text-[8px] font-black uppercase text-muted-foreground opacity-50 mb-1">NSSF Node</p>
                      <p className="text-xs font-black font-mono tracking-tighter">{employee.nssfNumber || 'NOT RECORDED'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/5 border border-border/50">
                      <p className="text-[8px] font-black uppercase text-muted-foreground opacity-50 mb-1">NHIF Node</p>
                      <p className="text-xs font-black font-mono tracking-tighter">{employee.nhifNumber || 'NOT RECORDED'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-3 flex items-center gap-2">
                    <Heart className="size-3" /> Kin Verification Node
                  </p>
                  <div className="p-4 rounded-2xl bg-secondary/10 border border-dashed border-border flex items-center justify-between group hover:bg-secondary/20 transition-all">
                    <div>
                      <p className="text-xs font-black uppercase">{employee.nextOfKin?.name || 'NOT DEFINED'}</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">{employee.nextOfKin?.relation || 'Guardian Node'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-black text-primary">{employee.nextOfKin?.phone || '...'}</p>
                      <p className="text-[8px] text-muted-foreground uppercase tracking-widest font-black">Emergency Line</p>
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
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase text-primary tracking-widest">Active Branch</p>
                      <p className="text-xs font-black uppercase mt-1 truncate">{resolvedBranchName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-accent/5 border border-accent/10">
                    <LayoutGrid className="size-5 text-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase text-accent tracking-widest">Dept. Node</p>
                      <p className="text-xs font-black uppercase mt-1 truncate">{resolvedDeptName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="p-4 rounded-2xl bg-secondary/5 border border-border/50">
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Contract Basis</p>
                    <p className="text-xs font-black uppercase">{employee.employmentType || 'Permanent'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/5 border border-border/50">
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Effective Date</p>
                    <p className="text-xs font-black uppercase">{employee.hireDate ? format(new Date(employee.hireDate), 'dd MMM yyyy') : '...'}</p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-secondary/5 border border-dashed border-border flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-background border flex items-center justify-center shadow-lg">
                      <UserCog className="size-6 text-primary opacity-40" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Command Hierarchy</p>
                      <p className="text-xs font-bold text-foreground/90">Institutional Supervisor: ACTIVE</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* LEAVE TAB: ABSENCE MATRIX */}
        <TabsContent value="leave" className="mt-0 space-y-6">
          <div className="grid gap-6 md:grid-cols-12 items-start">
            <Card className="md:col-span-4 border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b py-4 px-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" /> Allowed Entitlements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {leaveMatrix.map((type) => (
                    <div key={type.id} className="p-4 space-y-3 hover:bg-primary/5 transition-colors group">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-tight">{type.name}</span>
                        <Badge variant="outline" className="text-[8px] h-4 bg-primary/5 border-none font-black text-primary">
                          {type.daysPerYear} DAYS/YR
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                          <span className="opacity-40">Consumed</span>
                          <span className="text-primary">{type.used} of {type.daysPerYear}</span>
                        </div>
                        <Progress value={(type.used / (type.daysPerYear || 1)) * 100} className="h-1 bg-secondary shadow-inner" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-8 border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8 flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Absence History</CardTitle>
                  <CardDescription className="text-[10px]">Lifecycle of institutional leave requisitions.</CardDescription>
                </div>
                <Button size="sm" className="h-9 px-6 gap-2 font-black uppercase text-[10px] shadow-lg bg-primary hover:bg-primary/90" onClick={() => router.push('/hr/leave')}>
                  <Plus className="size-3.5" /> Raise Request
                </Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow>
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Category</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Validity Window</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Justification</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!leaves?.length ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-[10px] opacity-30 italic uppercase font-black tracking-[0.3em]">No historical cycles detected.</TableCell></TableRow>
                    ) : leaves.map(l => (
                      <TableRow key={l.id} className="h-16 hover:bg-secondary/5 border-b-border/30 transition-colors">
                        <TableCell className="pl-8">
                          <Badge variant="secondary" className="text-[8px] h-5 px-3 bg-primary/10 text-primary border-none font-black uppercase shadow-sm">
                            {l.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] font-mono font-black uppercase tracking-tighter text-foreground/70">
                          {l.startDate} <span className="mx-1.5 opacity-20">→</span> {l.endDate}
                        </TableCell>
                        <TableCell className="text-[11px] italic opacity-60 truncate max-w-[200px]">
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
          </div>
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="mt-0 space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-accent">
                  <Star className="size-4" /> Growth History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Review Date</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center">Score</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!reviews?.length ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-20 text-[10px] opacity-30 italic uppercase font-black tracking-[0.3em]">No audits found.</TableCell></TableRow>
                    ) : reviews.map(r => (
                      <TableRow key={r.id} className="h-20 hover:bg-secondary/5 border-b-border/30 transition-colors">
                        <TableCell className="pl-8 text-[11px] font-black uppercase text-foreground/80">{r.date}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-mono font-black text-xs px-3 py-1 rounded-full border", 
                            r.score >= 8 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                          )}>
                            {r.score} / 10
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-8 italic text-muted-foreground text-[10px] truncate max-w-[200px]">"{r.feedback}"</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col justify-between">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Process Velocity</p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase"><span>Performance</span><span>{avgPerformance.toFixed(1)}</span></div>
                    <Progress value={avgPerformance * 10} className="h-1" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase"><span>KRA Drift</span><span>{kraAttainment.toFixed(0)}%</span></div>
                    <Progress value={kraAttainment} className="h-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="mt-0">
          <Card className="border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b py-4 px-8">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                <Timer className="size-4" /> Live Shift Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Timestamp</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-center">Direction</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase">Institutional Node</TableHead>
                    <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Proof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!attendance?.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-[10px] opacity-30 italic uppercase font-black">No shift activity recorded.</TableCell></TableRow>
                  ) : attendance.map(a => (
                    <TableRow key={a.id} className="h-14 hover:bg-secondary/5 border-b-border/30">
                      <TableCell className="pl-8 text-[11px] font-mono font-black text-foreground/70">
                        {a.timestamp?.toDate ? format(a.timestamp.toDate(), 'dd MMM HH:mm:ss') : '...'}
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
                      <TableCell className="text-right pr-8 text-[9px] font-black uppercase text-emerald-500/60 flex items-center justify-end gap-1.5 mt-4">
                        <ShieldCheck className="size-3" /> VERIFIED
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONDUCT TAB */}
        <TabsContent value="conduct" className="mt-0">
          <Card className="border-none ring-1 ring-destructive/30 bg-card shadow-2xl overflow-hidden">
            <CardHeader className="bg-destructive/5 border-b border-destructive/10 py-4 px-8 flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-destructive">
                <ShieldAlert className="size-4" /> Conduct & Compliance Archive
              </CardTitle>
              <Badge variant="outline" className="text-[8px] bg-destructive/10 text-destructive font-black border-none uppercase">Immutable</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Incident Date</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase">Classification</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase">Action</TableHead>
                    <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!conduct?.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-24 text-[10px] opacity-20 italic uppercase font-black">Zero compliance violations recorded.</TableCell></TableRow>
                  ) : conduct.map(c => (
                    <TableRow key={c.id} className="h-16 hover:bg-destructive/5 border-b-border/30 group transition-colors">
                      <TableCell className="pl-8 text-[11px] font-black text-muted-foreground">{c.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] h-5 px-3 bg-destructive/10 text-destructive border-none font-black uppercase ring-1 ring-destructive/20">
                          {c.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-black uppercase text-foreground/80">{c.actionTaken}</TableCell>
                      <TableCell className="text-right pr-8 max-w-[400px] truncate text-[10px] italic text-muted-foreground">
                        "{c.description}"
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYROLL TAB */}
        <TabsContent value="payroll" className="mt-0">
          <Card className="border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
            <CardHeader className="bg-primary/10 border-b border-border/50 py-4 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <FileText className="size-4" /> Verified Settlement Vault
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase gap-2"><Download className="size-3" /> Export All</Button>
            </CardHeader>
            <CardContent className="p-20 text-center text-[10px] opacity-30 italic uppercase font-black tracking-[0.3em]">
              Payroll module waiting for institutional cycle finalization.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CLOCK MODAL */}
      <Dialog open={isClockModalOpen} onOpenChange={setIsClockModalOpen}>
        <DialogContent className="max-w-xs shadow-2xl ring-1 ring-border rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Timer className="size-5 text-primary" />
              <DialogTitle className="text-sm font-black uppercase tracking-widest">Shift Hub</DialogTitle>
            </div>
            <DialogDescription className="text-xs">Location Node: {resolvedBranchName}</DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center space-y-2">
            <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">Local Network Time</p>
            <p className="text-4xl font-black font-headline tracking-widest">{format(new Date(), 'HH:mm')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => handleClockAction('In')} 
              disabled={isClocking} 
              className="h-14 font-black uppercase text-xs bg-emerald-600 hover:bg-emerald-700 shadow-xl"
            >
              <LogIn className="size-4 mr-2" /> Start
            </Button>
            <Button 
              onClick={() => handleClockAction('Out')} 
              disabled={isClocking} 
              className="h-14 font-black uppercase text-xs bg-destructive hover:bg-destructive/90 shadow-xl"
            >
              <LogOut className="size-4 mr-2" /> End
            </Button>
          </div>
          <div className="mt-4 p-3 bg-secondary/20 rounded-xl border border-dashed border-border text-[9px] text-muted-foreground text-center">
            <ShieldCheck className="size-3 text-emerald-500 inline mr-1" /> All events are geo-tagged and hashed for audit.
          </div>
        </DialogContent>
      </Dialog>
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
