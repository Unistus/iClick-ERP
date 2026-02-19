'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc, query, orderBy, updateDoc } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { 
  Settings, 
  Save, 
  Loader2, 
  CalendarDays, 
  ShieldCheck, 
  Zap,
  Plus,
  Lock,
  Unlock,
  AlertTriangle,
  ShoppingCart,
  ShieldAlert,
  Calculator
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function BudgetSetupPage() {
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
    return doc(db, 'institutions', selectedInstId, 'settings', 'budgeting');
  }, [db, selectedInstId]);
  const { data: setup } = useDoc(setupRef);

  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), orderBy('startDate', 'desc'));
  }, [db, selectedInstId]);
  const { data: periods, isLoading: periodsLoading } = useCollection(periodsQuery);

  const handleSavePolicy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !setupRef) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates: any = {};
    formData.forEach((value, key) => {
      if (key === 'enableThresholdAlerts' || key === 'strictBudgetControl' || key === 'strictPoEnforcement') {
        updates[key] = value === 'on';
      } else if (key === 'varianceTolerance') {
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

      logSystemEvent(db, selectedInstId, user, 'BUDGETING', 'Update Setup', 'Institutional budget and PO enforcement policies modified.');
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
    // Standard Pattern: Ensure a variance/contingency node exists
    const coaRef = doc(db, 'institutions', selectedInstId, 'coa', 'budget_variance');
    try {
      await setDoc(coaRef, {
        id: 'budget_variance',
        code: '3200',
        name: 'Unallocated Budget Buffer',
        type: 'Equity',
        subtype: 'Retained Earnings',
        balance: 0,
        isActive: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast({ title: "Financial Nodes Synced", description: "Budget variance and buffer accounts initialized." });
    } catch (err) {
      toast({ variant: "destructive", title: "Bootstrap Failed" });
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleTogglePeriod = async (periodId: string, currentStatus: string) => {
    if (!selectedInstId) return;
    const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
    const ref = doc(db, 'institutions', selectedInstId, 'fiscal_periods', periodId);
    try {
      await updateDoc(ref, { status: newStatus, updatedAt: serverTimestamp() });
      toast({ title: `Period ${newStatus}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Status Update Failed" });
    }
  };

  const handleAddPeriod = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      status: 'Open',
      institutionId: selectedInstId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    addDocumentNonBlocking(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), data);
    e.currentTarget.reset();
    toast({ title: "Fiscal Period Created" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Settings className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Budget Policy</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Institutional Fiscal Governance</p>
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
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Settings className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground text-center">Select an institution to configure budget policies.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <CalendarDays className="size-4 text-primary" /> Fiscal Periods
                      </CardTitle>
                      <CardDescription className="text-[10px]">Define and lock auditing cycles.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-4 border-b bg-secondary/5">
                    <form onSubmit={handleAddPeriod} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <Input name="name" placeholder="Period Name (e.g. FY24 Q1)" required className="h-9 text-xs" />
                      <Input name="startDate" type="date" required className="h-9 text-xs" />
                      <Input name="endDate" type="date" required className="h-9 text-xs" />
                      <Button type="submit" size="sm" className="h-9 font-black uppercase text-[10px] gap-2"><Plus className="size-3" /> Register Cycle</Button>
                    </form>
                  </div>
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-9 text-[10px] font-black uppercase pl-6">Period Name</TableHead>
                        <TableHead className="h-9 text-[10px] font-black uppercase">Range</TableHead>
                        <TableHead className="h-9 text-[10px] font-black uppercase text-center">Status</TableHead>
                        <TableHead className="h-9 text-right pr-6 text-[10px] font-black uppercase">Lifecycle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodsLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs animate-pulse uppercase">Syncing cycles...</TableCell></TableRow>
                      ) : periods?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs text-muted-foreground uppercase font-bold">No active cycles defined.</TableCell></TableRow>
                      ) : periods?.map(p => (
                        <TableRow key={p.id} className="h-12 hover:bg-secondary/5 border-b-border/30 group">
                          <TableCell className="pl-6 font-bold text-xs uppercase">{p.name}</TableCell>
                          <TableCell className="text-[10px] font-mono text-muted-foreground uppercase">{p.startDate} to {p.endDate}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn("text-[8px] h-4 border-none font-black uppercase", p.status === 'Open' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive')}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-3 text-[9px] font-black uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleTogglePeriod(p.id, p.status)}
                            >
                              {p.status === 'Open' ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                              {p.status === 'Open' ? 'Close Cycle' : 'Open Cycle'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <form onSubmit={handleSavePolicy}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50 bg-secondary/5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-500" /> Control Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-bold">Threshold Alerts</Label>
                            <p className="text-[10px] text-muted-foreground">Trigger notifications at 90% utilization.</p>
                          </div>
                          <Switch name="enableThresholdAlerts" defaultChecked={setup?.enableThresholdAlerts} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-bold">Strict Budget Control</Label>
                            <p className="text-[10px] text-muted-foreground">Force spend adherence across all modules.</p>
                          </div>
                          <Switch name="strictBudgetControl" defaultChecked={setup?.strictBudgetControl} />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-bold flex items-center gap-2 text-primary">
                              <ShoppingCart className="size-3.5" /> Strict PO Enforcement
                            </Label>
                            <p className="text-[10px] text-muted-foreground leading-tight">Block Purchase Orders if they breach the account budget ceiling.</p>
                          </div>
                          <Switch name="strictPoEnforcement" defaultChecked={setup?.strictPoEnforcement} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Variance Tolerance (%)</Label>
                          <Input name="varianceTolerance" type="number" step="0.1" defaultValue={setup?.varianceTolerance || 5} className="h-10 text-lg font-black bg-secondary/5" />
                        </div>
                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[10px] leading-relaxed text-muted-foreground italic font-medium">
                            "Tightening tolerance reduces fiscal risk but increases operational friction. Recommended level: 5% for mature institutions."
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-6 bg-secondary/10 border-t border-border/50 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-10 px-8 font-black uppercase text-xs gap-2 shadow-lg shadow-primary/20">
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Deploy Fiscal Policies
                    </Button>
                  </div>
                </Card>
              </form>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-xl bg-secondary/5 h-full relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><Zap className="size-32 text-primary" /></div>
                <CardHeader>
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Fiscal Intelligence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                    "Institutional budget logic governs the financial ceilings applied to every operational module. Strict control mode enforces absolute adherence during procurement."
                  </p>
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="size-4 text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">PO Gatekeeper</p>
                    </div>
                    <p className="text-[10px] leading-snug">
                      When **Strict PO Enforcement** is active, the system checks the live ledger balance + the new PO value against the period limit before finalization.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
