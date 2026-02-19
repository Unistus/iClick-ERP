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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, where, doc } from "firebase/firestore";
import { 
  CalendarDays, 
  Plus, 
  History, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileText,
  UserCircle,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Zap,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { submitLeaveRequest } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { cn } from "@/lib/utils";

export default function MyLeavesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 1. Identify the current logged-in employee profile
  const employeesQuery = useMemoFirebase(() => {
    if (!selectedInstId || !user?.email) return null;
    return query(collection(db, 'institutions', selectedInstId, 'employees'), where('email', '==', user.email));
  }, [db, selectedInstId, user?.email]);
  const { data: myProfiles } = useCollection(employeesQuery);
  const myProfile = myProfiles?.[0];

  // 2. Fetch my leave requests
  const myLeavesQuery = useMemoFirebase(() => {
    if (!selectedInstId || !myProfile?.id) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'leave_requests'), 
      where('employeeId', '==', myProfile.id),
      orderBy('createdAt', 'desc')
    );
  }, [db, selectedInstId, myProfile?.id]);
  const { data: myRequests, isLoading } = useCollection(myLeavesQuery);

  // 3. Fetch applicable leave types for my gender
  const leaveTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'leave_types');
  }, [db, selectedInstId]);
  const { data: allLeaveTypes } = useCollection(leaveTypesRef);

  const myEligibleLeaveTypes = useMemo(() => {
    if (!allLeaveTypes || !myProfile) return [];
    return allLeaveTypes.filter(lt => 
      lt.genderApplicability === 'All' || 
      lt.genderApplicability === myProfile.gender
    );
  }, [allLeaveTypes, myProfile]);

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !myProfile || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      employeeId: myProfile.id,
      employeeName: `${myProfile.firstName} ${myProfile.lastName}`,
      leaveType: formData.get('leaveType') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      reason: formData.get('reason') as string,
    };

    try {
      await submitLeaveRequest(db, selectedInstId, data);
      toast({ title: "Request Submitted", description: "Your supervisor has been notified." });
      setIsCreateOpen(false);
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
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner">
              <CalendarDays className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">My Absence Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Personal Leave & Entitlement Matrix</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder={instLoading ? "Validating..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              size="sm" 
              className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg bg-primary hover:bg-primary/90" 
              disabled={!selectedInstId || !myProfile} 
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="size-4" /> Request Leave
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <UserCircle className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access your personal leave vault.</p>
          </div>
        ) : !myProfile ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-destructive/5 text-destructive">
            <ShieldCheck className="size-16 opacity-20 mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Unauthorized Profile</p>
            <p className="text-xs opacity-60 mt-1">Your user account is not linked to an institutional employee record.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Annual Balance</span>
                  <Sparkles className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{myProfile.leaveBalance || 0} DAYS</div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Allocated for {new Date().getFullYear()}</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Pending Requests</span>
                  <Clock className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-accent">
                    {myRequests?.filter(r => r.status === 'Pending').length || 0} REQS
                  </div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Awaiting Sign-off</p>
                </CardContent>
              </Card>

              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Utilized (YTD)</span>
                  <TrendingUp className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">
                    {myRequests?.filter(r => r.status === 'Approved').length || 0} DAYS
                  </div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Institutional Absence</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Zap className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase tracking-widest text-primary">Loyalty Standing</span></CardHeader>
                <CardContent className="pb-4"><div className="text-2xl font-black font-headline text-primary">{myProfile.loyaltyScore}%</div></CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Request History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Leave Category</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Time Window</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Justification</TableHead>
                      <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Workflow Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing History...</TableCell></TableRow>
                    ) : myRequests?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold opacity-30 italic">No historical requests found.</TableCell></TableRow>
                    ) : myRequests?.map((r) => (
                      <TableRow key={r.id} className="h-16 hover:bg-secondary/5 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <Badge variant="secondary" className="text-[8px] h-5 px-2.5 font-black uppercase bg-primary/10 text-primary border-none shadow-sm">
                            {r.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono font-bold uppercase tracking-tighter opacity-70">
                          {r.startDate} to {r.endDate}
                        </TableCell>
                        <TableCell className="text-[11px] italic text-muted-foreground max-w-[300px] truncate">
                          "{r.reason}"
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-5 px-2.5 font-black uppercase border-none ring-1",
                            r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                            r.status === 'Declined' ? 'bg-destructive/10 text-destructive ring-destructive/20' : 
                            'bg-amber-500/10 text-amber-500 ring-amber-500/20 animate-pulse'
                          )}>
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Request Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border">
            <form onSubmit={handleRequest}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="size-5 text-primary" />
                  <DialogTitle className="text-lg font-bold uppercase">Raise Absence Requisition</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-widest">Self-Service Portal Stage 1</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60 text-primary">Leave Category</Label>
                  <Select name="leaveType" required>
                    <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5">
                      <SelectValue placeholder="Select Entitlement..." />
                    </SelectTrigger>
                    <SelectContent>
                      {myEligibleLeaveTypes.map(lt => (
                        <SelectItem key={lt.id} value={lt.name} className="text-[10px] font-black uppercase">
                          {lt.name} ({lt.daysPerYear} Days/Yr)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Start Date</Label>
                    <Input name="startDate" type="date" required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">End Date</Label>
                    <Input name="endDate" type="date" required className="h-11" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Justification / Reason</Label>
                  <Input name="reason" placeholder="Briefly explain the requirement..." required className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-4 items-start text-primary shadow-inner">
                  <Info className="size-5 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed italic font-medium">
                    Requests are routed to your direct manager for review. Approval will automatically update your institutional attendance matrix.
                  </p>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg border-t gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-11 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-11 px-10 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-4" />} Submit To Manager
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
