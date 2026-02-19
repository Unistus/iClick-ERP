'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where, serverTimestamp } from "firebase/firestore";
import { 
  CalendarCheck, 
  Plus, 
  Activity, 
  Clock, 
  UserCircle, 
  Users,
  LayoutGrid,
  Zap,
  Loader2,
  RefreshCw,
  MoreVertical,
  CalendarDays,
  Timer
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createShiftAssignment } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function ShiftManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const shiftsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'shifts'), orderBy('date', 'desc'));
  }, [db, selectedInstId]);
  const { data: shifts, isLoading } = useCollection(shiftsQuery);

  const employeesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employees');
  }, [db, selectedInstId]);
  const { data: employees } = useCollection(employeesRef);

  const handleCreateShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      employeeId: formData.get('employeeId') as string,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      role: formData.get('role') as string,
      institutionId: selectedInstId,
    };

    try {
      await createShiftAssignment(db, selectedInstId, data);
      toast({ title: "Shift Scheduled", description: "Roster updated successfully." });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Assignment Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary shadow-inner border border-primary/10">
              <CalendarCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Roster Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Shift Planning & Labor Optimization</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-full md:w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg bg-primary" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Roster
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <CalendarCheck className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground text-center">Select an institution to manage labor schedules.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Shifts</span>
                  <Activity className="size-3.5 text-primary" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-bold">{shifts?.length || 0} SCHEDULED</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-accent tracking-widest">Open Positions</span>
                  <Users className="size-3.5 text-accent" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-bold">4 VACANT</div>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10"><Zap className="size-24 text-emerald-500" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Efficiency Pulse</span>
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-xl font-bold">OPTIMAL</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Shift Schedule</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[8px] bg-primary/10 text-primary font-black uppercase">Planning v1.2</Badge>
                  <Button variant="ghost" size="icon" className="size-8"><RefreshCw className="size-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Operator</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Shift Date</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Time Window</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-center">Status</TableHead>
                      <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Management</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase">Syncing Roster...</TableCell></TableRow>
                    ) : shifts?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">Roster is empty.</TableCell></TableRow>
                    ) : shifts?.map((s) => (
                      <TableRow key={s.id} className="h-14 hover:bg-secondary/5 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><UserCircle className="size-4" /></div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase">{employees?.find(e => e.id === s.employeeId)?.firstName || '...'}</span>
                              <span className="text-[8px] text-muted-foreground font-bold">{s.role || 'General Staff'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono font-bold uppercase opacity-60">
                          {format(new Date(s.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-primary">
                            <Clock className="size-3 opacity-50" />
                            {s.startTime} — {s.endTime}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[8px] h-4 font-black bg-emerald-500/10 text-emerald-500 border-none uppercase">
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="size-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border">
            <form onSubmit={handleCreateShift}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="size-5 text-primary" />
                  <DialogTitle>Assign Roster Shift</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tighter">Institutional Resource Allocation</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Staff Member</Label>
                  <Select name="employeeId" required>
                    <SelectTrigger className="h-10 font-bold uppercase"><SelectValue placeholder="Pick Talent..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => <SelectItem key={e.id} value={e.id} className="text-xs font-bold uppercase">{e.firstName} {e.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Shift Date</Label>
                    <Input name="date" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Position / Role</Label>
                    <Input name="role" placeholder="e.g. Lead Pharmacist" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Start Time</Label>
                    <Input name="startTime" type="time" defaultValue="08:00" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">End Time</Label>
                    <Input name="endTime" type="time" defaultValue="17:00" required />
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-4 items-start text-primary shadow-inner mt-2">
                  <Timer className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Labor Logic</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">
                      Finalizing this assignment will instantly sync the shift to the employee's dashboard and the **Attendance Command Hub**.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-11 font-black uppercase tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-11 px-10 font-bold uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-4" />} Complete Assignment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
