
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
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { onboardEmployee } from "@/lib/hr/hr.service";
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
  Users
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

const TABS = ["identity", "job", "contract", "financial"];

function EmployeeManagementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user } = useUser();
  
  const selectedInstId = searchParams.get('instId') || "";
  const editingId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState("identity");
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
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
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      gender: formData.get('gender') as string,
      branchId: formData.get('branchId') as string,
      departmentId: formData.get('departmentId') as string,
      jobTitle: formData.get('jobTitle') as string,
      salary: parseFloat(formData.get('salary') as string) || 0,
      hireDate: formData.get('hireDate') as string,
      status: 'Onboarding',
    };

    try {
      await onboardEmployee(db, selectedInstId, data);
      logSystemEvent(db, selectedInstId, user, 'HR', 'Onboard Employee', `Staff ${data.firstName} ${data.lastName} registered.`);
      toast({ title: "Staff Onboarded", description: "Identity profile initialized successfully." });
      router.push('/hr/employees');
    } catch (err) {
      toast({ variant: "destructive", title: "Registration Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (empLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" type="button" onClick={() => router.push('/hr/employees')}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">Onboard Institutional Talent</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Resource Lifecycle v1.0</p>
          </div>
        </div>
        <Badge variant="outline" className="h-8 px-4 bg-primary/5 border-primary/20 text-primary font-black uppercase tracking-widest">
          {editingEmp?.status || 'NEW IDENTITY'}
        </Badge>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-secondary/20 h-14 p-1 w-full justify-start rounded-none border-b border-border/50 bg-transparent">
              <TabsTrigger value="identity" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <UserCircle className="size-4" /> <span className="hidden md:inline uppercase font-black text-[10px] tracking-widest">1. Personal</span>
              </TabsTrigger>
              <TabsTrigger value="job" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <Briefcase className="size-4" /> <span className="hidden md:inline uppercase font-black text-[10px] tracking-widest">2. Placement</span>
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <ShieldCheck className="size-4" /> <span className="hidden md:inline uppercase font-black text-[10px] tracking-widest">3. Compliance</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <Wallet className="size-4" /> <span className="hidden md:inline uppercase font-black text-[10px] tracking-widest">4. Payroll</span>
              </TabsTrigger>
            </TabsList>

            <div className="p-8 min-h-[400px]">
              <TabsContent value="identity" className="space-y-6 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">First Name</Label>
                    <Input name="firstName" defaultValue={editingEmp?.firstName} required className="h-12 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Last Name</Label>
                    <Input name="lastName" defaultValue={editingEmp?.lastName} required className="h-12 font-bold" />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Corporate Email</Label>
                    <Input name="email" type="email" defaultValue={editingEmp?.email} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Personal Phone</Label>
                    <Input name="phone" defaultValue={editingEmp?.phone} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[10px] tracking-widest opacity-60 flex items-center gap-2"><Users className="size-3" /> Biological Gender</Label>
                    <Select name="gender" defaultValue={editingEmp?.gender || "Female"}>
                      <SelectTrigger className="h-11 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male Identity</SelectItem>
                        <SelectItem value="Female">Female Identity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="job" className="space-y-6 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Operational Branch</Label>
                    <Select name="branchId" defaultValue={editingEmp?.branchId}>
                      <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Pick Branch..." /></SelectTrigger>
                      <SelectContent>
                        {branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Reporting Department</Label>
                    <Select name="departmentId" defaultValue={editingEmp?.departmentId}>
                      <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Pick Dept..." /></SelectTrigger>
                      <SelectContent>
                        {departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Official Job Title</Label>
                    <Input name="jobTitle" defaultValue={editingEmp?.jobTitle} required className="h-11" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contract" className="space-y-6 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="bg-secondary/5 p-8 rounded-3xl border border-dashed border-border/50 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Hiring Date</Label>
                      <Input name="hireDate" type="date" defaultValue={editingEmp?.hireDate} required className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Employment Type</Label>
                      <Select name="employmentType" defaultValue="Permanent">
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Permanent">Full-Time (Permanent)</SelectItem>
                          <SelectItem value="Contract">Contract (Fixed Term)</SelectItem>
                          <SelectItem value="Locum">Labor / Locum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-6 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-2 p-6 bg-primary/5 rounded-3xl border border-primary/10">
                    <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em] mb-2">Base Salary Component</Label>
                    <Input name="salary" type="number" step="0.01" defaultValue={editingEmp?.salary} className="h-14 font-black text-2xl" placeholder="0.00" />
                    <p className="text-[9px] text-muted-foreground italic">Gross monthly pay before deductions.</p>
                  </div>
                  <div className="space-y-4 pt-4">
                    <div className="p-4 bg-secondary/10 rounded-xl flex gap-4 items-start">
                      <ShieldCheck className="size-5 text-emerald-500 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-emerald-500">Security Clearance</p>
                        <p className="text-[11px] leading-relaxed italic">Onboarding will automatically link this identity to an **Employee ID Sequence** from the Admin registry.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <CardFooter className="p-8 bg-secondary/10 border-t border-border/50 flex flex-col md:flex-row justify-between gap-6">
            <div className="flex items-center gap-3">
              {activeTab !== "identity" && (
                <Button type="button" variant="outline" onClick={handlePrevious} className="h-12 px-8 font-black uppercase text-xs">
                  <ChevronLeft className="size-4 mr-2" /> Back
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => router.push('/hr/employees')} className="h-12 px-8 font-black uppercase text-xs opacity-40">Discard</Button>
            </div>

            {activeTab !== "financial" ? (
              <Button type="button" onClick={handleNext} className="w-full md:w-auto h-12 px-12 font-black uppercase text-xs shadow-2xl bg-primary gap-3">
                Next Phase <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isProcessing} className="w-full md:w-auto h-12 px-12 font-black uppercase text-xs shadow-2xl bg-primary gap-3 ring-2 ring-primary/20">
                {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Commit Registration
              </Button>
            )}
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
