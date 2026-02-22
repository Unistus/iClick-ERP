
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  Scale,
  Landmark,
  Timer,
  Venus,
  Mars,
  ShieldAlert,
  Calendar,
  Flame,
  FileText,
  Tag,
  Activity,
  History,
  TrendingDown,
  Clock10,
  MapPin,
  ShieldX,
  UserSearch,
  GraduationCap,
  HandCoins
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

  const shiftTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'shift_types'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: shiftTypes } = useCollection(shiftTypesRef);

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
      if (['strictGeoFencing', 'requireManagerSignoff', 'enableAutoOvertime', 'enableLatePenalty', 'allowLeaveCarryForward', 'strictLeaveProbation', 'autoPostPayroll', 'requireATSApproval'].includes(key)) {
        updates[key] = value === 'on';
      } else if (['lateToleranceMins', 'probationPeriodDays', 'maxLeaveCarryForward', 'defaultLeaveAccrualRate'].includes(key)) {
        updates[key] = parseFloat(value as string) || 0;
      } else {
        updates[key] = value;
      }
    });

    try {
      await setDoc(setupRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSystemEvent(db, selectedInstId, user, 'HR', 'Update Policy', 'Institutional personnel parameters updated.');
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
      toast({ title: "Financial Hub Synced", description: "Standard HR and Leave liability nodes initialized." });
    } catch (err) {
      toast({ variant: "destructive", title: "Bootstrap Failed" });
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleAddShiftType = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      startTime: formData.get('startTime'),
      endTime: formData.get('endTime'),
      createdAt: serverTimestamp()
    };
    addDocumentNonBlocking(collection(db, 'institutions', selectedInstId, 'shift_types'), data);
    e.currentTarget.reset();
    toast({ title: "Shift Profile Registered" });
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
      data.isPaid = formData.get('isPaid') === 'on';
    }

    addDocumentNonBlocking(collection(db, 'institutions', selectedInstId, col), data);
    e.currentTarget.reset();
    toast({ title: "Requirement Added" });
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
              <h1 className="text-2xl font-headline font-bold">HR Setup & Policy</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Institutional Labor Standards Node</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Validating Access..." : "Select Institution"} />
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
              Sync Ledger Nodes
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-[2rem] bg-secondary/5">
            <ShieldCheck className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to configure its personnel perimeter.</p>
          </div>
        ) : (
          <Tabs defaultValue="policy" className="w-full">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none w-full">
              <TabsTrigger value="policy" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Timer className="size-3.5" /> Shift & Attend</TabsTrigger>
              <TabsTrigger value="leave" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><CalendarDays className="size-3.5" /> Leave Policies</TabsTrigger>
              <TabsTrigger value="recruitment" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><UserSearch className="size-3.5" /> Recruitment</TabsTrigger>
              <TabsTrigger value="financial" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Calculator className="size-3.5" /> Payroll Ledger</TabsTrigger>
            </TabsList>

            <TabsContent value="policy" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-6">
                  <form onSubmit={handleSavePolicy}>
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                      <CardHeader className="bg-secondary/10 border-b py-4 px-6 flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                            <ShieldCheck className="size-4" /> Shift Governance
                          </CardTitle>
                          <CardDescription className="text-[10px]">Real-time check-in and out rules.</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-xl border border-border/50">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold flex items-center gap-2">
                                <MapPin className="size-3 text-primary" /> Strict Geo-fencing
                              </Label>
                              <p className="text-[9px] text-muted-foreground leading-snug">Block clock-ins outside authorized branch radius.</p>
                            </div>
                            <Switch name="strictGeoFencing" defaultChecked={setup?.strictGeoFencing} />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-primary tracking-widest opacity-60">Arrival Grace Period (Mins)</Label>
                            <Input name="lateToleranceMins" type="number" defaultValue={setup?.lateToleranceMins || 15} className="h-10 font-black bg-secondary/5" />
                            <p className="text-[9px] text-muted-foreground italic">Time permitted after shift start before 'Late' flag is raised.</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold">Late Penalty Loop</Label>
                              <p className="text-[10px] text-muted-foreground">Auto-trigger deduction logic for chronic tardiness.</p>
                            </div>
                            <Switch name="enableLatePenalty" defaultChecked={setup?.enableLatePenalty} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold">Overtime Autopilot</Label>
                              <p className="text-[10px] text-muted-foreground">Auto-calculate OT based on check-out timestamps.</p>
                            </div>
                            <Switch name="enableAutoOvertime" defaultChecked={setup?.enableAutoOvertime} />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-secondary/5 border-t p-4 flex justify-end">
                        <Button type="submit" disabled={isSaving} className="h-9 px-8 font-black uppercase text-[10px] gap-2 shadow-lg bg-primary">
                          {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Deploy Attendance Policies
                        </Button>
                      </CardFooter>
                    </Card>
                  </form>

                  <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <Clock10 className="size-4 text-accent" /> Institutional Shift Roster
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 border-b bg-secondary/5">
                        <form onSubmit={handleAddShiftType} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <Input name="name" placeholder="Shift Name (e.g. Day)" required className="h-9 text-xs" />
                          <Input name="startTime" type="time" required className="h-9 text-xs" />
                          <Input name="endTime" type="time" required className="h-9 text-xs" />
                          <Button type="submit" size="sm" className="h-9 font-bold uppercase text-[10px] shadow-sm"><Plus className="size-3 mr-1" /> Register</Button>
                        </form>
                      </div>
                      <Table>
                        <TableBody>
                          {shiftTypes?.map(st => (
                            <TableRow key={st.id} className="h-12 hover:bg-secondary/5 group border-b-border/30">
                              <TableCell className="text-xs font-black pl-8 uppercase tracking-tight">{st.name}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="text-[8px] h-4 bg-accent/10 text-accent border-none font-black uppercase">{st.startTime} → {st.endTime}</Badge>
                              </TableCell>
                              <TableCell className="text-right pr-8">
                                <Button variant="ghost" size="icon" className="size-7 text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'shift_types', st.id))}>
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

                <div className="lg:col-span-4 space-y-6">
                  <Card className="bg-accent/5 border-none ring-1 ring-accent/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-md">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><Clock10 className="size-32 text-accent" /></div>
                    <div className="flex flex-col gap-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <Zap className="size-5 text-accent" />
                        <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Efficiency Engine</p>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                        "Institutional shift profiles are used to benchmark employee arrival times. These templates drive the **Workforce Pulse** dashboard and automated payroll deductions."
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="leave" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-6">
                  <form onSubmit={handleSavePolicy} className="space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                      <CardHeader className="border-b border-border/50 bg-secondary/10">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Scale className="size-4 text-primary" /> Leave Accrual & Rollover
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold">Carry Forward Policy</Label>
                              <p className="text-[10px] text-muted-foreground">Allow unused days to roll into next year.</p>
                            </div>
                            <Switch name="allowLeaveCarryForward" defaultChecked={setup?.allowLeaveCarryForward} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-60">Max Carry-Forward Days</Label>
                            <Input name="maxLeaveCarryForward" type="number" defaultValue={setup?.maxLeaveCarryForward || 5} className="h-10 font-black bg-secondary/5" />
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold">Probation Restriction</Label>
                              <p className="text-[10px] text-muted-foreground">Block Paid Leave during initial probation window.</p>
                            </div>
                            <Switch name="strictLeaveProbation" defaultChecked={setup?.strictLeaveProbation} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-60">Probation Window (Days)</Label>
                            <Input name="probationPeriodDays" type="number" defaultValue={setup?.probationPeriodDays || 90} className="h-10 font-black bg-secondary/5" />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-secondary/5 border-t p-4 flex justify-end">
                        <Button type="submit" disabled={isSaving} className="h-9 px-8 font-black uppercase text-[10px] gap-2 shadow-lg bg-primary">
                          {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Leave Policy
                        </Button>
                      </CardFooter>
                    </Card>
                  </form>

                  <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <CalendarDays className="size-4 text-primary" /> Leave Entitlement Registry
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 border-b bg-secondary/5">
                        <form onSubmit={(e) => handleAddSubItem('leave_types', e)} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <Input name="name" placeholder="Leave Name (e.g. Annual)" required className="h-9 text-xs col-span-2" />
                          <Input name="days" type="number" placeholder="Days/Yr" required className="h-9 text-xs" />
                          <Select name="genderApplicability" defaultValue="All">
                            <SelectTrigger className="h-9 text-[10px] font-black uppercase"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All" className="text-xs">ALL</SelectItem>
                              <SelectItem value="Male" className="text-xs">MALE ONLY</SelectItem>
                              <SelectItem value="Female" className="text-xs">FEMALE ONLY</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button type="submit" size="sm" className="h-9 font-bold uppercase text-[10px] shadow-sm"><Plus className="size-3 mr-1" /> Add</Button>
                        </form>
                      </div>
                      <Table>
                        <TableBody>
                          {leaveTypes?.map(lt => (
                            <TableRow key={lt.id} className="h-12 hover:bg-secondary/5 group border-b-border/30">
                              <TableCell className="text-xs font-black pl-8 uppercase tracking-tight">{lt.name}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="text-[8px] h-4 bg-primary/10 text-primary border-none font-black">{lt.daysPerYear} DAYS/YR</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-[8px] h-4 font-black border-none ring-1 ring-border opacity-60">{lt.genderApplicability}</Badge>
                              </TableCell>
                              <TableCell className="text-right pr-8">
                                <Button variant="ghost" size="icon" className="size-7 text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'leave_types', lt.id))}>
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
                <div className="lg:col-span-4 space-y-6">
                  <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-md">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><TrendingDown className="size-32 text-primary" /></div>
                    <div className="flex flex-col gap-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="size-5 text-primary" />
                        <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Liability Logic</p>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                        "Leave carry-forward creates an accrued financial liability on the balance sheet. High rollover caps increase 'Leave Liability' which must be provisioned for in your **Accounting** module."
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recruitment" className="space-y-6">
              <form onSubmit={handleSavePolicy}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="bg-secondary/10 border-b py-4 px-6">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
                      <UserSearch className="size-4" /> Acquisition Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-xl border">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold">Require ATS Approval</Label>
                          <p className="text-[10px] text-muted-foreground">Mandate supervisor sign-off before publishing jobs.</p>
                        </div>
                        <Switch name="requireATSApproval" defaultChecked={setup?.requireATSApproval} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                        Configure the standard onboarding window and vacancy visibility parameters here.
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/5 border-t p-4 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-9 px-8 font-black uppercase text-[10px] gap-2 shadow-lg bg-primary">
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Update ATS Policy
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <form onSubmit={handleSavePolicy}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50 bg-secondary/10">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Calculator className="size-4 text-emerald-500" /> Payroll Ledger Integration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="grid md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-primary uppercase border-b pb-2 tracking-[0.2em]">Expense Allocation</h3>
                        <AccountSelect name="salariesExpenseAccountId" label="Basic Salaries" description="Standard monthly wage node." typeFilter={['Expense']} />
                        <AccountSelect name="leaveProvisionExpenseAccountId" label="Leave Provision" description="Expense node for unutilized leave liability." typeFilter={['Expense']} />
                      </div>
                      <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-accent uppercase border-b pb-2 tracking-[0.2em]">Liability Accrual</h3>
                        <AccountSelect name="leaveLiabilityAccountId" label="Leave Liability Hub" description="Provisioning node for employee leave credits." typeFilter={['Liability']} />
                        <AccountSelect name="statutoryLiabilityAccountId" label="Statutory Deductions" description="Health and pension accruals." typeFilter={['Liability']} />
                      </div>
                    </div>

                    <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] flex gap-4 items-start shadow-inner">
                      <ShieldCheck className="size-6 text-emerald-500 shrink-0 animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Automation Safeguard</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                          "Approved Unpaid Leave will automatically trigger a deduction calculation in the next Payroll cycle based on these ledger mappings."
                        </p>
                      </div>
                    </div>

                    <Button type="submit" disabled={isSaving} className="w-fit h-12 font-black uppercase text-[10px] gap-3 px-12 shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 transition-all active:scale-95">
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Deploy HR Mappings
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
