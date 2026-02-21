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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, where, doc } from "firebase/firestore";
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
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  Scale,
  BrainCircuit
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { submitLeaveRequest, updateLeaveRequestStatus } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, parseISO } from "date-fns";

export default function LeaveManagementPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Declined' | 'All'>('Pending');
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching
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

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // --- COMPLIANCE ENGINE LOGIC ---

  const analytics = useMemo(() => {
    if (!employees || !requests) return { liability: 0, conflicts: 0, highAbsence: [] };
    
    // 1. Financial Liability Forecast (Daily Rate * Remaining Balance)
    const liability = employees.reduce((sum, emp) => {
      const dailyRate = (emp.salary || 0) / 22; // Approx working days
      return sum + ((emp.leaveBalance || 0) * dailyRate);
    }, 0);

    // 2. Conflict Detection (Overlapping dates in same dept)
    const activeLeaves = requests.filter(r => r.status === 'Approved');
    let conflicts = 0;
    const depts = new Set(employees.map(e => e.departmentId));
    
    depts.forEach(deptId => {
      const deptStaff = employees.filter(e => e.departmentId === deptId);
      const deptLeaves = activeLeaves.filter(l => deptStaff.some(s => s.id === l.employeeId));
      // Logic: Flag if > 30% of dept is away on any given day (simplified for MVP)
      if (deptLeaves.length > deptStaff.length * 0.3) conflicts++;
    });

    return { liability, conflicts, highAbsence: [] };
  }, [employees, requests]);

  const targetEmployee = useMemo(() => 
    employees?.find(e => e.id === targetEmployeeId), 
    [employees, targetEmployeeId]
  );

  const filteredLeaveTypes = useMemo(() => {
    if (!leaveTypes || !targetEmployee) return [];
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
      const fullName = `${emp?.firstName} ${emp?.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase());
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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <CalendarDays className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Leave Governance</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Automated Compliance & Absence Intelligence</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
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

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg bg-primary hover:bg-primary/90" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Requisition
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <CalendarDays className="size-20 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize the absence audit engine.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* AUDIT KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Leave Liability</span>
                  <Scale className="size-3.5 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-foreground/90">{currency} {analytics.liability.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Accrued Unutilized Value</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-destructive/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Team Conflicts</span>
                  <AlertTriangle className="size-3.5 text-destructive opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-destructive">{analytics.conflicts} NODES</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">High Dept Overlap</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-accent/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Absence</span>
                  <Activity className="size-3.5 text-accent opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-accent">{requests?.filter(r => r.status === 'Approved').length || 0} STAFF</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Currently Off-site</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><BrainCircuit className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Policy Status</span>
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-xl font-black font-headline">SYNCED</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Real-time Balance Audit</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex gap-1 p-1 bg-secondary/20 rounded-xl w-fit">
                {(['Pending', 'Approved', 'Declined', 'All'] as const).map((s) => (
                  <Button 
                    key={s} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-9 px-6 text-[10px] font-black uppercase tracking-widest ${activeTab === s ? 'bg-background shadow-sm text-primary' : 'opacity-50'}`}
                    onClick={() => setActiveTab(s)}
                  >
                    {s} {s === 'Pending' && requests?.filter(r => r.status === 'Pending').length ? `(${requests.filter(r => r.status === 'Pending').length})` : ''}
                  </Button>
                ))}
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find personnel profile..." 
                  className="pl-9 h-10 text-[10px] bg-card border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Requisition Stream</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Staff Member</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Entitlement</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground text-center">Lifecycle</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Validity Window</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing Approvals...</TableCell></TableRow>
                    ) : filteredRequests.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No matching requisitions in this queue.</TableCell></TableRow>
                    ) : filteredRequests.map((r) => (
                      <TableRow key={r.id} className="h-20 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase shadow-inner border border-primary/5">
                              {r.employeeName?.[0] || '?'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{r.employeeName}</span>
                              <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Submitted: {r.createdAt?.toDate ? format(r.createdAt.toDate(), 'dd MMM') : '...'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-5 px-2.5 font-black uppercase border-primary/20 text-primary bg-primary/5 shadow-sm">
                            {r.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm",
                            r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                            r.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-destructive/10 text-destructive ring-destructive/20'
                          )}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono font-bold uppercase tracking-tighter text-foreground/70">
                          {r.startDate} <span className="mx-1 opacity-30">→</span> {r.endDate}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          {r.status === 'Pending' ? (
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <Button size="sm" variant="ghost" className="h-9 px-4 text-[9px] font-black uppercase text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleAction(r.id, 'Approved')}>
                                <CheckCircle2 className="size-3.5 mr-1.5" /> Authorize
                              </Button>
                              <Button size="sm" variant="ghost" className="h-9 px-4 text-[9px] font-black uppercase text-destructive hover:bg-destructive/10" onClick={() => handleAction(r.id, 'Declined')}>
                                <XCircle className="size-3.5 mr-1.5" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="icon" className="size-9 rounded-xl opacity-0 group-hover:opacity-100"><History className="size-4" /></Button>
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
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2rem] overflow-hidden">
            <form onSubmit={handleRequest}>
              <DialogHeader className="bg-secondary/10 p-6 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><CalendarDays className="size-5" /></div>
                  <DialogTitle className="text-sm font-black uppercase tracking-widest">Raise Absence Requisition</DialogTitle>
                </div>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Institutional Compliance Protocol v4.2</CardDescription>
              </DialogHeader>
              
              <div className="p-6 space-y-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Target Personnel Identity</Label>
                  <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId} required>
                    <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5"><SelectValue placeholder="Pick Subject Node..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => (
                        <SelectItem key={e.id} value={e.id} className="text-[10px] font-black uppercase tracking-tight">
                          {e.firstName} {e.lastName} ({e.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Eligibility Category</Label>
                  <Select name="leaveType" required disabled={!targetEmployeeId}>
                    <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-background">
                      <SelectValue placeholder={targetEmployeeId ? "Select Entitlement..." : "Pick Employee First"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLeaveTypes.map(lt => (
                        <SelectItem key={lt.id} value={lt.name} className="text-[10px] font-black uppercase">
                          {lt.name} ({lt.daysPerYear} Days/Yr)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Start Window</Label><Input name="startDate" type="date" required className="h-11 bg-secondary/5" /></div>
                  <div className="space-y-2"><Label className="uppercase font-black text-[9px] tracking-widest opacity-60">End Window</Label><Input name="endDate" type="date" required className="h-11 bg-secondary/5" /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Total Billable Days</Label><Input name="days" type="number" required className="h-11 font-black bg-secondary/5" /></div>
                  <div className="space-y-2"><Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Justification Memo</Label><Input name="reason" placeholder="Personal requirement..." required className="h-11 bg-secondary/5" /></div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start text-primary shadow-inner">
                  <Sparkles className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Audit Policy Guard</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">Approval will atomically decrement the employee's institutional leave balance.</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 border-t gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-11 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing || !targetEmployeeId} className="h-11 px-10 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2">{isProcessing ? <Loader2 className="size-3 animate-spin" /> : <ArrowRight className="size-4" />} Commit Request</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
