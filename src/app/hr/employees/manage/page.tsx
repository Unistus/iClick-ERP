
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, orderBy, doc, serverTimestamp } from "firebase/firestore";
import { onboardEmployee, updateEmployee } from "@/lib/hr/hr.service";
import { 
  ArrowLeft, 
  ArrowRight, 
  UserCircle, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  Calendar, 
  Wallet, 
  ShieldCheck, 
  Sparkles, 
  Loader2,
  CheckCircle2,
  ChevronLeft,
  GraduationCap,
  Users,
  Landmark,
  ShieldAlert,
  FileText,
  Heart,
  Fingerprint,
  MapPin,
  Clock,
  HandHelping
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

const TABS = ["identity", "job", "compliance", "financial", "documents"];

function EmployeeManagementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user } = useUser();
  
  const selectedInstId = searchParams.get('instId') || "";
  const editingId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState("identity");
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching: Setup Nodes
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

  const shiftTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'shift_types');
  }, [db, selectedInstId]);
  const { data: shiftTypes } = useCollection(shiftTypesRef);

  const managersRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'employees'), orderBy('lastName', 'asc'));
  }, [db, selectedInstId]);
  const { data: staffPool } = useCollection(managersRef);

  // Data Fetching: Editing Context
  const editingEmpRef = useMemoFirebase(() => {
    if (!selectedInstId || !editingId) return null;
    return doc(db, 'institutions', selectedInstId, 'employees', editingId);
  }, [db, selectedInstId, editingId]);
  const { data: editingEmp, isLoading: empLoading } = useDoc(editingEmpRef);

  const handleNext = () => {
    const currentIndex = TABS.indexOf(activeTab);
    if (currentIndex < TABS.length - 1) setActiveTab(TABS[currentIndex + 1]);
  };

  const handlePrevious = () => {
    const currentIndex = TABS.indexOf(activeTab);
    if (currentIndex > 0) setActiveTab(TABS[currentIndex - 1]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data: any = {
      // Identity
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      gender: formData.get('gender') as string,
      nationalId: formData.get('nationalId') as string,
      kraPin: formData.get('kraPin') as string,
      nssfNumber: formData.get('nssfNumber') as string,
      nhifNumber: formData.get('nhifNumber') as string,
      
      // Next of Kin
      nextOfKin: {
        name: formData.get('nokName') as string,
        relation: formData.get('nokRelation') as string,
        phone: formData.get('nokPhone') as string,
      },

      // Job Placement
      branchId: formData.get('branchId') as string,
      departmentId: formData.get('departmentId') as string,
      reportingManagerId: formData.get('managerId') as string,
      jobTitle: formData.get('jobTitle') as string,
      jobLevelId: formData.get('jobLevelId') as string,
      shiftTypeId: formData.get('shiftTypeId') as string,

      // Compliance & Terms
      hireDate: formData.get('hireDate') as string,
      employmentType: formData.get('employmentType') as string,
      probationEndDate: formData.get('probationEnd') as string,
      hasWorkPermit: formData.get('hasWorkPermit') === 'on',
      workPermitExpiry: formData.get('workPermitExpiry') as string,

      // Financials
      salary: parseFloat(formData.get('salary') as string) || 0,
      payGradeId: formData.get('payGradeId') as string,
      bankName: formData.get('bankName') as string,
      bankBranch: formData.get('bankBranch') as string,
      bankAccount: formData.get('bankAccount') as string,
      taxCategory: formData.get('taxCategory') as string,
    };

    try {
      if (editingId) {
        await updateEmployee(db, selectedInstId, editingId, data);
        logSystemEvent(db, selectedInstId, user, 'HR', 'Update Staff', `Refined profile for ${data.firstName} ${data.lastName}.`);
        toast({ title: "Profile Updated" });
      } else {
        await onboardEmployee(db, selectedInstId, data);
        logSystemEvent(db, selectedInstId, user, 'HR', 'Onboard Staff', `Successfully registered ${data.firstName} ${data.lastName} to workforce.`);
        toast({ title: "Staff Onboarded" });
      }
      router.push('/hr/employees');
    } catch (err) {
      toast({ variant: "destructive", title: "Action Failed", description: "Internal registry error." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (empLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;

  const isLastTab = activeTab === "documents";
  const isFirstTab = activeTab === "identity";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" type="button" onClick={() => router.push('/hr/employees')}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">{editingId ? 'Refine Staff Identity' : 'Institutional Onboarding'}</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Core Workforce Provisioning v2.4</p>
          </div>
        </div>
        <Badge variant="outline" className="h-8 px-4 bg-primary/5 border-primary/20 text-primary font-black uppercase tracking-widest">
          {editingEmp?.status || 'AWAITING PROVISION'}
        </Badge>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-secondary/20 h-14 p-1 w-full justify-start rounded-none border-b border-border/50 bg-transparent gap-1">
              <TabsTrigger value="identity" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <UserCircle className="size-4" /> <span className="hidden md:inline uppercase font-black text-[9px] tracking-widest">1. Identity</span>
              </TabsTrigger>
              <TabsTrigger value="job" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <Building className="size-4" /> <span className="hidden md:inline uppercase font-black text-[9px] tracking-widest">2. Placement</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <ShieldCheck className="size-4" /> <span className="hidden md:inline uppercase font-black text-[9px] tracking-widest">3. Terms</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <Wallet className="size-4" /> <span className="hidden md:inline uppercase font-black text-[9px] tracking-widest">4. Payroll</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <FileText className="size-4" /> <span className="hidden md:inline uppercase font-black text-[9px] tracking-widest">5. Vault</span>
              </TabsTrigger>
            </TabsList>

            <div className="p-8 min-h-[500px]">
              {/* STAGE 1: IDENTITY */}
              <TabsContent value="identity" className="space-y-8 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Biographical Profile</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="uppercase font-bold text-[9px] opacity-60">First Name</Label>
                        <Input name="firstName" defaultValue={editingEmp?.firstName} required className="h-11 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase font-bold text-[9px] opacity-60">Last Name</Label>
                        <Input name="lastName" defaultValue={editingEmp?.lastName} required className="h-11 font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="uppercase font-bold text-[9px] opacity-60">Gender</Label>
                        <Select name="gender" defaultValue={editingEmp?.gender || "Female"}>
                          <SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase font-bold text-[9px] opacity-60">National ID / Passport</Label>
                        <Input name="nationalId" defaultValue={editingEmp?.nationalId} required className="h-11 font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="uppercase font-bold text-[9px] opacity-60">Corporate Email</Label>
                        <Input name="email" type="email" defaultValue={editingEmp?.email} required className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase font-bold text-[9px] opacity-60">Mobile Phone</Label>
                        <Input name="phone" defaultValue={editingEmp?.phone} required className="h-11" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Regulatory Identifiers</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase">KRA PIN</Label>
                          <Input name="kraPin" defaultValue={editingEmp?.kraPin} className="h-10 font-mono uppercase" placeholder="A00..." />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase">NSSF #</Label>
                          <Input name="nssfNumber" defaultValue={editingEmp?.nssfNumber} className="h-10 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase">NHIF #</Label>
                          <Input name="nhifNumber" defaultValue={editingEmp?.nhifNumber} className="h-10 font-mono" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-secondary/5 p-6 rounded-2xl border border-dashed mt-4 space-y-4">
                      <h4 className="text-[9px] font-black uppercase flex items-center gap-2"><Heart className="size-3 text-destructive" /> Next of Kin</h4>
                      <div className="grid gap-4">
                        <Input name="nokName" defaultValue={editingEmp?.nextOfKin?.name} placeholder="Emergency Contact Name" className="h-10 bg-background" />
                        <div className="grid grid-cols-2 gap-4">
                          <Input name="nokRelation" defaultValue={editingEmp?.nextOfKin?.relation} placeholder="Relation (e.g. Spouse)" className="h-10 bg-background" />
                          <Input name="nokPhone" defaultValue={editingEmp?.nextOfKin?.phone} placeholder="Contact Phone" className="h-10 bg-background" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* STAGE 2: PLACEMENT */}
              <TabsContent value="job" className="space-y-8 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Institutional Node</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase">Assigned Branch</Label>
                        <Select name="branchId" defaultValue={editingEmp?.branchId}>
                          <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Pick Branch" /></SelectTrigger>
                          <SelectContent>
                            {branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase">Department</Label>
                        <Select name="departmentId" defaultValue={editingEmp?.departmentId}>
                          <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Pick Dept" /></SelectTrigger>
                          <SelectContent>
                            {departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase">Reporting Manager</Label>
                      <Select name="managerId" defaultValue={editingEmp?.reportingManagerId}>
                        <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Select Direct Supervisor" /></SelectTrigger>
                        <SelectContent>
                          {staffPool?.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.jobTitle})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Operational Role</h3>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase">Job Title</Label>
                      <Input name="jobTitle" defaultValue={editingEmp?.jobTitle} required className="h-11 font-bold uppercase tracking-tight" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase">Seniority Level</Label>
                        <Select name="jobLevelId" defaultValue={editingEmp?.jobLevelId}>
                          <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Pick Level" /></SelectTrigger>
                          <SelectContent>
                            {jobLevels?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase">Primary Shift</Label>
                        <Select name="shiftTypeId" defaultValue={editingEmp?.shiftTypeId}>
                          <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Assigned Shift" /></SelectTrigger>
                          <SelectContent>
                            {shiftTypes?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* STAGE 3: COMPLIANCE */}
              <TabsContent value="compliance" className="space-y-8 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Contractual Parameters</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase">Hiring Date</Label>
                        <Input name="hireDate" type="date" defaultValue={editingEmp?.hireDate} required className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase">Employment Basis</Label>
                        <Select name="employmentType" defaultValue={editingEmp?.employmentType || "Permanent"}>
                          <SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Permanent">Permanent</SelectItem>
                            <SelectItem value="Contract">Fixed-Term Contract</SelectItem>
                            <SelectItem value="Casual">Casual / Temporary</SelectItem>
                            <SelectItem value="Intern">Intern / Student</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase">Probation End Date</Label>
                      <Input name="probationEnd" type="date" defaultValue={editingEmp?.probationEndDate} className="h-11" />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-accent tracking-widest border-b pb-2">Legal Eligibility</h3>
                    <div className="p-6 bg-secondary/10 rounded-2xl border flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold">Foreign Work Permit Required?</Label>
                          <p className="text-[9px] text-muted-foreground uppercase">Mandatory for non-citizens.</p>
                        </div>
                        <input type="checkbox" name="hasWorkPermit" defaultChecked={editingEmp?.hasWorkPermit} className="size-5" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase opacity-60">Permit Expiry Date</Label>
                        <Input name="workPermitExpiry" type="date" defaultValue={editingEmp?.workPermitExpiry} className="h-10 bg-background" />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* STAGE 4: FINANCIAL */}
              <TabsContent value="financial" className="space-y-8 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10 shadow-inner">
                      <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em] mb-4">
                        <Wallet className="size-4" /> Base Gross Salary
                      </Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-sm">KES</span>
                        <Input name="salary" type="number" step="0.01" defaultValue={editingEmp?.salary} className="h-16 pl-14 text-3xl font-black font-headline border-none bg-background shadow-xl" />
                      </div>
                      <div className="mt-6 space-y-4">
                        <Label className="text-[9px] font-bold uppercase opacity-60">Assigned Pay Grade</Label>
                        <Select name="payGradeId" defaultValue={editingEmp?.payGradeId}>
                          <SelectTrigger className="h-11 bg-background font-bold"><SelectValue placeholder="Standard Scale" /></SelectTrigger>
                          <SelectContent>
                            {payGrades?.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({g.minSalary}-{g.maxSalary})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Settlement Node (Banking)</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase">Financial Institution (Bank Name)</Label>
                        <Input name="bankName" defaultValue={editingEmp?.bankName} placeholder="e.g. KCB, Equity, Standard Chartered" className="h-11" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase">Account Number</Label>
                          <Input name="bankAccount" defaultValue={editingEmp?.bankAccount} className="h-11 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase">Branch / Swift Code</Label>
                          <Input name="bankBranch" defaultValue={editingEmp?.bankBranch} className="h-11 font-mono" />
                        </div>
                      </div>
                      <div className="space-y-2 pt-4">
                        <Label className="text-[9px] font-bold uppercase">Taxation Category</Label>
                        <Select name="taxCategory" defaultValue={editingEmp?.taxCategory || "Standard PAYE"}>
                          <SelectTrigger className="h-11 font-bold uppercase"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Standard PAYE">Standard PAYE</SelectItem>
                            <SelectItem value="WHT 5%">WHT (Consultancy - 5%)</SelectItem>
                            <SelectItem value="Exempt">Tax Exempt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* STAGE 5: DOCUMENTS */}
              <TabsContent value="documents" className="space-y-8 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { id: 'contract', label: 'Employment Contract', icon: FileText },
                    { id: 'offer', label: 'Offer Letter', icon: Sparkles },
                    { id: 'kyc', label: 'Government ID / Passport', icon: Fingerprint },
                    { id: 'pin', label: 'KRA PIN Certificate', icon: Hash },
                    { id: 'certificates', label: 'Academic Certificates', icon: GraduationCap },
                    { id: 'permit', label: 'Work Permit / NDA', icon: ShieldCheck },
                  ].map((doc) => (
                    <Card key={doc.id} className="border-none ring-1 ring-border bg-secondary/10 hover:ring-primary/30 transition-all group overflow-hidden">
                      <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                        <div className="size-12 rounded-2xl bg-background flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <doc.icon className="size-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest">{doc.label}</p>
                          <p className="text-[8px] text-muted-foreground">PDF or Scanned Image (Max 5MB)</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="h-8 text-[9px] font-bold uppercase w-full bg-background">
                          Browse Vault
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex gap-4 items-start shadow-inner">
                  <ShieldCheck className="size-6 text-primary shrink-0 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Compliance Protocol Node</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                      "Institutional documents are encrypted at the edge. Onboarding cannot be finalized without a valid National ID or Passport mapping."
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <CardFooter className="p-8 bg-secondary/10 border-t border-border/50 flex flex-col md:flex-row justify-between gap-6">
            <div className="flex items-center gap-3">
              {!isFirstTab && (
                <Button type="button" variant="outline" onClick={handlePrevious} className="h-12 px-8 font-black uppercase text-xs tracking-widest">
                  <ChevronLeft className="size-4 mr-2" /> Back
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => router.push('/hr/employees')} className="h-12 px-8 font-black uppercase text-xs opacity-40 hover:opacity-100 transition-all">
                Discard Session
              </Button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {!isLastTab ? (
                <Button type="button" onClick={handleNext} className="w-full md:w-auto h-12 px-12 font-black uppercase text-xs shadow-2xl bg-primary hover:bg-primary/90 gap-3">
                  Next Stage <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isProcessing} 
                  className="w-full md:w-auto h-12 px-12 font-black uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20"
                >
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} 
                  {editingId ? 'Refine Identity Hub' : 'Commit To Workforce'}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
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
