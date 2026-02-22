'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where, doc } from "firebase/firestore";
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity, 
  History, 
  Zap, 
  AlertCircle,
  ChevronRight,
  User,
  LayoutGrid,
  FileText,
  BadgeCent,
  Loader2,
  Filter,
  RefreshCw,
  MoreVertical,
  Scale
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { submitApprovalDecision } from "@/lib/approvals/approvals.service";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function ApprovalsDashboard() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Approval Requests
  const requestsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'approval_requests'), 
      orderBy('updatedAt', 'desc')
    );
  }, [db, selectedInstId]);
  const { data: requests, isLoading } = useCollection(requestsQuery);

  const filteredRequests = requests?.filter(r => 
    activeTab === 'Pending' ? r.status === 'Pending' : r.status !== 'Pending'
  ) || [];

  const handleDecision = async (status: 'Approved' | 'Rejected', comment: string) => {
    if (!selectedInstId || !selectedRequest || !user || isProcessing) return;
    setIsProcessing(true);

    try {
      await submitApprovalDecision(db, selectedInstId, selectedRequest.id, {
        status,
        comment,
        userId: user.uid,
        userName: user.email?.split('@')[0] || 'Authorizer'
      });
      toast({ title: `Request ${status}` });
      setIsDecisionOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Operation Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Governance Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Universal Approval &amp; Authorization Engine</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
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
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => toast({ title: "Syncing Global Rules..." })}><RefreshCw className="size-4" /></Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <ShieldCheck className="size-20 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access the unified approval queue.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* KPI MATRIX */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all cursor-pointer" onClick={() => setActiveTab('Pending')}>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Queue</span>
                  <Zap className="size-3 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{requests?.filter(r => r.status === 'Pending').length || 0} PENDING</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Requires Authorization</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-emerald-500/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">SLA Performance</span>
                  <Clock className="size-3 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">1.4 HRS</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Avg Turnaround Time</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-accent/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Global Decisions</span>
                  <History className="size-3 text-accent opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-accent">{requests?.filter(r => r.status !== 'Pending').length || 0} FINALIZED</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Archive Integrity</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><ShieldCheck className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Compliance Pulse</span>
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-2xl font-black font-headline">SECURE</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Unified Audit Active</p>
                </CardContent>
              </Card>
            </div>

            {/* MAIN LIST HUB */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex gap-1 p-1 bg-secondary/20 rounded-xl w-fit">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn("h-9 px-6 text-[10px] font-black uppercase tracking-widest", activeTab === 'Pending' ? "bg-background shadow-sm text-primary" : "opacity-50")}
                  onClick={() => setActiveTab('Pending')}
                >
                  Pending Action
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn("h-9 px-6 text-[10px] font-black uppercase tracking-widest", activeTab === 'History' ? "bg-background shadow-sm text-primary" : "opacity-50")}
                  onClick={() => setActiveTab('History')}
                >
                  Decision History
                </Button>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find request node..." 
                  className="pl-9 h-10 text-[10px] bg-card border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                />
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Workflow Stream</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Origin Node</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Action Designator</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Level</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">Metric Value</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-black">Scanning Governance Hub...</TableCell></TableRow>
                    ) : filteredRequests.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No movement detected in the queue.</TableCell></TableRow>
                    ) : filteredRequests.map((r) => (
                      <TableRow key={r.id} className="h-20 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase shadow-inner border border-primary/5">
                              {r.module?.[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{r.module} Hub</span>
                              <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">REF: {r.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-foreground/80">{r.action}</span>
                            <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1.5 mt-0.5"><User className="size-2.5" /> {r.requestedByName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[8px] h-5 px-3 bg-secondary/50 border-none ring-1 ring-border font-black uppercase">
                            STAGE {r.currentLevel} of {r.totalLevels}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-primary">
                          {r.amount ? `KES ${r.amount.toLocaleString()}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-2">
                            {r.status === 'Pending' ? (
                              <Button 
                                size="sm" 
                                className="h-9 px-6 text-[10px] font-black uppercase gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all group-hover:scale-105"
                                onClick={() => { setSelectedRequest(r); setIsDecisionOpen(true); }}
                              >
                                <Zap className="size-3.5" /> Review &amp; Sign
                              </Button>
                            ) : (
                              <Badge className={cn(
                                "text-[8px] h-6 px-3 font-black uppercase border-none ring-1",
                                r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-destructive/10 text-destructive ring-destructive/20'
                              )}>
                                {r.status}
                              </Badge>
                            )}
                          </div>
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
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Maker-Checker Protocol</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Institutional governance is enforced at the edge. No staff member can authorize their own request. High-value actions are siloed until a multi-stage cryptographic handshake is completed."
                  </p>
                </div>
              </Card>
              <div className="p-8 bg-secondary/10 rounded-[2rem] border border-border/50 flex flex-col justify-between group cursor-default shadow-inner">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <Activity className="size-3 text-emerald-500" /> SLA Integrity
                  </p>
                  <p className="text-[11px] font-bold leading-tight max-w-[250px]">Current institutional bottleneck: **Accounting Module** (Avg delay +2.4h). Optimize via workflow delegation.</p>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase gap-2 hover:bg-primary/10 transition-all">Full Audit Log <History className="size-3" /></Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DECISION DIALOG */}
        <Dialog open={isDecisionOpen} onOpenChange={setIsDecisionOpen}>
          <DialogContent className="max-w-2xl shadow-2xl ring-1 ring-border rounded-[2rem] overflow-hidden p-0 border-none">
            <div className="bg-primary p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Zap className="size-32 rotate-12" /></div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner"><ShieldCheck className="size-5" /></div>
                <div>
                  <DialogTitle className="text-lg font-black uppercase tracking-widest">Authorization Decision</DialogTitle>
                  <p className="text-[10px] font-bold uppercase opacity-70">Context: {selectedRequest?.module} • {selectedRequest?.action}</p>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative z-10">
                <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-3">Snapshot Review</p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-40">Requested By</p>
                    <p className="text-sm font-black uppercase">{selectedRequest?.requestedByName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-40">Metric Value</p>
                    <p className="text-sm font-black uppercase">{selectedRequest?.amount ? `KES ${selectedRequest.amount.toLocaleString()}` : 'N/A'}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-bold uppercase opacity-40 mb-1">Justification</p>
                  <p className="text-[11px] leading-relaxed italic opacity-80">"{selectedRequest?.justification}"</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Decision Comments / Notes</Label>
                <Input id="decision-comment" placeholder="Explain the basis for your decision..." className="h-12 bg-secondary/5 border-none ring-1 ring-border focus:ring-primary" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleDecision('Rejected', (document.getElementById('decision-comment') as HTMLInputElement).value)}
                  disabled={isProcessing}
                  variant="outline" 
                  className="h-14 font-black uppercase text-xs text-destructive border-destructive/20 hover:bg-destructive/5 gap-2"
                >
                  <XCircle className="size-5" /> Deny Access
                </Button>
                <Button 
                  onClick={() => handleDecision('Approved', (document.getElementById('decision-comment') as HTMLInputElement).value)}
                  disabled={isProcessing}
                  className="h-14 font-black uppercase text-xs bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-900/20 gap-2 border-none"
                >
                  <CheckCircle2 className="size-5" /> Sign &amp; Authorize
                </Button>
              </div>
              
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                <p className="text-[9px] text-muted-foreground font-medium italic flex items-center justify-center gap-2">
                  <ShieldCheck className="size-3 text-emerald-500" /> Decision will be recorded in the immutable institutional audit trail.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
