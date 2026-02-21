'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc, query, orderBy, updateDoc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { 
  Settings2, 
  Save, 
  Loader2, 
  Users, 
  Clock, 
  CalendarDays, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Briefcase, 
  Calculator, 
  Zap, 
  Sparkles,
  Info,
  GraduationCap,
  Scale,
  Landmark,
  Timer,
  Venus,
  Mars,
  ShieldAlert,
  Calendar,
  Flame,
  FileText,
  Tag
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { bootstrapHRFinancials } from '@/lib/hr/hr.service';

export default function HRSetupPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'hr');
  }, [db, selectedInstId]);
  const { data: setup } = useDoc(setupRef);

  const leaveTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'leave_types'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: leaveTypes } = useCollection(leaveTypesRef);

  const jobLevelsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'job_levels'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: jobLevels } = useCollection(jobLevelsRef);

  const jobTitlesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'job_titles'), orderBy('name', 'asc'));
  }, [db, selectedInstId]);
  const { data: jobTitles } = useCollection(jobTitlesRef);

  const payGradesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'pay_grades'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: payGrades } = useCollection(payGradesRef);

  const empTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'employment_types'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: empTypes } = useCollection(empTypesRef);

  const shiftTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'shift_types'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: shiftTypes } = useCollection(shiftTypesRef);

  const holidaysRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'holidays'), orderBy('date', 'desc'));
  }, [db, selectedInstId]);
  const { data: holidays } = useCollection(holidaysRef);

  const coaRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'coa');
  }, [db, selectedInstId]);
  const { data: accounts } = useCollection(coaRef);

  const handleSavePolicy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !setupRef) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates: any = {};
    formData.forEach((value, key) => {
      if (['enableAutoOvertime', 'strictGeoFencing', 'requireManagerSignoff', 'restrictPosByShift', 'blockHolidayClockIn', 'strictOtApproval'].includes(key)) {
        updates[key] = value === 'on';
      } else if (['lateToleranceMins', 'standardShiftHours', 'probationPeriodDays'].includes(key)) {
        updates[key] = parseInt(value as string) || 0;
      } else {
        updates[key] = value;
      }
    });

    try {
      await setDoc(setupRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSystemEvent(db, selectedInstId, user, 'HR', 'Update Setup', 'Institutional HR and labor policies modified.');
      toast({ title: "Policies Deployed" });
    } catch (err) {
      toast({ variant: "destructive", title: "Deployment Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBootstrap = async () => {
    if (!selectedInstId) return;
    setIsBootstrapping(true);
    try {
      await bootstrapHRFinancials(db, selectedInstId);
      toast({ title: "Financial Nodes Synced", description: "HR payroll and liability accounts created in COA." });
    } catch (err) {
      toast({ variant: "destructive", title: "Bootstrap Failed" });
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleAddSubItem = (col: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId) return;
    const formData = new FormData(e.currentTarget);
    const data: any = {
      name: formData.get('name'),
      createdAt: serverTimestamp()
    };
    
    if (col === 'leave_types') {
      data.daysPerYear = parseInt(formData.get('days') as string) || 0;
      data.genderApplicability = formData.get('genderApplicability') || 'All';
    } else if (col === 'shift_types') {
      data.startTime = formData.get('start');
      data.endTime = formData.get('end');
      data.graceMins = parseInt(formData.get('grace') as string) || 0;
    } else if (col === 'holidays') {
      data.date = formData.get('date');
      data.type = formData.get('type');
    } else if (col === 'pay_grades') {
      data.minSalary = parseFloat(formData.get('min') as string) || 0;
      data.maxSalary = parseFloat(formData.get('max') as string) || 0;
    }

    addDocumentNonBlocking(collection(db, 'institutions', selectedInstId, col), data);
    e.currentTarget.reset();
    toast({ title: "Node Registered" });
  };

  const AccountSelect = ({ name, label, description, typeFilter }: { name: string, label: string, description: string, typeFilter?: string[] }) => (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
        {label} <Info className="size-3 opacity-30" />
      </Label>
      <p className="text-[10px] text-muted-foreground leading-none mb-2">{description}</p>
      <Select name={name} defaultValue={setup?.[name]}>
        <SelectTrigger className="h-9 text-xs bg-secondary/10 border-none ring-1 ring-border">
          <SelectValue placeholder="Select Ledger Account" />
        </SelectTrigger>
        <SelectContent>
          {accounts?.filter(acc => !typeFilter || typeFilter.includes(acc.type) || typeFilter.includes(acc.subtype)).map(acc => (
            <SelectItem key={acc.id} value={acc.id} className="text-xs">
              [{acc.code}] {acc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Settings2 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">HR Configuration</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Institutional Labor Policy & Governance</p>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 h-9 text-[10px] font-black uppercase border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5 shadow-sm"
              disabled={!selectedInstId || isBootstrapping}
              onClick={handleBootstrap}
            >
              {isBootstrapping ? <Loader2 className="size-3 animate-spin" /> : <Calculator className="size-3" />} 
              Sync Financial Nodes
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Users className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure labor and payroll parameters.</p>
          </div>
        ) : (
          <Tabs defaultValue="policy" className="w-full">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none">
              <TabsTrigger value="policy" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Timer className="size-3.5" /> Shift & Attendance</TabsTrigger>
              <TabsTrigger value="holidays" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Calendar className="size-3.5" /> Hours & Holidays</TabsTrigger>
              <TabsTrigger value="leave" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><CalendarDays className="size-3.5" /> Leave Registry</TabsTrigger>
              <TabsTrigger value="structure" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Briefcase className="size-3.5" /> Job Structure</TabsTrigger>
              <TabsTrigger value="financial" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Calculator className="size-3.5" /> Payroll Ledger</TabsTrigger>
            </TabsList>

            <TabsContent value="policy">
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-6">
                  <form onSubmit={handleSavePolicy} className="space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                      <CardHeader className="border-b border-border/50 bg-secondary/10">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Clock className="size-4 text-primary" /> Attendance Guardrails
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Late-in Tolerance (Minutes)</Label>
                            <Input name="lateToleranceMins" type="number" defaultValue={setup?.lateToleranceMins || 15} className="h-10 text-lg font-black bg-secondary/5" />
                          </div>
                          <div className="flex items-center justify-between p-4 bg-accent/5 rounded-xl border border-accent/10 mt-4">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold text-accent">Restrict POS Access</Label>
                              <p className="text-[10px] text-muted-foreground">Only allow POS login during assigned shift window.</p>
                            </div>
                            <Switch name="restrictPosByShift" defaultChecked={setup?.restrictPosByShift} />
                          </div>
                        </div>
                        <div className="space-y-6 pt-2">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold">Strict Geo-Fencing</Label>
                              <p className="text-[10px] text-muted-foreground">Force clock-in only within branch radius.</p>
                            </div>
                            <Switch name="strictGeoFencing" defaultChecked={setup?.strictGeoFencing} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold">Require Manager Signoff</Label>
                              <p className="text-[10px] text-muted-foreground">Manual attendance edits require admin approval.</p>
                            </div>
                            <Switch name="requireManagerSignoff" defaultChecked={setup?.requireManagerSignoff} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </form>

                  <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <Timer className="size-4 text-primary" /> Shift Type Registry
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 border-b bg-secondary/5">
                        <form onSubmit={(e) => handleAddSubItem('shift_types', e)} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <Input name="name" placeholder="Shift Name" required className="h-9 text-xs col-span-2" />
                          <Input name="start" type="time" required className="h-9 text-xs" />
                          <Input name="end" type="time" required className="h-9 text-xs" />
                          <Button type="submit" size="sm" className="h-9 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                        </form>
                      </div>
                      <Table>
                        <TableBody>
                          {shiftTypes?.map(s => (
                            <TableRow key={s.id} className="h-12 hover:bg-secondary/5 group">
                              <TableCell className="text-xs font-bold pl-6 uppercase">{s.name}</TableCell>
                              <TableCell className="text-center text-[10px] font-mono text-primary font-bold">{s.startTime} — {s.endTime}</TableCell>
                              <TableCell className="text-right pr-6">
                                <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'shift_types', s.id))}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-4">
                  <Card className="border-none ring-1 ring-border shadow bg-primary/5 h-full relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><Zap className="size-24" /></div>
                    <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest">Shift Authority</CardTitle></CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                      <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                        "Enabling **POS Shift Restriction** prevents unauthorized users from performing sales outside their assigned roster hours."
                      </p>
                      <Button onClick={() => document.getElementById('policy-form-submit')?.click()} disabled={isSaving} className="w-full h-10 font-black uppercase text-[10px] gap-2 px-10 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                        {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Labor Rules
                      </Button>
                      <form onSubmit={handleSavePolicy} className="hidden">
                        <button type="submit" id="policy-form-submit" />
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="holidays">
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-6">
                  <form onSubmit={handleSavePolicy} className="space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-xl bg-card">
                      <CardHeader className="bg-secondary/10 border-b">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Flame className="size-4 text-accent" /> Overtime & Holiday Policy
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Standard Probation (Days)</Label>
                              <Input name="probationPeriodDays" type="number" defaultValue={setup?.probationPeriodDays || 90} className="h-10 text-lg font-black bg-secondary/5" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-xl border">
                              <div className="space-y-0.5">
                                <Label className="text-xs font-bold">Block Holiday Clock-In</Label>
                                <p className="text-[10px] text-muted-foreground">Prevent entry on holidays unless OT is allocated.</p>
                              </div>
                              <Switch name="blockHolidayClockIn" defaultChecked={setup?.blockHolidayClockIn} />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                              <div className="space-y-0.5">
                                <Label className="text-xs font-bold text-primary">Strict OT Approval</Label>
                                <p className="text-[10px] text-muted-foreground">Only direct Reporting Managers can approve overtime.</p>
                              </div>
                              <Switch name="strictOtApproval" defaultChecked={setup?.strictOtApproval} />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Overtime Approver Role</Label>
                            <Select name="otApproverRole" defaultValue={setup?.otApproverRole || "Reporting Manager"}>
                              <SelectTrigger className="h-10 font-bold uppercase text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Reporting Manager" className="text-xs">Reporting Manager</SelectItem>
                                <SelectItem value="HR Admin" className="text-xs">HR Admin</SelectItem>
                                <SelectItem value="Institutional Admin" className="text-xs">Institutional Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button type="submit" disabled={isSaving} className="w-full h-10 font-bold uppercase text-[10px] gap-2 mt-4"><Save className="size-3" /> Commit Policy</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </form>

                  <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="size-4 text-primary" /> Institutional Holidays
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 border-b bg-secondary/5">
                        <form onSubmit={(e) => handleAddSubItem('holidays', e)} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <Input name="name" placeholder="Holiday (e.g. Christmas)" required className="h-9 text-xs col-span-2" />
                          <Input name="date" type="date" required className="h-9 text-xs" />
                          <Button type="submit" size="sm" className="h-9 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                        </form>
                      </div>
                      <Table>
                        <TableBody>
                          {holidays?.map(h => (
                            <TableRow key={h.id} className="h-12 hover:bg-secondary/5 group">
                              <TableCell className="text-xs font-bold pl-6 uppercase">{h.name}</TableCell>
                              <TableCell className="text-center font-mono text-[10px] text-muted-foreground">{h.date}</TableCell>
                              <TableCell className="text-right pr-6">
                                <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'holidays', h.id))}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-4">
                  <Card className="bg-accent/5 border-none ring-1 ring-accent/20 p-6 shadow-inner">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldAlert className="size-4 text-accent" />
                      <p className="text-[10px] font-black uppercase text-accent tracking-widest">Labor Lock Engine</p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                      "Holiday blocks prevent accidental labor cost accrual. Overtime must be explicitly allocated by a Reporting Manager before the shift starts to allow network entry."
                    </p>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="leave">
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <CalendarDays className="size-4 text-primary" /> Leave Entitlements
                      </CardTitle>
                      <Badge variant="outline" className="text-[8px] uppercase font-black">Audit Rule Set</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 border-b bg-secondary/5">
                        <form onSubmit={(e) => handleAddSubItem('leave_types', e)} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <Input name="name" placeholder="Category (e.g. Annual)" required className="h-9 text-xs" />
                          <Input name="days" type="number" placeholder="Days/Yr" required className="h-9 text-xs" />
                          <Select name="genderApplicability" defaultValue="All">
                            <SelectTrigger className="h-9 text-xs uppercase font-bold">
                              <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All" className="text-xs">All Genders</SelectItem>
                              <SelectItem value="Male" className="text-xs">Male Only</SelectItem>
                              <SelectItem value="Female" className="text-xs">Female Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button type="submit" size="sm" className="h-9 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Register</Button>
                        </form>
                      </div>
                      <Table>
                        <TableHeader className="bg-secondary/20">
                          <TableRow>
                            <TableHead className="h-9 text-[10px] font-black uppercase pl-6">Leave Category</TableHead>
                            <TableHead className="h-9 text-[10px] font-black uppercase text-center">Allowance</TableHead>
                            <TableHead className="h-9 text-[10px] font-black uppercase text-center">Eligibility</TableHead>
                            <TableHead className="h-9 text-right pr-6 text-[10px] font-black uppercase">Lifecycle</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leaveTypes?.map(t => (
                            <TableRow key={t.id} className="h-12 hover:bg-secondary/5 group border-b-border/30">
                              <TableCell className="text-xs font-bold pl-6 uppercase tracking-tight">{t.name}</TableCell>
                              <TableCell className="text-center font-mono font-black text-primary">{t.daysPerYear} DAYS</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={cn(
                                  "text-[8px] h-4 uppercase font-black border-none ring-1",
                                  t.genderApplicability === 'Male' ? "bg-blue-500/10 text-blue-500 ring-blue-500/20" :
                                  t.genderApplicability === 'Female' ? "bg-pink-500/10 text-pink-500 ring-pink-500/20" :
                                  "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20"
                                )}>
                                  {t.genderApplicability === 'Male' && <Mars className="size-2 mr-1" />}
                                  {t.genderApplicability === 'Female' && <Venus className="size-2 mr-1" />}
                                  {t.genderApplicability || 'All'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'leave_types', t.id))}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-4">
                  <Card className="bg-secondary/10 border-none ring-1 ring-border shadow p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Scale className="size-4 text-accent" />
                      <p className="text-[10px] font-black uppercase text-accent tracking-widest">Gender Compliance</p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                      "Leave types are filtered during requisition based on the employee's registered gender. This enforces institutional regulatory standards automatically."
                    </p>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="structure">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Tag className="size-4 text-primary" /> Official Job Titles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-secondary/5">
                      <form onSubmit={(e) => handleAddSubItem('job_titles', e)} className="flex gap-2">
                        <Input name="name" placeholder="Job Title (e.g. Staff Nurse)" required className="h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 px-4 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                      </form>
                    </div>
                    <Table>
                      <TableBody>
                        {jobTitles?.map(t => (
                          <TableRow key={t.id} className="h-10 hover:bg-secondary/5 group">
                            <TableCell className="text-xs font-bold pl-6 uppercase tracking-tight">{t.name}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'job_titles', t.id))}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Landmark className="size-4 text-primary" /> Institutional Pay Grades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-secondary/5">
                      <form onSubmit={(e) => handleAddSubItem('pay_grades', e)} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <Input name="name" placeholder="Grade ID" required className="h-9 text-xs col-span-1" />
                        <Input name="min" type="number" placeholder="Min Pay" required className="h-9 text-xs" />
                        <Input name="max" type="number" placeholder="Max Pay" required className="h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                      </form>
                    </div>
                    <Table>
                      <TableBody>
                        {payGrades?.map(g => (
                          <TableRow key={g.id} className="h-12 hover:bg-secondary/5 group">
                            <TableCell className="text-xs font-black pl-6 uppercase text-primary">{g.name}</TableCell>
                            <TableCell className="text-[10px] font-mono text-muted-foreground">
                              {g.minSalary?.toLocaleString()} — {g.maxSalary?.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'pay_grades', g.id))}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <GraduationCap className="size-4 text-primary" /> Seniority & Level Node
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-secondary/5">
                      <form onSubmit={(e) => handleAddSubItem('job_levels', e)} className="flex gap-2">
                        <Input name="name" placeholder="Level Title (e.g. L4 Manager)" required className="h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 px-4 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                      </form>
                    </div>
                    <Table>
                      <TableBody>
                        {jobLevels?.map(l => (
                          <TableRow key={l.id} className="h-10 hover:bg-secondary/5 group">
                            <TableCell className="text-xs font-bold pl-6 uppercase tracking-tight">{l.name}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'job_levels', l.id))}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <FileText className="size-4 text-accent" /> Employment Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-secondary/5">
                      <form onSubmit={(e) => handleAddSubItem('employment_types', e)} className="flex gap-2">
                        <Input name="name" placeholder="Basis (e.g. Permanent)" required className="h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 px-4 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                      </form>
                    </div>
                    <Table>
                      <TableBody>
                        {empTypes?.map(t => (
                          <TableRow key={t.id} className="h-10 hover:bg-secondary/5 group">
                            <TableCell className="text-xs font-bold pl-6 uppercase tracking-tight">{t.name}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'employment_types', t.id))}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="financial">
              <form onSubmit={handleSavePolicy}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50 bg-secondary/10">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Landmark className="size-4 text-emerald-500" /> Payroll Ledger Integration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h3 className="text-xs font-bold text-primary uppercase border-b pb-2">Expense Allocation</h3>
                        <AccountSelect name="salariesExpenseAccountId" label="Basic Salaries" description="Standard monthly wage node." typeFilter={['Expense']} />
                        <AccountSelect name="overtimeExpenseAccountId" label="Overtime Wages" description="Node for additional labor hours." typeFilter={['Expense']} />
                        <AccountSelect name="benefitsExpenseAccountId" label="Staff Welfare" description="Allowance and benefit costs." typeFilter={['Expense']} />
                      </div>
                      <div className="space-y-6">
                        <h3 className="text-xs font-bold text-accent uppercase border-b pb-2">Liability Accrual</h3>
                        <AccountSelect name="salariesPayableAccountId" label="Net Salaries Payable" description="Net pay owed to staff." typeFilter={['Liability']} />
                        <AccountSelect name="payeLiabilityAccountId" label="P.A.Y.E Tax Node" description="Tax withheld for the revenue authority." typeFilter={['Liability']} />
                        <AccountSelect name="statutoryLiabilityAccountId" label="Statutory Deductions" description="Health and pension accruals." typeFilter={['Liability']} />
                      </div>
                    </div>

                    <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start shadow-inner">
                      <ShieldCheck className="size-6 text-primary shrink-0 animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Automation Protocol</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                          "HR financial events trigger real-time Journal Entries in the General Ledger. Ensure these accounts are verified by your audit team before committing payroll runs."
                        </p>
                      </div>
                    </div>

                    <Button type="submit" disabled={isSaving} className="w-fit h-11 font-black uppercase text-[10px] gap-2 px-12 shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90">
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Financial Mappings
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
