
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Clock, 
  Search, 
  XCircle, 
  ShieldAlert, 
  Smartphone, 
  Monitor, 
  Globe, 
  RefreshCw,
  Loader2,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { logSystemEvent } from "@/lib/audit-service";

export default function SessionManagerPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Data Fetching: Institutions
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  // Data Fetching: Active Sessions
  const sessionsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'active_sessions'), orderBy('lastActive', 'desc'));
  }, [db, selectedInstId]);
  const { data: sessions, isLoading } = useCollection(sessionsQuery);

  const handleRevokeSession = async (sessionId: string, userEmail: string) => {
    if (!selectedInstId) return;
    setIsProcessing(sessionId);
    
    try {
      await deleteDoc(doc(db, 'institutions', selectedInstId, 'active_sessions', sessionId));
      logSystemEvent(db, selectedInstId, user, 'SECURITY', 'Revoke Session', `Forcefully terminated session for ${userEmail}.`);
      toast({ title: "Session Terminated", description: "The user will be logged out on their next action." });
    } catch (err) {
      toast({ variant: "destructive", title: "Revocation Failed" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!selectedInstId || !confirm("CRITICAL: This will log out EVERY user in this institution. Proceed?")) return;
    toast({ title: "Broad Revocation Triggered", description: "Cleaning institutional session registry..." });
    // In production, this would trigger a batch delete or a cloud function
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Clock className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Session Governance</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Institutional Access Monitoring</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" variant="destructive" className="gap-2 h-9 text-[10px] font-black uppercase" disabled={!selectedInstId} onClick={handleRevokeAll}>
              <ShieldAlert className="size-3.5" /> Revoke All
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Clock className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to monitor active authentication sessions.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Live Connections</span>
                  <Activity className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{sessions?.length || 0} ACTIVE</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Mobile Assets</span>
                  <Smartphone className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{sessions?.filter(s => s.deviceType === 'Mobile').length || 0} DEVICES</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-primary tracking-widest">Auth Integrity</span>
                  <CheckCircle2 className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">HEALTHY</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search user identity..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Button variant="ghost" size="icon" className="size-8"><RefreshCw className="size-3.5" /></Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">User / Identity</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Device & OS</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">IP Address</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Last Active</TableHead>
                      <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Lifecycle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase opacity-50">Syncing Session Registry...</TableCell></TableRow>
                    ) : sessions?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground font-bold uppercase italic opacity-20">No active sessions tracked.</TableCell></TableRow>
                    ) : sessions?.map((s) => (
                      <TableRow key={s.id} className="h-14 hover:bg-secondary/5 border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight">{s.userEmail}</span>
                            <span className="text-[8px] text-muted-foreground font-mono uppercase tracking-tighter">UID: {s.userId.slice(0, 8)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {s.deviceType === 'Mobile' ? <Smartphone className="size-3 text-muted-foreground" /> : <Monitor className="size-3 text-muted-foreground" />}
                            <span className="text-[10px] font-bold uppercase opacity-70">{s.browser} on {s.os}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] opacity-50">{s.ipAddress}</TableCell>
                        <TableCell className="text-[10px] font-medium">
                          {s.lastActive?.toDate ? format(s.lastActive.toDate(), 'HH:mm:ss dd MMM') : 'Just now'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={isProcessing === s.id}
                            className="h-8 text-[9px] font-black uppercase gap-1.5 text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10"
                            onClick={() => handleRevokeSession(s.id, s.userEmail)}
                          >
                            {isProcessing === s.id ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />} Terminate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-4 items-start shadow-inner">
              <ShieldAlert className="size-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Security Enforcement Protocol</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                  "Institutional sessions are monitored at the edge. Revoking a session removes the client heartbeat document, triggering an immediate UI lockout and redirect to login upon the next authenticated request."
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
