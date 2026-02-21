
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { 
  FileCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Users,
  CalendarDays,
  Clock,
  UserCircle,
  ShieldCheck,
  Activity,
  History,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateLeaveRequestStatus } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function LeaveApprovalsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 1. Fetch pending leave requests
  // QUERY OPTIMIZATION: Removed orderBy to prevent index-related permission failures
  const pendingQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'leave_requests'), 
      where('status', '==', 'Pending')
    );
  }, [db, selectedInstId]);
  const { data: requests, isLoading } = useCollection(pendingQuery);

  const handleAction = async (requestId: string, status: 'Approved' | 'Declined') => {
    if (!selectedInstId) return;
    setIsProcessing(requestId);
    try {
      await updateLeaveRequestStatus(db, selectedInstId, requestId, status);
      toast({ title: `Request ${status}`, description: `Decision has been synchronized with the employee's portal.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Action Failed" });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner">
              <FileCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Managerial Review</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Absence Requisition & Workflow Control</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder={instLoading ? "Polling..." : "Select Institution"} />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <ShieldCheck className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center">Select an institution to manage the workforce absence queue.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Awaiting Decision</span>
                  <Clock className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-accent">{requests?.length || 0} PENDING</div>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Workflow Health</span>
                  <Activity className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">OPTIMAL</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Users className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase tracking-widest text-primary">Team Capacity</span></CardHeader>
                <CardContent className="pb-4"><div className="text-2xl font-black font-headline text-primary">94.2%</div></CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Absence Requisition Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6 text-muted-foreground">Staff Member</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-muted-foreground">Entitlement</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-muted-foreground">Date Range</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-muted-foreground">Justification</TableHead>
                      <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase text-muted-foreground">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing Approvals...</TableCell></TableRow>
                    ) : requests?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-24">
                          <CheckCircle2 className="size-12 mx-auto text-emerald-500/20 mb-4" />
                          <p className="text-xs text-muted-foreground uppercase font-black tracking-widest opacity-40">Queue is empty. All requests processed.</p>
                        </TableCell>
                      </TableRow>
                    ) : requests?.map((r) => (
                      <TableRow key={r.id} className="h-20 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase shadow-inner">
                              {r.employeeName?.[0] || '?'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{r.employeeName || 'Staff Member'}</span>
                              <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Submitted: {r.createdAt?.toDate ? format(r.createdAt.toDate(), 'dd MMM') : '...'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-5 px-2.5 font-black uppercase border-primary/20 text-primary bg-primary/5">
                            {r.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono font-bold uppercase tracking-tighter text-foreground/70">
                          {r.startDate} <span className="mx-1 opacity-30">to</span> {r.endDate}
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <p className="text-[11px] leading-relaxed italic text-muted-foreground">"{r.reason}"</p>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-9 px-4 text-[9px] font-black uppercase gap-2 text-emerald-500 hover:bg-emerald-500/10"
                              disabled={isProcessing === r.id}
                              onClick={() => handleAction(r.id, 'Approved')}
                            >
                              <CheckCircle2 className="size-3.5" /> Authorize
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-9 px-4 text-[9px] font-black uppercase gap-2 text-destructive hover:bg-destructive/10"
                              disabled={isProcessing === r.id}
                              onClick={() => handleAction(r.id, 'Declined')}
                            >
                              <XCircle className="size-3.5" /> Decline
                            </Button>
                          </div>
                          {isProcessing === r.id && (
                            <div className="flex justify-end pr-4">
                              <Loader2 className="size-4 animate-spin text-primary" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start shadow-inner">
              <AlertCircle className="size-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Governance Protocol</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                  "Decisions made in this hub are final and immutable. Employees receive a real-time system notification upon authorization. Approved dates are automatically blacked out in the branch roster matrix."
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
