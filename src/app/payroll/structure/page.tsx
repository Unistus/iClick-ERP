'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, where, serverTimestamp } from "firebase/firestore";
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
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { calculateNetSalary, type StatutorySettings } from "@/lib/payroll/payroll.service";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { setDoc } from 'firebase/firestore';

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

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'payroll');
  }, [db, selectedInstId]);
  const { data: payrollSetup } = useDoc(settingsRef);

  const globalSettingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: globalSettings } = useDoc(globalSettingsRef);

  const currency = globalSettings?.general?.currencySymbol || "KES";

  const filteredEmployees = employees?.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // COMPUTATION PREVIEW LOGIC
  const computationPreview = useMemo(() => {
    if (!payrollSetup || !tempSalary) return null;
    try {
      return calculateNetSalary(tempSalary, payrollSetup as unknown as StatutorySettings);
    } catch (e) {
      return null;
    }
  }, [tempSalary, payrollSetup]);

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
      toast({ title: "Remuneration Updated" });
      setIsEditOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

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

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 rounded-2xl relative overflow-hidden group shadow-md">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><ShieldCheck className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Remuneration Guard</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Salary structures are anchored to the institutional **Statutory Matrix**. Computation of PAYE, SHA, and Housing Levy is performed using the bands defined in your Payroll Setup tab."
                  </p>
                </div>
              </Card>
              <div className="p-6 bg-secondary/10 rounded-2xl border border-border/50 flex items-center justify-between group cursor-default">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="size-3 text-emerald-500" /> Incentive Integration
                  </p>
                  <p className="text-[11px] font-bold leading-tight">Sales commissions and attendance bonuses are automatically layered onto these base structures.</p>
                </div>
                <Zap className="size-8 text-primary opacity-10 group-hover:opacity-100 transition-all duration-700" />
              </div>
            </div>
          </div>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-3xl shadow-2xl ring-1 ring-border rounded-[2.5rem] p-0 overflow-hidden">
            <div className="grid lg:grid-cols-12">
              <div className="lg:col-span-7 p-8 space-y-6">
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><UserCircle className="size-5" /></div>
                    <DialogTitle className="text-lg font-bold uppercase">Refine Structure</DialogTitle>
                  </div>
                  <DialogDescription className="text-xs uppercase font-black tracking-tight text-primary">Identity Node: {editingEmp?.firstName} {editingEmp?.lastName}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="space-y-3">
                    <Label className="uppercase font-black text-[10px] tracking-[0.2em] opacity-60">Proposed Monthly Basic Gross ({currency})</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-sm">KES</span>
                      <Input 
                        type="number" 
                        value={tempSalary} 
                        onChange={(e) => setTempSalary(parseFloat(e.target.value) || 0)}
                        className="h-14 pl-14 text-2xl font-black font-headline border-none ring-1 ring-border bg-secondary/5 focus:ring-primary" 
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start shadow-inner">
                    <Sparkles className="size-5 text-primary shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Audit Logic Active</p>
                      <p className="text-[11px] leading-relaxed italic text-muted-foreground font-medium">
                        The sidebar preview is calculating deductions based on the **Statutory Bands** node in your Institutional Setup.
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter className="justify-start gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)} className="h-11 px-8 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                  <Button onClick={handleUpdateStructure} className="h-11 px-12 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2 border-none ring-2 ring-primary/20">
                    <Save className="size-4" /> Save Remuneration Node
                  </Button>
                </DialogFooter>
              </div>

              <div className="lg:col-span-5 bg-secondary/20 border-l border-border/50 p-8 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                  <Calculator className="size-4" /> Take-Home Audit
                </h3>
                
                {computationPreview ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="p-4 bg-background rounded-2xl border border-border/50 shadow-sm space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase"><span className="opacity-50">Gross Basis</span><span className="font-black">KES {computationPreview.gross.toLocaleString()}</span></div>
                      <div className="flex justify-between text-[10px] font-bold uppercase text-destructive"><span className="opacity-50">Total Deductions</span><span className="font-black">- {computationPreview.totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                      <div className="pt-2 border-t flex justify-between items-end">
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary pb-1">Est. Net Pay</span>
                        <div className="text-right">
                          <p className="text-xl font-black font-headline text-foreground">{computationPreview.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest pl-1">Statutory Breakdown</p>
                      {[
                        { label: 'NSSF (Pension)', val: computationPreview.nssf, icon: Landmark, color: 'text-primary' },
                        { label: 'SHA (Health)', val: computationPreview.sha, icon: Activity, color: 'text-emerald-500' },
                        { label: 'Housing Levy', val: computationPreview.housingLevy, icon: Building, color: 'text-accent' },
                        { label: 'P.A.Y.E (Tax)', val: computationPreview.paye, icon: Scale, color: 'text-destructive' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/30 hover:bg-background transition-colors">
                          <div className="flex items-center gap-2">
                            <item.icon className={cn("size-3", item.color)} />
                            <span className="text-[9px] font-bold uppercase">{item.label}</span>
                          </div>
                          <span className="font-mono text-[10px] font-bold">KES {item.val.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center opacity-30 gap-3">
                    <History className="size-12" />
                    <p className="text-[10px] font-black uppercase max-w-[150px]">Enter a salary amount to see computation</p>
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
