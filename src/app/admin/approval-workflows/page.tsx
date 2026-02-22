'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, deleteDoc } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { GitPullRequest, Plus, Edit2, ShieldCheck, Zap, Trash2, ListTree, ArrowRight, Loader2, Save, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const MODULES = ["Sales", "Procurement", "Accounting", "Payroll", "Inventory", "POS", "HR"];

export default function ApprovalWorkflows() {
  const db = useFirestore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instCollectionRef);

  const workflowsQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null;
    return query(collection(db, 'institutions', selectedInstitutionId, 'approval_workflows'));
  }, [db, selectedInstitutionId]);
  
  const { data: workflows, isLoading } = useCollection(workflowsQuery);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstitutionId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      triggerModule: formData.get('triggerModule'),
      autoApproveThreshold: parseFloat(formData.get('autoApproveThreshold') as string) || 0,
      levels: [
        { level: 1, role: 'Manager', slaHours: 24 },
        { level: 2, role: 'Finance', slaHours: 48 }
      ],
      isActive: true,
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'institutions', selectedInstitutionId, 'approval_workflows');

    try {
      if (editingWorkflow) {
        updateDocumentNonBlocking(doc(colRef, editingWorkflow.id), data);
      } else {
        addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp() });
      }
      toast({ title: "Workflow Configured" });
      setIsCreateOpen(false);
      setEditingWorkflow(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner">
              <GitPullRequest className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Workflow Logic</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Institutional Governance Definitions</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg bg-primary" disabled={!selectedInstitutionId} onClick={() => setEditingWorkflow(null)}>
                  <Plus className="size-4" /> Define Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md shadow-2xl ring-1 ring-border">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="size-5 text-primary" />
                      <DialogTitle>{editingWorkflow ? 'Refine' : 'New'} Approval Logic</DialogTitle>
                    </div>
                    <CardDescription className="text-xs uppercase font-black tracking-widest">Strategic Control Node</CardDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4 text-xs">
                    <div className="space-y-2">
                      <Label className="uppercase font-bold tracking-widest opacity-60">Workflow Designation</Label>
                      <Input name="name" defaultValue={editingWorkflow?.name} placeholder="e.g. High-Value PO Approval" required className="h-10 font-bold bg-secondary/5" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="uppercase font-bold tracking-widest opacity-60">Target Module</Label>
                        <Select name="triggerModule" defaultValue={editingWorkflow?.triggerModule || "Procurement"}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MODULES.map(m => <SelectItem key={m} value={m} className="text-[10px] font-bold uppercase">{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase font-bold tracking-widest opacity-60 text-emerald-500">Auto-Approve Floor</Label>
                        <Input name="autoApproveThreshold" type="number" defaultValue={editingWorkflow?.autoApproveThreshold} placeholder="0.00" className="h-10 font-black bg-emerald-500/5 border-none ring-1 ring-emerald-500/20" />
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-4 items-start text-primary shadow-inner mt-2">
                      <Zap className="size-5 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest">Multi-Level Handshake</p>
                        <p className="text-[11px] leading-relaxed italic font-medium">
                          New workflows default to a 2-stage (Manager → Finance) logic. Advanced routing can be configured in the module detail view.
                        </p>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2 border-t border-border/50">
                    <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-11 font-black uppercase tracking-widest">Discard</Button>
                    <Button type="submit" disabled={isProcessing} className="h-11 px-10 font-bold uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2">
                      {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-4" />} Deploy Rule
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-3xl bg-secondary/5">
            <ListTree className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure governance workflows.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
            <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Policy Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-8">Workflow Name</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Trigger</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-center">Stages</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-right">Floor Limit</TableHead>
                      <TableHead className="h-10 text-right pr-8 text-[9px] font-black uppercase">Lifecycle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing Rules Hub...</TableCell></TableRow>
                    ) : workflows?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No governance rules defined.</TableCell></TableRow>
                    ) : workflows?.map((wf) => (
                      <TableRow key={wf.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8 font-bold text-xs uppercase tracking-tight">{wf.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-4 bg-primary/5 border-primary/20 text-primary font-black uppercase">{wf.triggerModule}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[10px] font-black opacity-60 uppercase">{wf.levels?.length || 0} LEVELS</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-emerald-500">
                          {wf.autoApproveThreshold > 0 ? `KES ${wf.autoApproveThreshold.toLocaleString()}` : 'STRICT'}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditingWorkflow(wf); setIsCreateOpen(true); }}>
                              <Edit2 className="size-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => deleteDoc(doc(db, 'institutions', selectedInstitutionId, 'approval_workflows', wf.id))}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden group shadow-md">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><ShieldCheck className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Engine Safeguard</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Workflow rules are checked at the **Service Layer** before any transaction finalization. Disabling a rule instantly grants auto-approval permission to all personnel in that module."
                  </p>
                </div>
              </Card>
              <div className="p-6 bg-secondary/10 rounded-2xl border border-border/50 flex flex-col justify-between group cursor-default shadow-inner">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <Zap className="size-3 text-emerald-500" /> Latency Check
                  </p>
                  <p className="text-[11px] font-bold leading-tight">System enforces a mandatory 24h SLA response time for Level 1 Manager sign-offs.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
