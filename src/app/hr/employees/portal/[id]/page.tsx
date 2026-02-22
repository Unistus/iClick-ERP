'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, where, doc, limit, orderBy } from "firebase/firestore";
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
  LogIn,
  ShieldX,
  Award,
  FileCheck,
  ArrowRight,
  Sparkles,
  Coffee,
  GraduationCap,
  HandCoins,
  Smartphone,
  SmartphoneNfc,
  PlayCircle,
  FileBadge
} from "lucide-react";
import { format, differenceInDays, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { recordAttendance, submitLeaveRequest } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";

function PortalContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user: authUser } = useUser();
  
  const employeeId = params.id as string;
  const selectedInstId = searchParams.get('instId') || "";

  // UI State
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isClocking, setIsClocking] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Data Fetching: Employee Core Profile
  const empRef = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return doc(db, 'institutions', selectedInstId, 'employees', employeeId);
  }, [db, selectedInstId, employeeId]);
  const { data: employee, isLoading: empLoading } = useDoc(empRef);

  // Data Fetching: Payslips Registry
  const payslipsQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'payslips'), 
      where('employeeId', '==', employeeId),
      orderBy('createdAt', 'desc'),
      limit(12)
    );
  }, [db, selectedInstId, employeeId]);
  const { data: payslips } = useCollection(payslipsQuery);

  // Data Fetching: Global Leave Types
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

  // Data Fetching: Training Enrollments
  const trainingQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'enrollments'), 
      where('employeeId', '==', employeeId)
    );
  }, [db, selectedInstId, employeeId]);
  const { data: enrollments } = useCollection(trainingQuery);

  // Data Fetching: Growth & Performance Reviews
  const reviewsQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'performance_reviews'), 
      where('employeeId', '==', employeeId)
    );
  }, [db, selectedInstId, employeeId]);
  const { data: reviews } = useCollection(reviewsQuery);

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

  // Metrics Calculation
  const avgPerformance = useMemo(() => {
    if (!reviews?.length) return 0;
    return reviews.reduce((sum, r) => sum + (r.score || 0), 0) / reviews.length;
  }, [reviews]);

  const kraAttainment = useMemo(() => {
    if (!reviews?.length) return 0;
    const met = reviews.filter(r => r.kraAchieved).length;
    return (met / reviews.length) * 100;
  }, [reviews]);

  // Resolve Names
  const resolvedDeptName = useMemo(() => {
    if (!departments || !employee?.departmentId) return "Operations Node";
    return departments.find(d => d.id === employee.departmentId)?.name || "Operations Node";
  }, [departments, employee?.departmentId]);

  const resolvedBranchName = useMemo(() => {
    if (!branches || !employee?.branchId) return "Central Hub";
    return branches.find(b => b.id === employee.branchId)?.name || "Central Hub";
  }, [branches, employee?.branchId]);

  // LEAVE LOGIC
  const leaveMatrix = useMemo(() => {
    if (!allLeaveTypes || !employee) return [];
    const eligible = allLeaveTypes.filter(lt => lt.genderApplicability === 'All' || lt.genderApplicability === employee.gender);
    return eligible.map(type => {
      const approved = leaves?.filter(l => l.leaveType === type.name && l.status === 'Approved').reduce((sum, l) => sum + (parseInt(l.days) || 0), 0) || 0;
      const pending = leaves?.filter(l => l.leaveType === type.name && l.status === 'Pending').reduce((sum, l) => sum + (parseInt(l.days) || 0), 0) || 0;
      return { ...type, used: approved, requested: pending, remaining: (type.daysPerYear || 0) - approved };
    });
  }, [allLeaveTypes, employee, leaves]);

  const handleClockAction = async (type: 'In' | 'Out' | 'BreakStart' | 'BreakEnd') => {
    if (!selectedInstId || isClocking) return;
    setIsClocking(true);
    try {
      await recordAttendance(db, selectedInstId, employeeId, type, resolvedBranchName);
      toast({ title: `Shift Event Logged: ${type}` });
      setIsClockModalOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Clock Error" });
    } finally {
      setIsClocking(false);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isSubmittingLeave || !employee) return;
    setIsSubmittingLeave(true);
    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount = isValid(start) && isValid(end) ? differenceInDays(end, start) + 1 : 0;
    if (dayCount <= 0) {
      toast({ variant: "destructive", title: "Invalid Dates" });
      setIsSubmittingLeave(false);
      return;
    }
    const data = { employeeId: employee.id, employeeName: `${employee.firstName} ${employee.lastName}`, leaveType: formData.get('leaveType') as string, startDate, endDate, days: dayCount.toString(), reason: formData.get('reason') as string };
    try {
      await submitLeaveRequest(db, selectedInstId, data);
      toast({ title: "Requisition Submitted" });
      setIsLeaveModalOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Submission Failed" });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  if (empLoading) return <div className="h-[60vh] flex flex-col items-center justify-center gap-4"><Loader2 className="size-10 animate-spin text-primary opacity-20" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bootstrapping Identity Matrix...</p></div>;
  if (!employee) return <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6"><ShieldX className="size-16 text-destructive opacity-20 mb-2" /><h2 className="text-xl font-headline font-black uppercase tracking-tighter">Identity Not Found</h2><Button variant="outline" className="mt-4 font-bold uppercase text-[10px] tracking-widest h-10 px-8" onClick={() => router.push('/hr/employees')}>Return to Directory</Button></div>;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* HEADER COMMAND CENTER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-card border border-border/50 p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden ring-1 ring-border/50">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none hidden md:block"><UserCog className="size-48" /></div>
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 w-full lg:w-auto">
          <div className="relative group">
            <div className="size-20 md:size-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-black text-3xl md:text-4xl uppercase shadow-inner border border-primary/20 transition-all group-hover:scale-105 group-hover:rotate-3">
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-background ring-2 ring-emerald-500 shadow-lg"><CheckCircle2 className="size-4 text-emerald-500" /></div>
          </div>
          <div className="space-y-2 text-center sm:text-left flex-1">
            <h1 className="text-2xl md:text-3xl font-headline font-black text-foreground tracking-tight">{employee.firstName} {employee.lastName}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Badge variant="secondary" className={cn("h-6 px-3 font-black uppercase border-none ring-1 shadow-sm", employee.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-amber-500/10 text-amber-500 ring-amber-500/20')}>{employee.status || 'PENDING'}</Badge>
              <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5 bg-secondary/30 px-2 py-1 rounded-md border border-border/50"><Briefcase className="size-3 text-primary" /> {employee.jobTitle}</span>
              <Button variant="outline" size="sm" onClick={() => setIsClockModalOpen(true)} className="h-8 md:h-7 text-[10px] font-black uppercase gap-2 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 shadow-sm"><Smartphone className="size-3" /> Quick Clock</Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="p-4 rounded-2xl bg-secondary/10 border border-border/50 text-center flex flex-col justify-center shadow-inner group hover:bg-primary/5 transition-all"><p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1 group-hover:text-primary">Absence Bal</p><p className="text-xl font-black text-primary">{employee.leaveBalance || 0} D</p></div>
          <div className="p-4 rounded-2xl bg-secondary/10 border border-border/50 text-center flex flex-col justify-center shadow-inner group hover:bg-accent/5 transition-all"><p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1 group-hover:text-accent">Audit Node</p><p className="text-xl font-black text-accent">{avgPerformance.toFixed(1)}</p></div>
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center hidden sm:flex flex-col justify-center shadow-sm"><p className="text-[8px] font-black uppercase text-primary tracking-widest mb-1">Status</p><p className="text-xl font-black text-foreground">LIVE</p></div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <div className="overflow-x-auto custom-scrollbar -mx-4 px-4">
          <TabsList className="bg-secondary/20 h-auto p-1 mb-8 flex-nowrap justify-start gap-1 bg-transparent border-b rounded-none w-full min-w-max">
            <TabsTrigger value="profile" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><User className="size-3.5" /> Identity</TabsTrigger>
            <TabsTrigger value="leave" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><CalendarDays className="size-3.5" /> Absence</TabsTrigger>
            <TabsTrigger value="payroll" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><HandCoins className="size-3.5" /> Payslips</TabsTrigger>
            <TabsTrigger value="training" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><GraduationCap className="size-3.5" /> Learning</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Star className="size-3.5" /> Scorecard</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs font-black uppercase tracking-widest gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Timer className="size-3.5" /> Shifts</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"><User className="size-4 text-primary" /> Biographical Core</CardTitle>
                {employee.gender === 'Male' ? <Mars className="size-4 text-blue-500" /> : <Venus className="size-4 text-pink-500" />}
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div><p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Official Email</p><p className="text-sm font-bold truncate">{employee.email}</p></div>
                  <div><p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Verified Phone</p><p className="text-sm font-bold">{employee.phone}</p></div>
                </div>
                <div className="pt-6 border-t border-border/50">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-4 flex items-center gap-2"><Fingerprint className="size-3" /> Statutory Matrix</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-secondary/5 border border-border/50"><p className="text-[8px] font-black uppercase text-muted-foreground opacity-50 mb-1">National ID</p><p className="text-xs font-black font-mono tracking-tighter">{employee.nationalId || '...'}</p></div>
                    <div className="p-3 rounded-xl bg-secondary/5 border border-border/50"><p className="text-[8px] font-black uppercase text-muted-foreground opacity-50 mb-1">KRA PIN</p><p className="text-xs font-black font-mono uppercase tracking-tighter">{employee.kraPin || '...'}</p></div>
                    <div className="p-3 rounded-xl bg-secondary/5 border border-border/50"><p className="text-[8px] font-black uppercase text-muted-foreground opacity-50 mb-1">NSSF Node</p><p className="text-xs font-black font-mono uppercase tracking-tighter">{employee.nssfNumber || '...'}</p></div>
                    <div className="p-3 rounded-xl bg-secondary/5 border border-border/50"><p className="text-[8px] font-black uppercase text-muted-foreground opacity-50 mb-1">NHIF Node</p><p className="text-xs font-black font-mono uppercase tracking-tighter">{employee.nhifNumber || '...'}</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"><Building className="size-4 text-accent" /> Institutional Topology</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm"><MapPin className="size-5 text-primary shrink-0" /><div className="min-w-0"><p className="text-[9px] font-black uppercase text-primary tracking-widest">Active Branch</p><p className="text-xs font-black uppercase mt-1 truncate">{resolvedBranchName}</p></div></div>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-accent/5 border border-accent/10 shadow-sm"><LayoutGrid className="size-5 text-accent shrink-0" /><div className="min-w-0"><p className="text-[9px] font-black uppercase text-accent tracking-widest">Dept. Node</p><p className="text-xs font-black uppercase mt-1 truncate">{resolvedDeptName}</p></div></div>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-2"><div className="p-4 rounded-2xl bg-secondary/5 border border-border/50 shadow-inner"><p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Contract Basis</p><p className="text-xs font-black uppercase">{employee.employmentType}</p></div><div className="p-4 rounded-2xl bg-secondary/5 border border-border/50 shadow-inner"><p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1">Effective Date</p><p className="text-xs font-black uppercase">{employee.hireDate ? format(new Date(employee.hireDate), 'dd MMM yy') : '...'}</p></div></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leave" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-12 items-start">
            <Card className="md:col-span-4 border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b py-4 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"><CalendarDays className="size-4 text-primary" /> Allowed Entitlements</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {leaveMatrix.map((type) => (
                    <div key={type.id} className="p-4 space-y-3 hover:bg-primary/5 transition-colors group">
                      <div className="flex justify-between items-center"><span className="text-xs font-black uppercase tracking-tight">{type.name}</span><Badge variant="outline" className="text-[8px] h-4 bg-primary/5 border-none font-black text-primary">{type.daysPerYear} DAYS/YR</Badge></div>
                      <div className="space-y-1.5"><div className="flex justify-between text-[8px] font-black uppercase tracking-widest"><span className="opacity-40">Consumed</span><span className="text-primary">{type.used} of {type.daysPerYear}</span></div><Progress value={(type.used / (type.daysPerYear || 1)) * 100} className="h-1 bg-secondary shadow-inner" /></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-8 border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8 flex items-center justify-between">
                <div><CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Absence History</CardTitle></div>
                <Button size="sm" className="h-9 px-6 gap-2 font-black uppercase text-[10px] shadow-lg bg-primary hover:bg-primary/90" onClick={() => setIsLeaveModalOpen(true)}><Plus className="size-3.5" /> Raise Request</Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/30"><TableRow><TableHead className="h-12 text-[9px] font-black uppercase pl-8">Category</TableHead><TableHead className="h-12 text-[9px] font-black uppercase">Validity Window</TableHead><TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Workflow Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {!leaves?.length ? <TableRow><TableCell colSpan={3} className="text-center py-20 text-[10px] opacity-30 italic uppercase font-black">No cycles detected.</TableCell></TableRow> : leaves.map(l => (
                      <TableRow key={l.id} className="h-16 hover:bg-secondary/5 border-b-border/30 transition-colors">
                        <TableCell className="pl-8"><Badge variant="secondary" className="text-[8px] h-5 px-3 bg-primary/10 text-primary border-none font-black uppercase">{l.leaveType}</Badge></TableCell>
                        <TableCell className="text-[11px] font-mono font-black uppercase tracking-tighter text-foreground/70">{l.startDate} → {l.endDate}</TableCell>
                        <TableCell className="text-right pr-8"><Badge variant="outline" className={cn("text-[8px] h-5 px-3 font-black uppercase border-none ring-1", l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : l.status === 'Declined' ? 'bg-destructive/10 text-destructive ring-destructive/20' : 'bg-amber-500/10 text-amber-500 ring-amber-500/20 animate-pulse')}>{l.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b py-4 px-8 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shadow-inner"><HandCoins className="size-5" /></div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Remuneration Vault</CardTitle>
                  <CardDescription className="text-[10px]">Verified digital payslips and statutory summaries.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Period Reference</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-center">Lifecycle</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right">Net Take-home</TableHead>
                    <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Command</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!payslips?.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-24 text-[10px] opacity-20 uppercase font-black italic">No finalized records in identity vault.</TableCell></TableRow>
                  ) : payslips.map(ps => (
                    <TableRow key={ps.id} className="h-16 hover:bg-emerald-500/5 transition-all group border-b-border/30">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary"><FileBadge className="size-4" /></div>
                          <span className="font-black uppercase text-xs">{ps.periodName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[8px] h-5 bg-emerald-500/10 text-emerald-500 border-none ring-1 ring-emerald-500/20 font-black uppercase">
                          <CheckCircle2 className="size-2 mr-1.5" /> VERIFIED SLIP
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-black text-sm text-emerald-500">
                        KES {ps.netSalary?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          <Button size="sm" variant="ghost" className="h-8 px-4 text-[9px] font-black uppercase gap-2 hover:bg-primary/10 text-primary">
                            <Download className="size-3.5" /> Export PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!enrollments?.length ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] opacity-20"><GraduationCap className="size-16 mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-xs">No active training enrollments.</p></div>
            ) : enrollments.map(en => (
              <Card key={en.id} className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="bg-primary/5 pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-[8px] font-black uppercase bg-primary/10 text-primary border-none">{en.category}</Badge>
                    <span className="text-[8px] font-mono opacity-40 uppercase">Enrolled: {format(en.createdAt?.toDate ? en.createdAt.toDate() : new Date(), 'dd MMM')}</span>
                  </div>
                  <CardTitle className="text-sm font-black uppercase leading-tight tracking-tight">{en.courseName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5"><div className="flex justify-between text-[8px] font-black uppercase"><span>Course Progress</span><span className="text-primary">{en.progress || 0}%</span></div><Progress value={en.progress || 0} className="h-1 bg-secondary shadow-inner" /></div>
                </CardContent>
                <CardFooter className="bg-secondary/10 border-t border-border/50 p-4"><Button className="w-full h-9 font-black uppercase text-[10px] gap-2 shadow-lg bg-primary hover:bg-primary/90"><PlayCircle className="size-3.5" /> Resume Learning</Button></CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex items-center justify-between"><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-accent"><Star className="size-4" /> Growth History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/30"><TableRow><TableHead className="h-12 text-[9px] font-black uppercase pl-8">Review Date</TableHead><TableHead className="h-12 text-[9px] font-black uppercase text-center">Score</TableHead><TableHead className="h-12 text-[9px] font-black uppercase">Feedback Summary</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {!reviews?.length ? <TableRow><TableCell colSpan={3} className="text-center py-20 text-[10px] opacity-30 italic uppercase font-black">No audits found.</TableCell></TableRow> : reviews.map(r => (
                      <TableRow key={r.id} className="h-20 hover:bg-secondary/5 border-b-border/30 transition-colors">
                        <TableCell className="pl-8 text-[11px] font-black uppercase text-foreground/80">{r.date}</TableCell>
                        <TableCell className="text-center"><span className={cn("font-mono font-black text-xs px-3 py-1 rounded-full border", r.score >= 8 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>{r.score} / 10</span></TableCell>
                        <TableCell className="text-right pr-8 italic text-muted-foreground text-[10px] truncate max-w-[250px]">"{r.feedback}"</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col justify-between shadow-inner">
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Process Velocity</p>
                <div className="space-y-6">
                  <div className="space-y-2"><div className="flex justify-between text-[9px] font-black uppercase"><span>Performance</span><span>{avgPerformance.toFixed(1)}</span></div><Progress value={avgPerformance * 10} className="h-1.5 bg-secondary shadow-inner" /></div>
                  <div className="space-y-2"><div className="flex justify-between text-[9px] font-black uppercase"><span>KRA Realization</span><span>{kraAttainment.toFixed(0)}%</span></div><Progress value={kraAttainment} className="h-1.5 bg-secondary shadow-inner" /></div>
                </div>
              </div>
              <div className="p-4 bg-background rounded-2xl border border-border/50 mt-8 flex items-center gap-3 shadow-md"><Award className="size-5 text-accent" /><p className="text-[9px] font-black uppercase leading-tight">Elite Performance Tier: ACTIVATED</p></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b py-4 px-8"><CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary"><Timer className="size-4" /> Live Shift Stream</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/30"><TableRow><TableHead className="h-12 text-[9px] font-black uppercase pl-8">Timestamp</TableHead><TableHead className="h-12 text-[9px] font-black uppercase text-center">Direction</TableHead><TableHead className="h-12 text-[9px] font-black uppercase">Institutional Node</TableHead><TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Proof</TableHead></TableRow></TableHeader>
                <TableBody>
                  {!attendance?.length ? <TableRow><TableCell colSpan={4} className="text-center py-20 text-[10px] opacity-30 italic uppercase font-black">No shift activity recorded.</TableCell></TableRow> : attendance.map(a => (
                    <TableRow key={a.id} className="h-14 hover:bg-secondary/5 border-b-border/30">
                      <TableCell className="pl-8 text-[11px] font-mono font-black text-foreground/70">{a.timestamp?.toDate ? format(a.timestamp.toDate(), 'dd MMM HH:mm:ss') : '...'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[8px] h-5 px-3 font-black uppercase border-none ring-1", a.type === 'In' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : a.type.includes('Break') ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>{a.type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-black uppercase tracking-tight opacity-60">{a.location || 'MANAGED HUB'}</TableCell>
                      <TableCell className="text-right pr-8 text-[9px] font-black uppercase text-emerald-500/60 flex items-center justify-end gap-1.5 mt-4"><ShieldCheck className="size-3" /> GPS VERIFIED</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QUICK CLOCK DIALOG */}
      <Dialog open={isClockModalOpen} onOpenChange={setIsClockModalOpen}>
        <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-3xl overflow-hidden border-none p-0">
          <div className="bg-gradient-to-br from-primary via-primary/90 to-accent p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><SmartphoneNfc className="size-32 rotate-12" /></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner"><Clock className="size-5" /></div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-widest">Mobile Shift Node</h3>
                <p className="text-[10px] font-bold uppercase opacity-70">Identity: {employee?.firstName} {employee?.lastName}</p>
              </div>
            </div>
            <div className="text-center py-4 relative z-10">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.4em] mb-2">Network Time (EAT)</p>
              <p className="text-6xl font-black font-headline tracking-tighter drop-shadow-2xl">{format(new Date(), 'HH:mm')}</p>
            </div>
          </div>
          <div className="p-8 bg-card space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => handleClockAction('In')} disabled={isClocking} className="h-16 font-black uppercase text-xs bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-900/20 rounded-2xl group transition-all active:scale-95"><LogIn className="size-5 mr-2 group-hover:translate-x-1 transition-transform" /> Clock In</Button>
              <Button onClick={() => handleClockAction('Out')} disabled={isClocking} className="h-16 font-black uppercase text-xs bg-destructive hover:bg-destructive/90 shadow-xl shadow-destructive/20 rounded-2xl group transition-all active:scale-95"><LogOut className="size-5 mr-2 group-hover:-translate-x-1 transition-transform" /> Clock Out</Button>
              <Button onClick={() => handleClockAction('BreakStart')} disabled={isClocking} className="h-16 font-black uppercase text-xs bg-primary hover:bg-primary/90 col-span-2 shadow-xl rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95"><Coffee className="size-5" /> <span>Take Breather</span></Button>
            </div>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center"><p className="text-[9px] text-muted-foreground font-medium italic flex items-center justify-center gap-2"><ShieldCheck className="size-3 text-emerald-500" /> GPS & Biometric handshake verified from {resolvedBranchName}.</p></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LEAVE REQUEST DIALOG */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-3xl">
          <form onSubmit={handleLeaveSubmit}>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2"><CalendarDays className="size-5 text-primary" /><DialogTitle className="text-lg font-bold uppercase">Raise Absence Requisition</DialogTitle></div>
              <DialogDescription className="text-xs uppercase font-black tracking-tight text-primary">Self-Service Identity Node</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-xs">
              <div className="space-y-2">
                <Label className="uppercase font-bold tracking-widest opacity-60 text-primary">Eligibility Category</Label>
                <Select name="leaveType" required>
                  <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5">
                    <SelectValue placeholder="Select Entitlement..." />
                  </SelectTrigger>
                  <SelectContent>{leaveMatrix.map(lt => <SelectItem key={lt.id} value={lt.name} className="text-[10px] font-black uppercase">{lt.name} ({lt.remaining} Days Remaining)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="uppercase font-bold tracking-widest opacity-60">Start Window</Label><Input name="startDate" type="date" required className="h-11 bg-background" /></div>
                <div className="space-y-2"><Label className="uppercase font-bold tracking-widest opacity-60">End Window</Label><Input name="endDate" type="date" required className="h-11 bg-background" /></div>
              </div>
              <div className="space-y-2"><Label className="uppercase font-bold tracking-widest opacity-60">Justification / Reason</Label><Input name="reason" placeholder="Briefly explain the requirement..." required className="h-11 bg-secondary/5 border-none ring-1 ring-border" /></div>
              
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-4 items-start text-primary shadow-inner">
                <Sparkles className="size-5 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest">Audit Logic</p>
                  <p className="text-[11px] leading-relaxed italic font-medium">Approval will atomically update your annual balance.</p>
                </div>
              </div>
            </div>
            <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2 border-t border-border/50">
              <Button type="button" variant="ghost" onClick={() => setIsLeaveModalOpen(false)} className="text-xs h-11 font-black uppercase tracking-widest">Discard</Button>
              <Button type="submit" disabled={isSubmittingLeave} className="h-11 px-10 font-bold uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2">{isSubmittingLeave ? <Loader2 className="size-3 animate-spin" /> : <ArrowRight className="size-4" />} Commit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PortalPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="h-[60vh] flex flex-col items-center justify-center gap-4"><Loader2 className="size-10 animate-spin text-primary opacity-20" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bootstrapping Identity Matrix...</p></div>}>
        <PortalContent />
      </Suspense>
    </DashboardLayout>
  );
}
