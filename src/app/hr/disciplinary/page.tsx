'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp } from "firebase/firestore";
import { 
  ShieldAlert, 
  Plus, 
  Search, 
  Gavel, 
  History, 
  MoreVertical, 
  Activity,
  Flame,
  AlertTriangle,
  LayoutGrid,
  FileWarning,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Hammer
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logDisciplinaryRecord } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { format } from "date-fns";

export default function DisciplinaryRecordsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const recordsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'disciplinary_records'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: records, isLoading } = useCollection(recordsQuery);

  const employeesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employees');
  }, [db, selectedInstId]);
  const { data: employees } = useCollection(employeesRef);

  const handleLogIncident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      employeeId: formData.get('employeeId') as string,
      issuerId: user?.uid,
      date: formData.get('date') as string,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
      actionTaken: formData.get('actionTaken') as string,
    };

    try {
      await logDisciplinaryRecord(db, selectedInstId, data);
      toast({ title: "Incident Logged", description: "Disciplinary archive updated." });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Logging Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-destructive/20 text-destructive shadow-inner">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Conduct & Discipline</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Institutional Compliance & Conduct Log</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-full md:w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Verifying..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="destructive" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-destructive/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Log Incident
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Gavel className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access conduct archives.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
            <div className="lg:col-span-8">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Conduct Ledger</CardTitle>
                  <Badge variant="outline" className="text-[8px] bg-destructive/10 text-destructive font-black uppercase border-none">Secure Archive</Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Staff Member</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase">Incident Type</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase">Action Taken</TableHead>
                        <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse uppercase">Syncing Records...</TableCell></TableRow>
                      ) : records?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold opacity-30">Zero conduct incidents recorded.</TableCell></TableRow>
                      ) : records?.map((r) => (
                        <TableRow key={r.id} className="h-14 hover:bg-destructive/5 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6 font-bold text-xs uppercase tracking-tight">
                            {employees?.find(e => e.id === r.employeeId)?.firstName || '...'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[8px] h-4 bg-destructive/10 text-destructive border-none font-black uppercase px-2">
                              {r.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] font-medium opacity-70 italic truncate max-w-[200px]">
                            {r.actionTaken}
                          </TableCell>
                          <TableCell className="text-right pr-6 text-[10px] font-mono opacity-50 uppercase">
                            {r.createdAt?.toDate ? format(r.createdAt.toDate(), 'dd/MM HH:mm') : '...'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-destructive/5 border-none ring-1 ring-destructive/20 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><AlertTriangle className="size-24 text-destructive" /></div>
                <div className="space-y-3 relative z-10">
                  <p className="text-[10px] font-black uppercase text-destructive tracking-widest">Risk Governance</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Disciplinary data is strictly controlled. Every record entry is permanently linked to the creating administrator's audit trail."
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border">
            <form onSubmit={handleLogIncident}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <FileWarning className="size-5 text-destructive" />
                  <DialogTitle>Log Compliance Incident</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-widest">Conduct & Regulatory Audit Registry</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Target Personnel</Label>
                  <Select name="employeeId" required>
                    <SelectTrigger className="h-10 font-bold uppercase"><SelectValue placeholder="Pick Subject..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => <SelectItem key={e.id} value={e.id} className="text-xs font-bold uppercase">{e.firstName} {e.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Violation Type</Label>
                    <Select name="type" defaultValue="Verbal Warning" required>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Verbal Warning" className="text-[10px] font-bold uppercase">Verbal Warning</SelectItem>
                        <SelectItem value="Written Warning" className="text-[10px] font-bold uppercase">Written Warning</SelectItem>
                        <SelectItem value="Suspension" className="text-[10px] font-black uppercase text-destructive">Suspension</SelectItem>
                        <SelectItem value="Termination" className="text-[10px] font-black uppercase text-destructive">Termination</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Incident Date</Label>
                    <Input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Factual Description</Label>
                  <Textarea name="description" placeholder="Objective details of the violation..." required className="min-h-[80px] bg-secondary/5" />
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Corrective Action Taken</Label>
                  <Input name="actionTaken" placeholder="e.g. PIP assigned, counseling issued" required />
                </div>

                <div className="p-4 bg-destructive/5 border border-destructive/10 rounded-xl flex gap-4 items-start text-destructive shadow-inner mt-2">
                  <Hammer className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Enforcement Note</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">
                      Incidents are un-editable once finalized. Every entry is logged in the **Institutional Audit Stream** for labor court compliance.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-11 font-black uppercase tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-11 px-10 font-bold uppercase text-xs shadow-2xl shadow-destructive/40 bg-destructive hover:bg-destructive/90 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <ShieldAlert className="size-4" />} Commit Record
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
