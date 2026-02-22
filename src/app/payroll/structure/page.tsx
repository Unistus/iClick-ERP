'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, where, serverTimestamp, setDoc } from "firebase/firestore";
import { 
  Layers, 
  Search, 
  MoreHorizontal, 
  Loader2, 
  BadgeCent, 
  HandCoins, 
  ShieldCheck, 
  Zap,
  TrendingUp,
  TrendingDown,
  Edit2,
  Calculator,
  ArrowRight,
  Info,
  Calendar,
  Wallet,
  Landmark,
  Activity,
  Scale,
  History,
  UserCircle,
  Save,
  Sparkles,
  Building,
  Plus,
  Trash2,
  ListTree
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { calculateNetSalary, type StatutorySettings, assignEmployeeEarning, assignEmployeeDeduction, removeEmployeeEarning, removeEmployeeDeduction } from "@/lib/payroll/payroll.service";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SalaryStructurePage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [tempSalary, setTempSalary] = useState<number>(0);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Employees
  const employeesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'employees'), orderBy('lastName', 'asc'));
  }, [db, selectedInstId]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const payGradesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'pay_grades');
  }, [db, selectedInstId]);
  const { data: payGrades } = useCollection(payGradesRef);

  const payrollSetupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'payroll');
  }, [db, selectedInstId]);
  const { data: payrollSetup } = useDoc(payrollSetupRef);

  const globalSettingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: globalSettings } = useDoc(globalSettingsRef);

  const earningTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'earning_types');
  }, [db, selectedInstId]);
  const { data: globalEarnings } = useCollection(earningTypesRef);

  const deductionTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'deduction_types');
  }, [db, selectedInstId]);
  const { data: globalDeductions } = useCollection(deductionTypesRef);

  // Per-Employee Component Fetching
  const empEarningsRef = useMemoFirebase(() => {
    if (!selectedInstId || !editingEmp) return null;
    return collection(db, 'institutions', selectedInstId, 'employees', editingEmp.id, 'earnings');
  }, [db, selectedInstId, editingEmp]);
  const { data: empEarnings } = useCollection(empEarningsRef);

  const empDeductionsRef = useMemoFirebase(() => {
    if (!selectedInstId || !editingEmp) return null;
    return collection(db, 'institutions', selectedInstId, 'employees', editingEmp.id, 'deductions');
  }, [db, selectedInstId, editingEmp]);
  const { data: empDeductions } = useCollection(empDeductionsRef);

  const currency = globalSettings?.general?.currencySymbol || "KES";

  // COMPUTATION PREVIEW LOGIC
  const computationPreview = useMemo(() => {
    if (!payrollSetup || !tempSalary) return null;
    
    const richEarnings = empEarnings?.map(ee => ({
      type: globalEarnings?.find(ge => ge.id === ee.typeId) || { name: ee.name, isTaxable: true, isPensionable: true } as any,
      amount: ee.amount
    })) || [];

    const richDeductions = empDeductions?.map(ed => ({
      type: globalDeductions?.find(gd => gd.id === ed.typeId) || { name: ed.name, isStatutory: false } as any,
      amount: ed.amount
    })) || [];

    try {
      return calculateNetSalary(
        tempSalary, 
        payrollSetup as unknown as StatutorySettings,
        richEarnings,
        richDeductions
      );
    } catch (e) {
      return null;
    }
  }, [tempSalary, payrollSetup, empEarnings, empDeductions, globalEarnings, globalDeductions]);

  const handleOpenEdit = (emp: any) => {
    setEditingEmp(emp);
    setTempSalary(emp.salary || 0);
    setIsEditOpen(true);
  };

  const handleUpdateStructure = async () => {
    if (!selectedInstId || !editingEmp) return;
    const ref = doc(db, 'institutions', selectedInstId, 'employees', editingEmp.id);
    try {
      await setDoc(ref, { 
        salary: tempSalary, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
      toast({ title: "Master Remuneration Updated" });
      setIsEditOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleAddComponent = async (col: 'earnings' | 'deductions', typeId: string, amount: number) => {
    if (!selectedInstId || !editingEmp || !typeId || amount <= 0) return;
    
    const type = col === 'earnings' 
      ? globalEarnings?.find(e => e.id === typeId)
      : globalDeductions?.find(d => d.id === typeId);

    if (!type) return;

    try {
      if (col === 'earnings') {
        await assignEmployeeEarning(db, selectedInstId, editingEmp.id, { typeId, name: type.name, amount });
      } else {
        await assignEmployeeDeduction(db, selectedInstId, editingEmp.id, { typeId, name: type.name, amount });
      }
      toast({ title: "Component Added" });
    } catch (err) {
      toast({ variant: "destructive", title: "Assignment Failed" });
    }
  };

  const filteredEmployees = employees?.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Layers className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Salary Structures</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Staff Remuneration Matrix</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <BadgeCent className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to manage staff salary structures.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find personnel profile..." 
                  className="pl-9 h-10 text-[10px] bg-card border-none ring-1 ring-border font-bold uppercase tracking-tight" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/20 bg-primary/5 h-8 px-4">
                {filteredEmployees.length} Master Nodes Detected
              </Badge>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Remuneration Ledger</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[8px] bg-emerald-500/10 text-emerald-500 font-black px-2">Compliance Phase: ACTIVE</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Staff Member</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Official Title</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Pay Grade</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-right">Base Salary</TableHead>
                      <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Structure Cmd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Polling Roster...</TableCell></TableRow>
                    ) : filteredEmployees.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No matching personnel nodes.</TableCell></TableRow>
                    ) : filteredEmployees.map((emp) => (
                      <TableRow key={emp.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase shadow-sm">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{emp.firstName} {emp.lastName}</span>
                              <span className="text-[9px] text-muted-foreground font-mono font-bold tracking-widest opacity-60">ID: {emp.employeeId}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-bold uppercase text-primary/70">{emp.jobTitle}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-4 font-black uppercase border-primary/20 bg-primary/5 text-primary">
                            {payGrades?.find(g => g.id === emp.payGradeId)?.name || 'NO GRADE'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-foreground/80">
                          {currency} {emp.salary?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary" onClick={() => handleOpenEdit(emp)}>
                            <Edit2 className="size-3" /> Refine Structure
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-5xl shadow-2xl ring-1 ring-border rounded-[2.5rem] p-0 overflow-hidden">
            <div className="grid lg:grid-cols-12 h-full max-h-[90vh]">
              <div className="lg:col-span-8 p-8 flex flex-col overflow-hidden">
                <DialogHeader className="mb-6 shrink-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><UserCircle className="size-5" /></div>
                    <DialogTitle className="text-lg font-bold uppercase">Remuneration Profile</DialogTitle>
                  </div>
                  <DialogDescription className="text-xs uppercase font-black tracking-tight text-primary">Subject Node: {editingEmp?.firstName} {editingEmp?.lastName}</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="base" className="flex-1 overflow-hidden flex flex-col">
                  <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none shrink-0">
                    <TabsTrigger value="base" className="text-[10px] font-black uppercase tracking-widest gap-2 px-6 py-2 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent">
                      <Wallet className="size-3.5" /> 1. Base Pay
                    </TabsTrigger>
                    <TabsTrigger value="earnings" className="text-[10px] font-black uppercase tracking-widest gap-2 px-6 py-2 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent">
                      <TrendingUp className="size-3.5" /> 2. Recurring Earnings
                    </TabsTrigger>
                    <TabsTrigger value="deductions" className="text-[10px] font-black uppercase tracking-widest gap-2 px-6 py-2 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent">
                      <TrendingDown className="size-3.5" /> 3. Recurring Deductions
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <TabsContent value="base" className="space-y-6 mt-0">
                      <div className="space-y-3">
                        <Label className="uppercase font-black text-[10px] tracking-[0.2em] opacity-60">Monthly Basic Gross ({currency})</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-sm">KES</span>
                          <Input 
                            type="number" 
                            value={tempSalary} 
                            onChange={(e) => setTempSalary(parseFloat(e.target.value) || 0)}
                            className="h-14 pl-14 text-2xl font-black font-headline border-none ring-1 ring-border bg-secondary/5 focus:ring-primary shadow-inner" 
                          />
                        </div>
                      </div>
                      <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 shadow-inner space-y-4">
                        <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em]">
                          <ShieldCheck className="size-4" /> Compliance Guard
                        </div>
                        <p className="text-[11px] leading-relaxed italic text-muted-foreground">
                          Base Salary changes are tracked in the institutional audit trail. Ensure this alignment matches the contract node in **HR &gt; Documents**.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="earnings" className="space-y-6 mt-0">
                      <div className="bg-secondary/5 p-4 rounded-2xl border space-y-4">
                        <Label className="text-[10px] font-black uppercase opacity-60 tracking-widest">Add Recurring Earning</Label>
                        <form className="flex gap-2" onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          handleAddComponent('earnings', fd.get('typeId') as string, parseFloat(fd.get('amount') as string));
                          e.currentTarget.reset();
                        }}>
                          <Select name="typeId" required>
                            <SelectTrigger className="h-10 text-xs bg-background"><SelectValue placeholder="Pick Earning Type" /></SelectTrigger>
                            <SelectContent>
                              {globalEarnings?.map(e => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input name="amount" type="number" placeholder="Value" required className="h-10 w-24 text-xs font-black bg-background" />
                          <Button type="submit" size="icon" className="h-10 w-10 shrink-0"><Plus className="size-4" /></Button>
                        </form>
                      </div>

                      <Table>
                        <TableBody>
                          {!empEarnings?.length ? (
                            <TableRow><TableCell className="text-center py-12 text-[10px] opacity-20 uppercase font-black italic">No recurring earnings defined.</TableCell></TableRow>
                          ) : empEarnings.map(ee => (
                            <TableRow key={ee.id} className="h-12 border-b-border/30 group">
                              <TableCell className="text-xs font-black uppercase tracking-tight">{ee.name}</TableCell>
                              <TableCell className="text-right font-mono text-xs font-black text-primary">{currency} {ee.amount?.toLocaleString()}</TableCell>
                              <TableCell className="text-right pr-4 w-10">
                                <Button variant="ghost" size="icon" className="size-7 text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={() => removeEmployeeEarning(db, selectedInstId, editingEmp.id, ee.id)}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="deductions" className="space-y-6 mt-0">
                      <div className="bg-destructive/5 p-4 rounded-2xl border border-destructive/10 space-y-4">
                        <Label className="text-[10px] font-black uppercase opacity-60 tracking-widest text-destructive">Add Voluntary Deduction</Label>
                        <form className="flex gap-2" onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          handleAddComponent('deductions', fd.get('typeId') as string, parseFloat(fd.get('amount') as string));
                          e.currentTarget.reset();
                        }}>
                          <Select name="typeId" required>
                            <SelectTrigger className="h-10 text-xs bg-background"><SelectValue placeholder="Pick Deduction Type" /></SelectTrigger>
                            <SelectContent>
                              {globalDeductions?.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input name="amount" type="number" placeholder="Value" required className="h-10 w-24 text-xs font-black bg-background" />
                          <Button type="submit" size="icon" variant="destructive" className="h-10 w-10 shrink-0"><Plus className="size-4" /></Button>
                        </form>
                      </div>

                      <Table>
                        <TableBody>
                          {!empDeductions?.length ? (
                            <TableRow><TableCell className="text-center py-12 text-[10px] opacity-20 uppercase font-black italic">No voluntary deductions mapped.</TableCell></TableRow>
                          ) : empDeductions.map(ed => (
                            <TableRow key={ed.id} className="h-12 border-b-border/30 group">
                              <TableCell className="text-xs font-black uppercase tracking-tight">{ed.name}</TableCell>
                              <TableCell className="text-right font-mono text-xs font-black text-destructive">{currency} {ed.amount?.toLocaleString()}</TableCell>
                              <TableCell className="text-right pr-4 w-10">
                                <Button variant="ghost" size="icon" className="size-7 text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={() => removeEmployeeDeduction(db, selectedInstId, editingEmp.id, ed.id)}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  </div>
                </Tabs>

                <div className="pt-8 mt-auto shrink-0 flex gap-3 border-t">
                  <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)} className="h-11 px-8 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                  <Button onClick={handleUpdateStructure} className="h-11 px-12 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2 border-none ring-2 ring-primary/20 transition-all active:scale-95">
                    <Save className="size-4" /> Save Master Remuneration Node
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-4 bg-secondary/20 border-l border-border/50 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 mb-4">
                  <Calculator className="size-4 text-primary" /> Multi-Layer Audit
                </h3>
                
                {computationPreview ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="p-5 bg-background rounded-3xl border border-border/50 shadow-xl space-y-3">
                      <div className="flex justify-between text-[9px] font-bold uppercase"><span className="opacity-50">Computed Gross</span><span className="font-black text-foreground">KES {computationPreview.gross.toLocaleString()}</span></div>
                      <div className="flex justify-between text-[9px] font-bold uppercase text-destructive"><span className="opacity-50">Statutory Deduct.</span><span className="font-black">- {(computationPreview.paye + computationPreview.nssf + computationPreview.sha + computationPreview.housingLevy).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                      <div className="flex justify-between text-[9px] font-bold uppercase text-destructive"><span className="opacity-50">Custom Deduct.</span><span className="font-black">- {computationPreview.customDeductions.toLocaleString()}</span></div>
                      <div className="pt-4 border-t border-border/50 flex justify-between items-end">
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500 pb-1">Final Settlement</span>
                        <div className="text-right">
                          <p className="text-2xl font-black font-headline text-emerald-500 leading-none">{computationPreview.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <span className="text-[8px] font-mono font-bold opacity-40 uppercase">KES Take-Home</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest pl-1">Statutory Matrix</p>
                      {[
                        { label: 'NSSF (Pension)', val: computationPreview.nssf, icon: Landmark, color: 'text-primary' },
                        { label: 'S.H.A (Health)', val: computationPreview.sha, icon: Activity, color: 'text-emerald-500' },
                        { label: 'Housing Levy', val: computationPreview.housingLevy, icon: Building, color: 'text-accent' },
                        { label: 'P.A.Y.E (Tax)', val: computationPreview.paye, icon: Scale, color: 'text-destructive' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl bg-background/50 border border-border/30 hover:bg-background transition-all hover:scale-[1.02] shadow-sm">
                          <div className="flex items-center gap-2">
                            <item.icon className={cn("size-3.5", item.color)} />
                            <span className="text-[9px] font-bold uppercase opacity-70">{item.label}</span>
                          </div>
                          <span className="font-mono text-[10px] font-black">KES {item.val.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 rounded-[2rem] bg-accent/5 border border-accent/10 relative overflow-hidden group shadow-md mt-8">
                      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-6 transition-transform"><Sparkles className="size-24 text-accent" /></div>
                      <div className="flex flex-col gap-2 relative z-10">
                        <div className="flex items-center gap-2">
                          <Zap className="size-4 text-accent animate-pulse" />
                          <p className="text-[10px] font-black uppercase text-accent tracking-widest">Yield Insight</p>
                        </div>
                        <p className="text-[10px] leading-relaxed text-muted-foreground font-medium italic">
                          "This employee's tax efficiency is currently at **{(100 - (computationPreview.paye / computationPreview.gross * 100)).toFixed(1)}%**. High-value deductions like Mortgage Relief are not currently detected."
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center opacity-30 gap-3 border-2 border-dashed rounded-[2.5rem]">
                    <History className="size-12" />
                    <p className="text-[9px] font-black uppercase max-w-[150px] tracking-widest">Assign base salary to trigger audit Engine</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
