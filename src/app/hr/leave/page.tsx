
'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, where, doc } from "firebase/firestore";
import { format } from "date-fns";
import { 
  CalendarDays, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileText,
  History,
  Activity,
  UserCircle,
  ShieldAlert,
  Venus,
  Mars
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { submitLeaveRequest } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { cn } from "@/lib/utils";

export default function LeaveManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Selection Logic for Filtering
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const leaveQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'leave_requests'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: requests, isLoading } = useCollection(leaveQuery);

  const employeesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employees');
  }, [db, selectedInstId]);
  const { data: employees } = useCollection(employeesRef);

  const leaveTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'leave_types');
  }, [db, selectedInstId]);
  const { data: leaveTypes } = useCollection(leaveTypesRef);

  // Dynamic Filtering: Find selected employee gender
  const targetEmployee = useMemo(() => 
    employees?.find(e => e.id === targetEmployeeId), 
    [employees, targetEmployeeId]
  );

  const filteredLeaveTypes = useMemo(() => {
    if (!leaveTypes) return [];
    if (!targetEmployee) return leaveTypes; // Default to all if no employee selected

    return leaveTypes.filter(lt => 
      lt.genderApplicability === 'All' || 
      lt.genderApplicability === targetEmployee.gender
    );
  }, [leaveTypes, targetEmployee]);

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      employeeId: targetEmployeeId,
      leaveType: formData.get('leaveType') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      reason: formData.get('reason') as string,
    };

    try {
      await submitLeaveRequest(db, selectedInstId, data);
      toast({ title: "Request Submitted", description: "Awaiting departmental approval." });
      setIsCreateOpen(false);
      setTargetEmployeeId("");
    } catch (err) {
      toast({ variant: "destructive", title: "Submission Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary shadow-inner">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Absence Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Leave & Vacation Governance</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg bg-primary" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Raise Request
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <CalendarDays className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage leave cycles.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Pending</span></CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{requests?.filter(r => r.status === 'Pending').length || 0} REQS</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[10px] font-bold uppercase text-emerald-500 tracking-widest">Approved (MTD)</span></CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-emerald-500">{requests?.filter(r => r.status === 'Approved').length || 0} DAYS</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[10px] font-bold uppercase text-primary tracking-widest">Absence Rate</span></CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">2.4%</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Staff Member</TableHead>
                    <TableHead className="h-10 text-[9px] font-black uppercase">Leave Category</TableHead>
                    <TableHead className="h-10 text-[9px] font-black uppercase">Validity Window</TableHead>
                    <TableHead className="h-10 text-[9px] font-black uppercase text-center">Status</TableHead>
                    <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Management</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing Vault...</TableCell></TableRow>
                  ) : requests?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No active requests.</TableCell></TableRow>
                  ) : requests?.map((r) => (
                    <TableRow key={r.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-tight">
                            {employees?.find(e => e.id === r.employeeId)?.firstName || '...'}
                          </span>
                          <span className="text-[8px] text-muted-foreground font-mono">
                            {employees?.find(e => e.id === r.employeeId)?.employeeId || 'ID-000'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[8px] h-4 uppercase font-black bg-primary/10 text-primary border-none">
                          {r.leaveType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono font-bold opacity-60 uppercase">
                        {r.startDate} to {r.endDate}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "text-[8px] h-4 uppercase font-black border-none",
                          r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500 animate-pulse'
                        )}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100"><History className="size-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleRequest}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="size-5 text-primary" />
                  <DialogTitle className="text-sm font-bold uppercase tracking-wider">Raise Absence Requisition</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase tracking-tight">Institutional Compliance Check: ON</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Requesting Employee</Label>
                  <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId} required>
                    <SelectTrigger className="h-10 font-bold uppercase"><SelectValue placeholder="Pick Identity..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => (
                        <SelectItem key={e.id} value={e.id} className="text-xs font-bold uppercase">
                          {e.firstName} {e.lastName} ({e.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Leave Category</Label>
                  <Select name="leaveType" required disabled={!targetEmployeeId}>
                    <SelectTrigger className="h-10 font-bold uppercase">
                      <SelectValue placeholder={targetEmployeeId ? "Select Eligibility..." : "Select Employee First"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLeaveTypes.map(lt => (
                        <SelectItem key={lt.id} value={lt.name} className="text-xs font-bold uppercase">
                          {lt.name} ({lt.daysPerYear} Days)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {targetEmployee && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[8px] h-4 bg-primary/5 text-primary border-none font-black uppercase">
                        {targetEmployee.gender === 'Male' ? <Mars className="size-2 mr-1" /> : <Venus className="size-2 mr-1" />}
                        Enforcing {targetEmployee.gender} Rules
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Start Date</Label>
                    <Input name="startDate" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">End Date</Label>
                    <Input name="endDate" type="date" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Reason / Justification</Label>
                  <Input name="reason" placeholder="Briefly state reason..." required />
                </div>

                <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex gap-3 items-start">
                  <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    The category list above is restricted based on the selected employee's gender to ensure institutional compliance.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isProcessing || !targetEmployeeId} className="h-10 font-bold uppercase text-xs w-full bg-primary shadow-lg shadow-primary/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <CheckCircle2 className="size-3 mr-2" />} Submit Requisition
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
