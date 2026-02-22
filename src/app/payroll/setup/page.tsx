'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { 
  Settings2, 
  Save, 
  Loader2, 
  Landmark, 
  Plus, 
  Trash2, 
  Calculator, 
  Zap, 
  Sparkles,
  Info,
  Scale,
  TrendingUp,
  History,
  Activity,
  ShieldCheck,
  Percent,
  ListTree
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { bootstrapPayrollFinancials } from '@/lib/payroll/payroll.service';
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function PayrollSetupPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Data Fetching
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'payroll');
  }, [db, selectedInstId]);
  const { data: setup } = useDoc(setupRef);

  const coaRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'coa');
  }, [db, selectedInstId]);
  const { data: accounts } = useCollection(coaRef);

  const earningsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'earning_types');
  }, [db, selectedInstId]);
  const { data: earningTypes } = useCollection(earningsRef);

  const deductionsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'deduction_types');
  }, [db, selectedInstId]);
  const { data: deductionTypes } = useCollection(deductionsRef);

  const handleSavePolicy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !setupRef) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates: any = {};
    formData.forEach((value, key) => {
      if (['autoPostToLedger', 'enableHousingLevy', 'strictBankValidation'].includes(key)) {
        updates[key] = value === 'on';
      } else if (['personalRelief', 'shaRate', 'housingLevyRate', 'nssfRate', 'nssfTierIILimit'].includes(key)) {
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

      logSystemEvent(db, selectedInstId, user, 'PAYROLL', 'Update Setup', 'Institutional payroll parameters and statutory rates modified.');
      toast({ title: "Payroll Policy Deployed" });
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
      await bootstrapPayrollFinancials(db, selectedInstId);
      toast({ title: "Financial Hub Active", description: "Standard payroll COA nodes and mappings initialized." });
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
    const data = {
      name: formData.get('name'),
      isTaxable: formData.get('isTaxable') === 'on',
      isPensionable: formData.get('isPensionable') === 'on',
      ledgerAccountId: formData.get('ledgerAccountId'),
      createdAt: serverTimestamp()
    };
    addDocumentNonBlocking(collection(db, 'institutions', selectedInstId, col), data);
    e.currentTarget.reset();
    toast({ title: "Component Registered" });
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
              <h1 className="text-2xl font-headline font-bold text-foreground">Payroll Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Institutional Remuneration Logic & Statutory Bands</p>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
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
              Sync Regulatory Nodes
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-[2rem] bg-secondary/5">
            <Calculator className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure its payroll perimeter.</p>
          </div>
        ) : (
          <Tabs defaultValue="bands" className="w-full">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none w-full">
              <TabsTrigger value="bands" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Percent className="size-3.5" /> Bands & Rates</TabsTrigger>
              <TabsTrigger value="financial" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Calculator className="size-3.5" /> Ledger Integration</TabsTrigger>
              <TabsTrigger value="earnings" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><TrendingUp className="size-3.5" /> Earning Types</TabsTrigger>
              <TabsTrigger value="deductions" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Scale className="size-3.5" /> Custom Deductions</TabsTrigger>
            </TabsList>

            <TabsContent value="bands" className="space-y-6">
              <form onSubmit={handleSavePolicy}>
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                      <CardHeader className="bg-secondary/10 border-b py-4 px-6 flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
                            <Landmark className="size-4" /> Kenyan Statutory Matrix (2024)
                          </CardTitle>
                          <CardDescription className="text-[10px]">Define the tax and social security parameters for this entity.</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8 space-y-10">
                        <div className="grid md:grid-cols-2 gap-12">
                          <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-primary uppercase border-b pb-2 tracking-[0.2em]">Health & Housing Funds</h3>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-bold uppercase opacity-60">S.H.A Rate (%)</Label>
                              <Input name="shaRate" type="number" step="0.01" defaultValue={setup?.shaRate || 2.75} className="h-10 font-black bg-secondary/5" />
                              <p className="text-[8px] text-muted-foreground italic">Standard Social Health Authority rate on Gross.</p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-bold uppercase opacity-60">Housing Levy Rate (%)</Label>
                              <Input name="housingLevyRate" type="number" step="0.01" defaultValue={setup?.housingLevyRate || 1.5} className="h-10 font-black bg-secondary/5" />
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-accent uppercase border-b pb-2 tracking-[0.2em]">Pension (NSSF)</h3>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-bold uppercase opacity-60">Tier II Upper Limit</Label>
                              <Input name="nssfTierIILimit" type="number" defaultValue={setup?.nssfTierIILimit || 36000} className="h-10 font-black bg-secondary/5" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-bold uppercase opacity-60">Pension Rate (%)</Label>
                              <Input name="nssfRate" type="number" step="0.1" defaultValue={setup?.nssfRate || 6} className="h-10 font-black bg-secondary/5" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 border-t pt-8">
                          <h3 className="text-[10px] font-black text-primary uppercase border-b pb-2 tracking-[0.2em]">Income Tax (P.A.Y.E) Bands</h3>
                          <div className="space-y-2 max-w-xs">
                            <Label className="text-[9px] font-bold uppercase opacity-60">Monthly Personal Relief</Label>
                            <Input name="personalRelief" type="number" defaultValue={setup?.personalRelief || 2400} className="h-10 font-black bg-primary/5 border-primary/20" />
                          </div>
                          <div className="p-4 bg-secondary/5 rounded-2xl border border-dashed text-center">
                            <Activity className="size-8 mx-auto mb-2 text-primary opacity-20" />
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Standard Graduated Brackets Active</p>
                            <p className="text-[9px] mt-1 italic">10% to 35% brackets are applied automatically via the Calculation Engine.</p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                        <Button type="submit" disabled={isSaving} className="h-11 px-12 font-black uppercase text-xs gap-3 shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 transition-all active:scale-95">
                          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Deploy Statutory Settings
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                  <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-md">
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><ShieldCheck className="size-32 text-emerald-500" /></div>
                      <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-5 text-emerald-500" />
                          <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">Compliance Handshake</p>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                          "Institutional bands configured here serve as the source of truth for the **Payroll Computation Engine**. All salary structures are audited against these rates in real-time."
                        </p>
                      </div>
                    </Card>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="financial">
              <form onSubmit={handleSavePolicy}>
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                      <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
                              <ShieldCheck className="size-4" /> Settlement Node Mapping
                            </CardTitle>
                            <CardDescription className="text-[10px]">Link payroll events to the General Ledger.</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8 space-y-10">
                        <div className="grid md:grid-cols-2 gap-12">
                          <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-primary uppercase border-b pb-2 tracking-[0.2em]">Expense Side</h3>
                            <AccountSelect name="basicSalaryExpenseId" label="Basic Salaries Node" description="Standard monthly basic wage account." typeFilter={['Expense']} />
                            <AccountSelect name="bonusExpenseId" label="Bonus & Incentives Hub" description="Account for commissions and periodic rewards." typeFilter={['Expense']} />
                          </div>
                          <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-accent uppercase border-b pb-2 tracking-[0.2em]">Liability Side</h3>
                            <AccountSelect name="netPayableAccountId" label="Net Salary Clearing" description="Liability node for pending staff payouts." typeFilter={['Liability']} />
                            <AccountSelect name="payeAccountId" label="P.A.Y.E Tax Node" description="Accrued tax owed to regulatory bodies." typeFilter={['Liability']} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-primary/5 rounded-[2rem] border border-primary/10 shadow-inner">
                          <div className="space-y-1">
                            <Label className="text-sm font-bold text-primary">Auto-Post To Ledger</Label>
                            <p className="text-[10px] text-muted-foreground italic">Automatically generate Journal Entries when a payroll cycle is 'Posted'.</p>
                          </div>
                          <Switch name="autoPostToLedger" defaultChecked={setup?.autoPostToLedger} />
                        </div>
                      </CardContent>
                      <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                        <Button type="submit" disabled={isSaving} className="h-11 px-12 font-black uppercase text-xs gap-3 shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 transition-all active:scale-95">
                          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Commit Financial Policy
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-md">
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><Building className="size-32 text-primary" /></div>
                      <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-5 text-primary" />
                          <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Audit Integrity</p>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                          "Institutional payroll settles as a double-entry event. Mappings configured here ensure that Salary, Tax, and Pension liabilities are provisioned instantly upon cycle finalization."
                        </p>
                      </div>
                    </Card>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="earnings">
              <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-500" /> Remuneration Components
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-6 border-b bg-secondary/5">
                    <form onSubmit={(e) => handleAddSubItem('earning_types', e)} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      <div className="col-span-1 md:col-span-2 space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase opacity-50 pl-1">Earning Label</Label>
                        <Input name="name" placeholder="e.g. Overtime, Night Shift Diff" required className="h-10 text-xs bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase opacity-50 pl-1">Target Ledger</Label>
                        <Select name="ledgerAccountId" required>
                          <SelectTrigger className="h-10 text-xs bg-background"><SelectValue placeholder="Pick Account" /></SelectTrigger>
                          <SelectContent>
                            {accounts?.filter(a => a.type === 'Expense').map(acc => <SelectItem key={acc.id} value={acc.id} className="text-xs">[{acc.code}] {acc.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-4 pt-6">
                        <div className="flex items-center gap-2"><Switch name="isTaxable" defaultChecked /><Label className="text-[10px] font-bold">Taxable</Label></div>
                        <div className="flex items-center gap-2"><Switch name="isPensionable" defaultChecked /><Label className="text-[10px] font-bold">Pension</Label></div>
                      </div>
                      <div className="pt-5">
                        <Button type="submit" className="w-full h-10 font-black uppercase text-[10px] shadow-lg bg-primary"><Plus className="size-3 mr-2" /> Register</Button>
                      </div>
                    </form>
                  </div>
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Component Designation</TableHead>
                        <TableHead className="h-12 text-[9px] font-black uppercase text-center">Tax Node</TableHead>
                        <TableHead className="h-12 text-[9px] font-black uppercase text-center">Pension Node</TableHead>
                        <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earningTypes?.map(et => (
                        <TableRow key={et.id} className="h-14 hover:bg-emerald-500/5 group border-b-border/30 transition-all">
                          <TableCell className="pl-8">
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight">{et.name}</span>
                              <span className="text-[9px] text-muted-foreground font-mono">GL: {accounts?.find(a => a.id === et.ledgerAccountId)?.code || '...'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={et.isTaxable ? 'secondary' : 'outline'} className={cn("text-[8px] h-4 font-black uppercase", et.isTaxable ? "bg-emerald-500/10 text-emerald-500" : "opacity-30")}>{et.isTaxable ? 'YES' : 'NO'}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={et.isPensionable ? 'secondary' : 'outline'} className={cn("text-[8px] h-4 font-black uppercase", et.isPensionable ? "bg-primary/10 text-primary" : "opacity-30")}>{et.isPensionable ? 'YES' : 'NO'}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <Button variant="ghost" size="icon" className="size-8 text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'earning_types', et.id))}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deductions">
              <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Scale className="size-4 text-destructive" /> Institutional Deductions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-6 border-b bg-secondary/5">
                    <form onSubmit={(e) => handleAddSubItem('deduction_types', e)} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div className="col-span-1 md:col-span-2 space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase opacity-50 pl-1">Deduction Label</Label>
                        <Input name="name" placeholder="e.g. Sacco Savings, Staff Meal Ded" required className="h-10 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase opacity-50 pl-1">Target Liability Ledger</Label>
                        <Select name="ledgerAccountId" required>
                          <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Pick Account" /></SelectTrigger>
                          <SelectContent>
                            {accounts?.filter(a => a.type === 'Liability').map(acc => <SelectItem key={acc.id} value={acc.id} className="text-xs">[{acc.code}] {acc.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="pt-5">
                        <Button type="submit" className="w-full h-10 font-black uppercase text-[10px] shadow-lg bg-destructive hover:bg-destructive/90"><Plus className="size-3 mr-2" /> Register Deduction</Button>
                      </div>
                    </form>
                  </div>
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Deduction Type</TableHead>
                        <TableHead className="h-12 text-[9px] font-black uppercase">Ledger Target</TableHead>
                        <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deductionTypes?.map(dt => (
                        <TableRow key={dt.id} className="h-14 hover:bg-destructive/5 group border-b-border/30 transition-all">
                          <TableCell className="pl-8 font-black uppercase text-xs tracking-tight">{dt.name}</TableCell>
                          <TableCell className="text-[10px] font-mono font-bold text-primary">
                            [{accounts?.find(a => a.id === dt.ledgerAccountId)?.code}] {accounts?.find(a => a.id === dt.ledgerAccountId)?.name}
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <Button variant="ghost" size="icon" className="size-8 text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'deduction_types', dt.id))}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
