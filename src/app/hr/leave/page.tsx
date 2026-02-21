
'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where, doc, getDoc } from "firebase/firestore";
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
  Mars,
  LayoutGrid,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { submitLeaveRequest, updateLeaveRequestStatus } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function LeaveManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Declined' | 'All'>('Pending');
  
  // Create Request Form State
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: All Requests
  const leaveQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'leave_requests'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: requests, isLoading } = useCollection(leaveQuery);

  // Data Fetching: Registry Nodes
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

  // Dynamic Filtering
  const targetEmployee = useMemo(() => 
    employees?.find(e => e.id === targetEmployeeId), 
    [employees, targetEmployeeId]
  );

  const filteredLeaveTypes = useMemo(() => {
    if (!leaveTypes) return [];
    if (!targetEmployee) return leaveTypes;
    return leaveTypes.filter(lt => 
      lt.genderApplicability === 'All' || 
      lt.genderApplicability === targetEmployee.gender
    );
  }, [leaveTypes, targetEmployee]);

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter(r => {
      const matchesTab = activeTab === 'All' || r.status === activeTab;
      const emp = employees?.find(e => e.id === r.employeeId);
      const matchesSearch = (emp?.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (emp?.lastName || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [requests, activeTab, searchTerm, employees]);

  const handleAction = async (requestId: string, status: 'Approved' | 'Declined') => {
    if (!selectedInstId) return;
    try {
      await updateLeaveRequestStatus(db, selectedInstId, requestId, status);
      toast({ title: `Request ${status}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing || !targetEmployee) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      employeeId: targetEmployeeId,
      employeeName: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
      leaveType: formData.get('leaveType') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      reason: formData.get('reason') as string,
      days: formData.get('days') as string,
    };

    try {
      await submitLeaveRequest(db, selectedInstId, data);
      toast({ title: "Request Initialized" });
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
              <h1 className="text-2xl font-headline font-bold">Absence Governance</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Lifecycle Requisition & Approval Command</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Validating..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg bg-primary" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Requisition
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-3xl bg-secondary/5">
            <CalendarDays className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage leave cycles.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex gap-1 p-1 bg-secondary/20 rounded-lg w-fit">
                {(['Pending', 'Approved', 'Declined', 'All'] as const).map((s) => (
                  <Button 
                    key={s} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 px-4 text-[10px] font-black uppercase tracking-widest ${activeTab === s ? 'bg-background shadow-sm text-primary' : 'opacity-50'}`}
                    onClick={() => setActiveTab(s)}
                  >
                    {s} {s === 'Pending' && requests?.filter(r => r.status === 'Pending').length ? `(${requests.filter(r => r.status === 'Pending').length})` : ''}
                  </Button>
                ))}
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find staff member..." 
                  className="pl-9 h-9 text-[10px] bg-card border-none ring-1 ring-border font-bold uppercase tracking-tight" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Absence Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Staff Member</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Classification</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Time Window</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-center">Status</TableHead>
                      <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing Approvals...</TableCell></TableRow>
                    ) : filteredRequests.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold opacity-30 italic tracking-widest">No matching requisitions in this queue.</TableCell></TableRow>
                    ) : filteredRequests.map((r) => (
                      <TableRow key={r.id} className="h-16 hover:bg-secondary/5 border-b-border/30 group transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight">{r.employeeName}</span>
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Submitted: {r.createdAt?.toDate ? format(r.createdAt.toDate(), 'dd MMM') : '...'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-5 px-2 bg-primary/10 text-primary border-none font-black uppercase">
                            {r.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono font-bold tracking-tighter opacity-70">
                          {r.startDate} <span className="mx-1 opacity-20">→</span> {r.endDate}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-4 uppercase font-black border-none ring-1 px-2",
                            r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                            r.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-destructive/10 text-destructive ring-destructive/20'
                          )}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {r.status === 'Pending' ? (
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <Button size="sm" variant="ghost" className="h-8 text-[9px] font-black uppercase text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleAction(r.id, 'Approved')}>
                                <CheckCircle2 className="size-3 mr-1.5" /> Authorize
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-[9px] font-black uppercase text-destructive hover:bg-destructive/10" onClick={() => handleAction(r.id, 'Declined')}>
                                <XCircle className="size-3 mr-1.5" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100"><History className="size-3.5" /></Button>
                          )}
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
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-3xl">
            <form onSubmit={handleRequest}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="size-5 text-primary" />
                  <DialogTitle>Raise Absence Requisition</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight text-primary">Compliance Strategy: ENABLED</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Target Personnel</Label>
                  <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId} required>
                    <SelectTrigger className="h-10 font-bold uppercase"><SelectValue placeholder="Pick Subject..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => (
                        <SelectItem key={e.id} value={e.id} className="text-xs font-bold uppercase tracking-tight">
                          {e.firstName} {e.lastName} ({e.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Leave Classification</Label>
                  <Select name="leaveType" required disabled={!targetEmployeeId}>
                    <SelectTrigger className="h-10 font-bold uppercase">
                      <SelectValue placeholder={targetEmployeeId ? "Select Eligibility..." : "Pick Employee First"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLeaveTypes.map(lt => (
                        <SelectItem key={lt.id} value={lt.name} className="text-[10px] font-black uppercase">
                          {lt.name} ({lt.daysPerYear} Days/Yr)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {targetEmployee && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <Badge variant="outline" className="text-[7px] h-3.5 bg-primary/5 text-primary border-none font-black uppercase">
                        {targetEmployee.gender === 'Male' ? <Mars className="size-2 mr-1" /> : <Venus className="size-2 mr-1" />}
                        {targetEmployee.gender} Filter ACTIVE
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Start Window</Label>
                    <Input name="startDate" type="date" required className="h-10 bg-secondary/5" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">End Window</Label>
                    <Input name="endDate" type="date" required className="h-10 bg-secondary/5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Total Billable Days</Label>
                    <Input name="days" type="number" required className="h-10 bg-secondary/5" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Reason / Details</Label>
                    <Input name="reason" placeholder="e.g. Travel, Personal" required className="h-10 bg-secondary/5" />
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-4 items-start text-primary shadow-inner">
                  <Sparkles className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Audit Logic</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">
                      Eligibility is restricted by gender node configuration. Approval will atomically decrement the employee's institutional leave balance.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-11 font-black uppercase tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing || !targetEmployeeId} className="h-11 px-10 font-bold uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <ArrowRight className="size-4 mr-2" />} Submit Requisition
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
