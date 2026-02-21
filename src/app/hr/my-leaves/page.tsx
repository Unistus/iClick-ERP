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
  Info,
  Scale,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { submitLeaveRequest } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { cn } from "@/lib/utils";

export default function MyLeavesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 1. Identity Link
  const employeesQuery = useMemoFirebase(() => {
    if (!selectedInstId || !user?.email) return null;
    return query(collection(db, 'institutions', selectedInstId, 'employees'), where('email', '==', user.email));
  }, [db, selectedInstId, user?.email]);
  const { data: myProfiles } = useCollection(employeesQuery);
  const myProfile = myProfiles?.[0];

  // 2. Personal Stream
  const myLeavesQuery = useMemoFirebase(() => {
    if (!selectedInstId || !myProfile?.id) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'leave_requests'), 
      where('employeeId', '==', myProfile.id),
      orderBy('createdAt', 'desc')
    );
  }, [db, selectedInstId, myProfile?.id]);
  const { data: myRequests, isLoading } = useCollection(myLeavesQuery);

  // 3. Global Policies
  const leaveTypesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'leave_types');
  }, [db, selectedInstId]);
  const { data: allLeaveTypes } = useCollection(leaveTypesRef);

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'hr');
  }, [db, selectedInstId]);
  const { data: hrSetup } = useDoc(setupRef);

  // 4. Matrix Generation
  const matrix = useMemo(() => {
    if (!allLeaveTypes || !myProfile) return [];
    return allLeaveTypes.filter(lt => lt.genderApplicability === 'All' || lt.genderApplicability === myProfile.gender).map(type => {
      const approved = myRequests?.filter(r => r.leaveType === type.name && r.status === 'Approved').reduce((sum, r) => sum + (parseInt(r.days) || 0), 0) || 0;
      const pending = myRequests?.filter(r => r.leaveType === type.name && r.status === 'Pending').reduce((sum, r) => sum + (parseInt(r.days) || 0), 0) || 0;
      return { ...type, approved, pending, remaining: (type.daysPerYear || 0) - approved };
    });
  }, [allLeaveTypes, myProfile, myRequests]);

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !myProfile || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const dayCount = differenceInDays(new Date(endDate), new Date(startDate)) + 1;

    if (dayCount <= 0) {
      toast({ variant: "destructive", title: "Invalid Window", description: "End date must be after start date." });
      setIsProcessing(false);
      return;
    }

    const data = {
      employeeId: myProfile.id,
      employeeName: `${myProfile.firstName} ${myProfile.lastName}`,
      leaveType: formData.get('leaveType') as string,
      startDate,
      endDate,
      days: dayCount.toString(),
      reason: formData.get('reason') as string,
    };

    try {
      await submitLeaveRequest(db, selectedInstId, data);
      toast({ title: "Request Submitted", description: "Workflow status: PENDING SUPERVISOR REVIEW." });
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
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <CalendarDays className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Absence Matrix</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Personal Entitlement & Lifecycle Hub</p>
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

            <Button 
              size="sm" 
              className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg bg-primary hover:bg-primary/90" 
              disabled={!selectedInstId || !myProfile} 
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="size-4" /> Raise Requisition
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <ShieldCheck className="size-20 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to access your absence matrix.</p>
          </div>
        ) : !myProfile ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-destructive/5 text-destructive">
            <ShieldCheck className="size-20 opacity-20 mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Unauthorized Terminal</p>
            <p className="text-xs opacity-60 mt-1">Identity node verification failed for this institution.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* ENTITLEMENT GRID */}
            <div className="grid gap-4 md:grid-cols-4">
              {matrix.map(type => (
                <Card key={type.id} className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                  <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{type.name}</span>
                    <Sparkles className="size-3 text-primary opacity-50" />
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-2xl font-black font-headline text-foreground/90">{type.remaining} DAYS</div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter">
                        <span className="opacity-40">Consumed: {type.approved}</span>
                        <span className="text-primary">{type.daysPerYear} ALLOWED</span>
                      </div>
                      <Progress value={(type.approved / (type.daysPerYear || 1)) * 100} className="h-1 bg-secondary shadow-inner" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Absence History</CardTitle>
                <Badge variant="outline" className="text-[8px] h-5 bg-background font-black border-primary/20 text-primary">ENFORCED NODE</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Requisition Type</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Window</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Days</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Workflow Phase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing personal vault...</TableCell></TableRow>
                    ) : myRequests?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No historical movements detected.</TableCell></TableRow>
                    ) : myRequests?.map((r) => (
                      <TableRow key={r.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30">
                        <TableCell className="pl-8"><span className="text-xs font-black uppercase tracking-tight">{r.leaveType}</span></TableCell>
                        <TableCell className="text-[10px] font-mono font-bold uppercase tracking-tighter text-foreground/70">{r.startDate} to {r.endDate}</TableCell>
                        <TableCell className="text-center font-black text-xs">{r.days}</TableCell>
                        <TableCell className="text-right pr-8">
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm",
                            r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                            r.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-destructive/10 text-destructive ring-destructive/20'
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

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-md">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><ShieldCheck className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Compliance Guard</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Requests submitted here are evaluated against your institutional **Contract Effective Date**. Access to Paid Leave is restricted during your {hrSetup?.probationPeriodDays || 0}-day probation cycle."
                  </p>
                </div>
              </Card>
              <div className="p-8 bg-secondary/10 rounded-[2rem] border border-border/50 flex flex-col justify-between group cursor-default shadow-inner">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <Zap className="size-3 text-amber-500" /> Automatic Accruals
                  </p>
                  <p className="text-[11px] font-bold leading-tight">Your balance increases by 1.75 days per completed month of service.</p>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase gap-2 hover:bg-primary/10 transition-all">View Full Policy <ChevronRight className="size-3" /></Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2.5rem] overflow-hidden">
            <form onSubmit={handleRequest}>
              <DialogHeader className="bg-secondary/10 p-8 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><CalendarDays className="size-5" /></div>
                  <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary">Raise Requisition</DialogTitle>
                </div>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Self-Service Identity Node: {myProfile?.firstName} {myProfile?.lastName}</CardDescription>
              </DialogHeader>
              
              <div className="p-8 space-y-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Eligibility Classification</Label>
                  <Select name="leaveType" required>
                    <SelectTrigger className="h-12 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-primary"><SelectValue placeholder="Pick Entitlement..." /></SelectTrigger>
                    <SelectContent>
                      {matrix.map(type => (
                        <SelectItem key={type.id} value={type.name} className="text-[10px] font-black uppercase">
                          {type.name} ({type.remaining} Days Remaining)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Start Marker</Label><Input name="startDate" type="date" required className="h-11 font-bold bg-background border-none ring-1 ring-border" /></div>
                  <div className="space-y-2"><Label className="uppercase font-black text-[9px] tracking-widest opacity-60">End Marker</Label><Input name="endDate" type="date" required className="h-11 font-bold bg-background border-none ring-1 ring-border" /></div>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Justification / Reason</Label>
                  <Input name="reason" placeholder="Personal requirement..." required className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start text-primary shadow-inner">
                  <Info className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-[10px] leading-relaxed italic font-medium">
                    Requests are routed instantly to your Direct Manager. Final authorization triggers an atomic ledger update to your balance.
                  </p>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-8 border-t gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-12 px-12 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20">
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} Commit Requisition
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
