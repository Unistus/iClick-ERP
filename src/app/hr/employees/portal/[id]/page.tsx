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
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function PortalContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const db = useFirestore();
  
  const employeeId = params.id as string;
  const selectedInstId = searchParams.get('instId') || "";

  // Data Fetching: Employee Core
  const empRef = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return doc(db, 'institutions', selectedInstId, 'employees', employeeId);
  }, [db, selectedInstId, employeeId]);
  const { data: employee, isLoading: empLoading } = useDoc(empRef);

  // Data Fetching: Leave History
  const leaveQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'leave_requests'), where('employeeId', '==', employeeId), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId, employeeId]);
  const { data: leaves } = useCollection(leaveQuery);

  // Data Fetching: Performance Reviews
  const reviewsQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'performance_reviews'), where('employeeId', '==', employeeId), orderBy('date', 'desc'));
  }, [db, selectedInstId, employeeId]);
  const { data: reviews } = useCollection(reviewsQuery);

  // Data Fetching: Disciplinary Records
  const conductQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'disciplinary_records'), where('employeeId', '==', employeeId), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId, employeeId]);
  const { data: conduct } = useCollection(conductQuery);

  // Data Fetching: Attendance
  const attQuery = useMemoFirebase(() => {
    if (!selectedInstId || !employeeId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'attendance'), where('employeeId', '==', employeeId), orderBy('timestamp', 'desc'), limit(10));
  }, [db, selectedInstId, employeeId]);
  const { data: attendance } = useCollection(attQuery);

  const avgPerformance = useMemo(() => {
    if (!reviews?.length) return 0;
    return reviews.reduce((sum, r) => sum + (r.score || 0), 0) / reviews.length;
  }, [reviews]);

  if (empLoading) {
    return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  if (!employee) {
    return <div className="p-12 text-center text-muted-foreground">Identity node not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* PORTAL HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card border border-border/50 p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><UserCog className="size-32" /></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-3xl uppercase shadow-inner border border-primary/20">
            {employee.firstName?.[0]}{employee.lastName?.[0]}
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold text-foreground">
              {employee.firstName} {employee.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="h-6 px-3 bg-emerald-500/10 text-emerald-500 font-bold uppercase border-none ring-1 ring-emerald-500/20">
                {employee.status}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="size-3.5" /> {employee.jobTitle}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Hash className="size-3.5" /> {employee.employeeId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 flex-1 md:flex-none text-center min-w-[120px]">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Leave Balance</p>
            <p className="text-xl font-black text-primary">{employee.leaveBalance || 0} DAYS</p>
          </div>
          <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 flex-1 md:flex-none text-center min-w-[120px]">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Performance</p>
            <p className="text-xl font-black text-accent">{avgPerformance.toFixed(1)}/10</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none">
          <TabsTrigger value="profile" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><User className="size-3.5" /> Identity Node</TabsTrigger>
          <TabsTrigger value="leave" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><CalendarDays className="size-3.5" /> Absence Matrix</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Star className="size-3.5" /> Growth Scorecard</TabsTrigger>
          <TabsTrigger value="conduct" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><ShieldAlert className="size-3.5" /> Conduct Archive</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><BadgeCent className="size-3.5" /> Settlement Node</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <User className="size-4 text-primary" /> Biographical Core
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">Government ID</p>
                    <p className="text-sm font-bold font-mono">{employee.nationalId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">KRA PIN</p>
                    <p className="text-sm font-bold font-mono uppercase">{employee.kraPin}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">Contact Email</p>
                    <p className="text-sm font-bold">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">Secure Mobile</p>
                    <p className="text-sm font-bold">{employee.phone}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50">
                  <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 mb-2">Emergency Contact Node</p>
                  <div className="p-3 rounded-xl bg-secondary/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase">{employee.nextOfKin?.name || 'NOT DEFINED'}</p>
                      <p className="text-[10px] text-muted-foreground italic">{employee.nextOfKin?.relation}</p>
                    </div>
                    <p className="text-xs font-mono font-bold text-primary">{employee.nextOfKin?.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Building className="size-4 text-accent" /> Institutional Placement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-primary/10 text-primary"><MapPin className="size-4" /></div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">Branch</p>
                      <p className="text-sm font-bold uppercase">{employee.branchId || 'Central'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-accent/10 text-accent"><LayoutGrid className="size-4" /></div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">Department</p>
                      <p className="text-sm font-bold uppercase">{employee.departmentId || 'Operations'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-secondary/5 border border-dashed border-border/50 flex items-center gap-4">
                  <UserCircle className="size-10 text-primary opacity-30" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Reporting Manager</p>
                    <p className="text-sm font-bold text-foreground/90">Institutional Supervisor Node</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leave" className="space-y-6">
          <Card className="border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Absence Requisition History</CardTitle>
              <Button size="sm" className="h-8 gap-2 font-bold uppercase text-[9px]"><Plus className="size-3" /> New Request</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Leave Category</TableHead>
                    <TableHead className="h-10 text-[9px] font-black uppercase">Time Window</TableHead>
                    <TableHead className="h-10 text-[9px] font-black uppercase">Justification</TableHead>
                    <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!leaves?.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs opacity-30 italic uppercase font-bold">No absence cycles found.</TableCell></TableRow>
                  ) : leaves.map(l => (
                    <TableRow key={l.id} className="h-14 hover:bg-secondary/5 border-b-border/30">
                      <TableCell className="pl-6">
                        <Badge variant="outline" className="text-[8px] h-5 bg-primary/5 text-primary border-none font-black uppercase">
                          {l.leaveType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono font-bold uppercase tracking-tighter opacity-70">{l.startDate} to {l.endDate}</TableCell>
                      <TableCell className="text-[11px] italic opacity-60 truncate max-w-[250px]">"{l.reason}"</TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge variant="outline" className={cn(
                          "text-[8px] h-5 px-2.5 font-black uppercase border-none ring-1",
                          l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-amber-500/10 text-amber-500 ring-amber-500/20 animate-pulse'
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

        <TabsContent value="performance" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Star className="size-4 text-accent" /> Performance Scorecard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Review Date</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-center">Score</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">KRA Status</TableHead>
                      <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Manager Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!reviews?.length ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs opacity-30 italic uppercase font-bold">No historical audits.</TableCell></TableRow>
                    ) : reviews.map(r => (
                      <TableRow key={r.id} className="h-16 hover:bg-secondary/5 border-b-border/30 group">
                        <TableCell className="pl-6 text-[10px] font-bold uppercase">{format(new Date(r.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-mono font-black text-xs px-2 py-0.5 rounded", 
                            r.score >= 8 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                          )}>
                            {r.score}/10
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[8px] h-4 font-black border-none", 
                            r.kraAchieved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                          )}>
                            {r.kraAchieved ? 'KRA ACHIEVED' : 'BELOW TARGET'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 max-w-[200px]">
                          <p className="text-[10px] italic text-muted-foreground line-clamp-2">"{r.feedback}"</p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-border bg-accent/5 p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-accent" />
                  <p className="text-[10px] font-black uppercase text-accent tracking-widest">Growth Velocity</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="opacity-50">Technical Proficiency</span>
                    <span className="text-accent">84%</span>
                  </div>
                  <div className="h-1 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-accent w-[84%]" /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="opacity-50">Process Adherence</span>
                    <span className="text-accent">92%</span>
                  </div>
                  <div className="h-1 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-accent w-[92%]" /></div>
                </div>
              </div>
              <div className="pt-6 border-t border-border/50">
                <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                  "Employee shows consistent process excellence. Recommended for cross-training in Senior Node leadership."
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conduct" className="space-y-6">
          <Card className="border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
            <CardHeader className="bg-destructive/10 border-b border-destructive/20 py-4 px-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="size-4 text-destructive" /> Compliance & Conduct Archive
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Incident Timestamp</TableHead>
                    <TableHead className="h-10 text-[9px] font-black uppercase">Classification</TableHead>
                    <TableHead className="h-10 text-[9px] font-black uppercase">Action Enforced</TableHead>
                    <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Context</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!conduct?.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs opacity-30 italic uppercase font-bold">Zero conduct violations recorded.</TableCell></TableRow>
                  ) : conduct.map(c => (
                    <TableRow key={c.id} className="h-14 hover:bg-destructive/5 border-b-border/30">
                      <TableCell className="pl-6 text-[10px] font-mono text-muted-foreground">
                        {c.createdAt?.toDate ? format(c.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '...'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] h-4 bg-destructive/10 text-destructive border-none font-black uppercase">
                          {c.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold uppercase">{c.actionTaken}</TableCell>
                      <TableCell className="text-right pr-6 max-w-[300px]">
                        <p className="text-[10px] text-muted-foreground italic truncate">"{c.description}"</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <div className="grid md:grid-cols-12 gap-6">
            <Card className="md:col-span-8 border-none ring-1 ring-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="bg-primary/10 border-b border-primary/20">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <FileText className="size-4 text-primary" /> Payslip Vault
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Pay Period</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Method</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-right">Net Settlement</TableHead>
                      <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="h-14 opacity-30 italic">
                      <TableCell colSpan={4} className="text-center text-[10px] font-black uppercase tracking-widest py-12">
                        Payroll module integration pending first cycle finalization.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="md:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border bg-card p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <Landmark className="size-5 text-primary" />
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Bank Settlement Hub</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">Financial Entity</p>
                    <p className="text-sm font-bold">{employee.bankName || 'NOT REGISTERED'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">Encrypted Account Node</p>
                    <p className="text-sm font-bold font-mono">••••••••{employee.bankAccount?.slice(-4) || '0000'}</p>
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-[10px] font-black uppercase text-primary mb-2">Base Compensation</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] font-bold text-muted-foreground">KES</span>
                      <span className="text-2xl font-black font-headline text-foreground/90">{employee.salary?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PortalPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>}>
        <PortalContent />
      </Suspense>
    </DashboardLayout>
  );
}
