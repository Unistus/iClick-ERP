'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { onboardEmployee, updateEmployee } from "@/lib/hr/hr.service";
import { 
  ArrowLeft, 
  UserCircle, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  Calendar, 
  Wallet, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  Heart, 
  Fingerprint, 
  MapPin, 
  Clock, 
  Hash, 
  Save, 
  UserPlus, 
  Landmark, 
  ShieldAlert, 
  LogOut, 
  Edit2,
  Zap,
  RefreshCw,
  Activity
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

function EmployeeManagementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user } = useUser();
  
  const urlInstId = searchParams.get('instId') || "";
  const editingId = searchParams.get('id');

  const [selectedInstId, setSelectedInstId] = useState<string>(urlInstId);
  const [isProcessing, setIsProcessing] = useState(false);

  // Authorization & Tenancy
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Setup Nodes from /hr/setup
  const branchesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'branches');
  }, [db, selectedInstId]);
  const { data: branches } = useCollection(branchesRef);

  const deptsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'departments');
  }, [db, selectedInstId]);
  const { data: departments } = useCollection(deptsRef);

  const jobLevelsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'job_levels');
  }, [db, selectedInstId]);
  const { data: jobLevels } = useCollection(jobLevelsRef);

  const payGradesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'pay_grades');
  }, [db, selectedInstId]);
  const { data: payGrades } = useCollection(payGradesRef);

  const empTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employment_types');
  }, [db, selectedInstId]);
  const { data: empTypes } = useCollection(empTypesRef);

  const shiftTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'shift_types');
  }, [db, selectedInstId]);
  const { data: shiftTypes } = useCollection(shiftTypesRef);

  const staffRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'employees'), orderBy('lastName', 'asc'));
  }, [db, selectedInstId]);
  const { data: staffPool } = useCollection(staffRef);

  // Data Fetching: Editing Context
  const editingEmpRef = useMemoFirebase(() => {
    if (!selectedInstId || !editingId) return null;
    return doc(db, 'institutions', selectedInstId, 'employees', editingId);
  }, [db, selectedInstId, editingId]);
  const { data: editingEmp, isLoading: empLoading } = useDoc(editingEmpRef);

  useEffect(() => {
    if (urlInstId) setSelectedInstId(urlInstId);
  }, [urlInstId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data: any = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      gender: formData.get('gender') as string,
      nationalId: formData.get('nationalId') as string,
      kraPin: formData.get('kraPin') as string,
      nssfNumber: formData.get('nssfNumber') as string,
      nhifNumber: formData.get('nhifNumber') as string,
      nextOfKin: {
        name: formData.get('nokName') as string,
        relation: formData.get('nokRelation') as string,
        phone: formData.get('nokPhone') as string,
      },
      branchId: formData.get('branchId') as string,
      departmentId: formData.get('departmentId') as string,
      reportingManagerId: formData.get('managerId') as string,
      jobTitle: formData.get('jobTitle') as string,
      jobLevelId: formData.get('jobLevelId') as string,
      shiftTypeId: formData.get('shiftTypeId') as string,
      hireDate: formData.get('hireDate') as string,
      employmentType: formData.get('employmentType') as string,
      probationEndDate: formData.get('probationEnd') as string,
      hasWorkPermit: formData.get('hasWorkPermit') === 'on',
      workPermitExpiry: formData.get('workPermitExpiry') as string,
      salary: parseFloat(formData.get('salary') as string) || 0,
      payGradeId: formData.get('payGradeId') as string,
      bankName: formData.get('bankName') as string,
      bankBranch: formData.get('bankBranch') as string,
      bankAccount: formData.get('bankAccount') as string,
      taxCategory: formData.get('taxCategory') as string,
      status: editingId ? (formData.get('status') as any) : 'Onboarding',
    };

    try {
      if (editingId) {
        await updateEmployee(db, selectedInstId, editingId, data);
        logSystemEvent(db, selectedInstId, user, 'HR', 'Update Staff', `Refined master record for ${data.firstName} ${data.lastName}.`);
        toast({ title: "Master Profile Updated" });
      } else {
        await onboardEmployee(db, selectedInstId, data);
        logSystemEvent(db, selectedInstId, user, 'HR', 'Onboard Staff', `Successfully integrated ${data.firstName} ${data.lastName} into workforce.`);
        toast({ title: "Employee Integrated" });
      }
      router.push('/hr/employees');
    } catch (err) {
      toast({ variant: "destructive", title: "Persistence Error", description: "Could not sync record to cloud vault." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (empLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER COMMAND BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 backdrop-blur-md p-6 rounded-3xl border border-border/50 sticky top-0 z-30 shadow-xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" type="button" onClick={() => router.push('/hr/employees')} className="rounded-full hover:bg-secondary">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-headline font-bold flex items-center gap-3 text-foreground">
              {editingId ? <Edit2 className="size-6 text-primary" /> : <UserPlus className="size-6 text-primary" />}
              {editingId ? 'Refine Identity Node' : 'Initialize Onboarding'}
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Workforce Provisioning Protocol</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-10 bg-background border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder={instLoading ? "Validating Access..." : "Target Institution"} />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            form="employee-master-form" 
            type="submit" 
            disabled={isProcessing || !selectedInstId} 
            className="flex-1 md:flex-none h-10 px-8 font-black uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2 border-none ring-2 ring-primary/20 transition-all active:scale-95"
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 
            {editingId ? 'Update Master Node' : 'Commit To Workforce'}
          </Button>
        </div>
      </div>

      <form 
        id="employee-master-form" 
        onSubmit={handleSubmit} 
        key={editingEmp?.id || 'new-profile'}
        className="grid gap-8 animate-in fade-in duration-500"
      >
        {/* SECTION 1: BIOGRAPHICAL & IDENTITY */}
        <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
          <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary"><UserCircle className="size-5" /></div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest">1. Identity & Biographical Node</CardTitle>
                <CardDescription className="text-[10px]">Core personal identifiers and contact reachability.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Legal First Name</Label>
                    <Input name="firstName" defaultValue={editingEmp?.firstName} required className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border focus-visible:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Legal Last Name</Label>
                    <Input name="lastName" defaultValue={editingEmp?.lastName} required className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border focus-visible:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Gender Identification</Label>
                    <Select name="gender" defaultValue={editingEmp?.gender || "Female"}>
                      <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male" className="text-xs font-bold uppercase">Male</SelectItem>
                        <SelectItem value="Female" className="text-xs font-bold uppercase">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Government ID / Passport</Label>
                    <Input name="nationalId" defaultValue={editingEmp?.nationalId} required className="h-11 font-mono bg-secondary/5 border-none ring-1 ring-border" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Corporate Email</Label>
                    <Input name="email" type="email" defaultValue={editingEmp?.email} required className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Secure Mobile Line</Label>
                    <Input name="phone" defaultValue={editingEmp?.phone} required className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 shadow-inner space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                    <Fingerprint className="size-4" /> Biometric & Regulatory Tags
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase opacity-60">KRA PIN</Label>
                      <Input name="kraPin" defaultValue={editingEmp?.kraPin} className="h-10 font-mono uppercase bg-background border-none ring-1 ring-border" placeholder="A00..." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase opacity-60">NSSF Number</Label>
                      <Input name="nssfNumber" defaultValue={editingEmp?.nssfNumber} className="h-10 font-mono bg-background border-none ring-1 ring-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase opacity-60">NHIF Number</Label>
                    <Input name="nhifNumber" defaultValue={editingEmp?.nhifNumber} className="h-10 font-mono bg-background border-none ring-1 ring-border" />
                  </div>
                </div>

                <div className="bg-accent/5 p-6 rounded-3xl border border-dashed border-accent/20 space-y-4">
                  <h4 className="text-[9px] font-black uppercase flex items-center gap-2 text-accent"><Heart className="size-3" /> Next of Kin (Emergency)</h4>
                  <div className="grid gap-4">
                    <Input name="nokName" defaultValue={editingEmp?.nextOfKin?.name} placeholder="Identity of Contact" className="h-10 bg-background border-none ring-1 ring-border" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input name="nokRelation" defaultValue={editingEmp?.nextOfKin?.relation} placeholder="Relationship" className="h-10 bg-background border-none ring-1 ring-border" />
                      <Input name="nokPhone" defaultValue={editingEmp?.nextOfKin?.phone} placeholder="Phone Line" className="h-10 bg-background border-none ring-1 ring-border" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: INSTITUTIONAL PLACEMENT */}
        <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
          <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10 text-accent"><Building className="size-5" /></div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest">2. Placement & Command Node</CardTitle>
                <CardDescription className="text-[10px]">Institutional mapping, hierarchy, and operational role.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Location & Structure</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Assigned Branch</Label>
                  <Select name="branchId" defaultValue={editingEmp?.branchId}>
                    <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border"><SelectValue placeholder="Pick Branch" /></SelectTrigger>
                    <SelectContent>
                      {branches?.map(b => <SelectItem key={b.id} value={b.id} className="text-[10px] font-bold uppercase">{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Department Node</Label>
                  <Select name="departmentId" defaultValue={editingEmp?.departmentId}>
                    <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border"><SelectValue placeholder="Pick Dept" /></SelectTrigger>
                    <SelectContent>
                      {departments?.map(d => <SelectItem key={d.id} value={d.id} className="text-[10px] font-bold uppercase">{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase opacity-60">Primary Reporting Manager</Label>
                <Select name="managerId" defaultValue={editingEmp?.reportingManagerId}>
                  <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border"><SelectValue placeholder="Select Direct Supervisor" /></SelectTrigger>
                  <SelectContent>
                    {staffPool?.filter(s => s.id !== editingId).map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold uppercase">{s.firstName} {s.lastName} ({s.jobTitle})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Operational Identity</h3>
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase opacity-60">Official Job Title</Label>
                <Input name="jobTitle" defaultValue={editingEmp?.jobTitle} required placeholder="e.g. Senior Pharmacist" className="h-11 font-bold uppercase tracking-tight bg-secondary/5 border-none ring-1 ring-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Seniority Rank (Level)</Label>
                  <Select name="jobLevelId" defaultValue={editingEmp?.jobLevelId}>
                    <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border"><SelectValue placeholder="Pick Level" /></SelectTrigger>
                    <SelectContent>
                      {jobLevels?.map(l => <SelectItem key={l.id} value={l.id} className="text-[10px] font-bold uppercase">{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Primary Shift Roster</Label>
                  <Select name="shiftTypeId" defaultValue={editingEmp?.shiftTypeId}>
                    <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border"><SelectValue placeholder="Assigned Shift" /></SelectTrigger>
                    <SelectContent>
                      {shiftTypes?.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold uppercase">{s.name} ({s.startTime}-{s.endTime})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: COMPLIANCE & FINANCIALS */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><ShieldCheck className="size-5" /></div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest">3. Compliance & Terms</CardTitle>
                  <CardDescription className="text-[10px]">Contractual and legal eligibility parameters.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Contract Effective Date</Label>
                  <Input name="hireDate" type="date" defaultValue={editingEmp?.hireDate} required className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Employment Basis</Label>
                  <Select name="employmentType" defaultValue={editingEmp?.employmentType}>
                    <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border"><SelectValue placeholder="Basis..." /></SelectTrigger>
                    <SelectContent>
                      {empTypes?.map(t => <SelectItem key={t.id} value={t.name} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>)}
                      {!empTypes?.length && (
                        <>
                          <SelectItem value="Permanent">Permanent</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase opacity-60">Probation End Threshold</Label>
                <Input name="probationEnd" type="date" defaultValue={editingEmp?.probationEndDate} className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
              </div>

              <div className="p-6 bg-secondary/5 rounded-2xl border border-dashed flex flex-col gap-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Foreign Work Permit Required?</Label>
                    <p className="text-[9px] text-muted-foreground uppercase">Mandatory for non-citizen identity nodes.</p>
                  </div>
                  <Switch name="hasWorkPermit" defaultChecked={editingEmp?.hasWorkPermit} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Permit Expiry Milestone</Label>
                  <Input name="workPermitExpiry" type="date" defaultValue={editingEmp?.workPermitExpiry} className="h-10 bg-background border-none ring-1 ring-border" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary"><Wallet className="size-5" /></div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest">4. Settlement Node (Payroll)</CardTitle>
                  <CardDescription className="text-[10px]">Remuneration structure and banking gateways.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 shadow-inner">
                <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em] mb-4">
                  <Landmark className="size-4" /> Base Monthly Gross
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-sm">KES</span>
                  <Input name="salary" type="number" step="0.01" defaultValue={editingEmp?.salary} className="h-14 pl-14 text-2xl font-black font-headline border-none bg-background shadow-xl focus-visible:ring-primary" />
                </div>
                <div className="mt-6 space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Assigned Pay Grade Scale</Label>
                  <Select name="payGradeId" defaultValue={editingEmp?.payGradeId}>
                    <SelectTrigger className="h-11 bg-background font-bold border-none ring-1 ring-border"><SelectValue placeholder="Standard Scale" /></SelectTrigger>
                    <SelectContent>
                      {payGrades?.map(g => <SelectItem key={g.id} value={g.id} className="text-[10px] font-bold uppercase">{g.name} ({g.minSalary?.toLocaleString()}-{g.maxSalary?.toLocaleString()})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-6">
                <div className="space-y-2 col-span-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Settlement Bank Entity</Label>
                  <Input name="bankName" defaultValue={editingEmp?.bankName} placeholder="e.g. KCB, Equity, Standard Chartered" className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Account Identifier</Label>
                  <Input name="bankAccount" defaultValue={editingEmp?.bankAccount} className="h-11 font-mono bg-secondary/5 border-none ring-1 ring-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-60">Swift / Branch Code</Label>
                  <Input name="bankBranch" defaultValue={editingEmp?.bankBranch} className="h-11 font-mono bg-secondary/5 border-none ring-1 ring-border" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-[9px] font-bold uppercase opacity-60">Regulatory Taxation Class</Label>
                <Select name="taxCategory" defaultValue={editingEmp?.taxCategory || "Standard PAYE"}>
                  <SelectTrigger className="h-11 font-bold uppercase bg-secondary/5 border-none ring-1 ring-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard PAYE" className="text-[10px] font-bold uppercase">Standard P.A.Y.E</SelectItem>
                    <SelectItem value="WHT 5%" className="text-[10px] font-bold uppercase">WHT (Consultancy - 5%)</SelectItem>
                    <SelectItem value="Exempt" className="text-[10px] font-bold uppercase">Institutional Exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 4: LIFECYCLE STATUS (FOR EDITING) */}
        {editingId && (
          <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary"><Activity className="size-5" /></div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest">5. Lifecycle Phase</CardTitle>
                  <CardDescription className="text-[10px]">Transition the staff member between operational states.</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="h-8 px-4 bg-background font-black uppercase">{editingEmp?.status}</Badge>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Master Transition State</Label>
                  <Select name="status" defaultValue={editingEmp?.status}>
                    <SelectTrigger className="h-12 font-black uppercase text-xs border-none ring-2 ring-primary/20 bg-secondary/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active" className="text-[10px] font-black uppercase text-emerald-500"><span className="flex items-center gap-2"><CheckCircle2 className="size-3" /> AUTHORIZED HUB</span></SelectItem>
                      <SelectItem value="Onboarding" className="text-[10px] font-black uppercase text-amber-500"><span className="flex items-center gap-2"><Clock className="size-3" /> PROVISIONING CYCLE</span></SelectItem>
                      <SelectItem value="Suspended" className="text-[10px] font-black uppercase text-destructive"><span className="flex items-center gap-2"><ShieldAlert className="size-3" /> LOCKED / BLOCKED</span></SelectItem>
                      <SelectItem value="Terminated" className="text-[10px] font-black uppercase opacity-50"><span className="flex items-center gap-2"><LogOut className="size-3" /> DECOMMISSIONED</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex gap-4 items-start shadow-inner">
                  <Zap className="size-6 text-primary shrink-0 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Tenancy Protocol</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                      "Staff state transitions trigger institutional security heartbeats. Transitioning to 'Terminated' instantly revokes token access."
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* BOTTOM COMMANDS */}
        <div className="flex justify-end gap-4 pt-10">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => router.push('/hr/employees')} 
            className="h-12 px-10 font-black uppercase text-xs opacity-40 hover:opacity-100 transition-all"
          >
            Discard Changes
          </Button>
          <Button 
            type="submit" 
            disabled={isProcessing || !selectedInstId} 
            className="h-12 px-16 font-black uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20"
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} 
            {editingId ? 'Update Master Node' : 'Commit To Workforce'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ManageEmployeePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>}>
        <EmployeeManagementForm />
      </Suspense>
    </DashboardLayout>
  );
}
