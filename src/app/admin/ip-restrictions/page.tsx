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
import { 
  Globe2, 
  Plus, 
  Search, 
  ShieldCheck, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  MapPin, 
  ShieldAlert,
  Zap,
  Activity,
  History,
  Lock,
  Globe
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, serverTimestamp, deleteDoc, addDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { cn } from "@/lib/utils";

export default function IPRestrictionsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching: Institutions
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  // Data Fetching: IP Rules
  const ipRulesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'ip_restrictions');
  }, [db, selectedInstId]);
  const { data: rules, isLoading } = useCollection(ipRulesQuery);

  const handleAddRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      label: formData.get('label') as string,
      ipAddress: formData.get('ipAddress') as string,
      type: formData.get('type') as 'Whitelist' | 'Blacklist',
      status: 'Active',
      updatedAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'institutions', selectedInstId, 'ip_restrictions'), data);
      logSystemEvent(db, selectedInstId, user, 'SECURITY', 'Add IP Rule', `New ${data.type} rule deployed for ${data.ipAddress} (${data.label}).`);
      toast({ title: "Restriction Node Deployed" });
      setIsAddOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Deployment Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRule = async (id: string, label: string) => {
    if (!selectedInstId || !confirm(`Remove ${label} from institutional perimeter?`)) return;
    try {
      await deleteDoc(doc(db, 'institutions', selectedInstId, 'ip_restrictions', id));
      logSystemEvent(db, selectedInstId, user, 'SECURITY', 'Delete IP Rule', `Terminated IP rule for ${label}.`);
      toast({ title: "Node Terminated" });
    } catch (err) {
      toast({ variant: "destructive", title: "Deletion Failed" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Globe2 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Network Perimeter</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">IP Whitelisting & Geographic Guardrails</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-[10px] font-black uppercase shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" disabled={!selectedInstId} onClick={() => setIsAddOpen(true)}>
              <Plus className="size-4" /> Add Restriction
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Globe className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure network access rules.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Lock className="size-4 text-primary" /> Authorization Matrix
                    </CardTitle>
                    <CardDescription className="text-[10px]">Define the IP ranges permitted to access institutional nodes.</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/20 bg-primary/5">
                    {rules?.length || 0} ACTIVE RULES
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Label / Context</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase">IP Address / CIDR</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase text-center">Type</TableHead>
                        <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Management</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse">Polling Firewall...</TableCell></TableRow>
                      ) : rules?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-24 text-xs text-muted-foreground font-bold uppercase italic opacity-20">Perimeter open. Add a rule to restrict access.</TableCell></TableRow>
                      ) : rules?.map((r) => (
                        <TableRow key={r.id} className="h-14 hover:bg-secondary/10 border-b-border/30 group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase tracking-tight">{r.label}</span>
                              <span className="text-[8px] text-muted-foreground uppercase font-black">Authorized Zone</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-primary">{r.ipAddress}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "text-[8px] h-4 uppercase font-black border-none ring-1 px-2",
                              r.type === 'Whitelist' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-destructive/10 text-destructive ring-destructive/20'
                            )}>
                              {r.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-8 text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10"
                              onClick={() => handleDeleteRule(r.id, r.label)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-4 items-start shadow-inner">
                <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Inbound Guardrail Protocol</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Institutional IP restrictions are evaluated at the edge. If at least one 'Whitelist' rule exists, all requests from non-matching IPs will be blocked with a 403 Forbidden status."
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border/10 pb-3">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="size-4 text-emerald-500" /> Live Inbound Pulse
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded bg-secondary/5">
                    <span className="text-[9px] font-black uppercase opacity-50">Current Client IP</span>
                    <span className="text-xs font-mono font-bold text-primary">192.168.1.1</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded bg-secondary/5">
                    <span className="text-[9px] font-black uppercase opacity-50">Geographic Node</span>
                    <span className="text-xs font-bold uppercase">Nairobi, KE</span>
                  </div>
                  <Button variant="outline" className="w-full h-10 text-[9px] font-black uppercase gap-2 hover:bg-primary/5 border-primary/20 text-primary">
                    <RefreshCw className="size-3" /> Refresh Telemetry
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-destructive/5 border-none ring-1 ring-destructive/20 p-6 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover:rotate-0 transition-transform"><ShieldAlert className="size-32 text-destructive" /></div>
                <div className="flex flex-col gap-2 relative z-10">
                  <p className="text-[10px] font-black uppercase text-destructive tracking-widest">Intrusion Alert</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                    "Any request from an unauthorized IP is instantly logged in the **Audit Hub** for security review."
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleAddRule}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Globe2 className="size-5 text-primary" />
                  <DialogTitle>Deploy Perimeter Node</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight text-primary">Firewall Definition v1.2</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Rule Label (Context)</Label>
                  <Input name="label" placeholder="e.g. Nairobi Head Office VPN" required className="h-10 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">IP Address / CIDR</Label>
                    <Input name="ipAddress" placeholder="e.g. 41.215.10.2" required className="h-10 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Rule Strategy</Label>
                    <Select name="type" defaultValue="Whitelist">
                      <SelectTrigger className="h-10 font-bold uppercase"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Whitelist" className="text-xs font-bold text-emerald-500">WHITELIST (Allow)</SelectItem>
                        <SelectItem value="Blacklist" className="text-xs font-bold text-destructive">BLACKLIST (Deny)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                  <p className="text-[10px] leading-relaxed italic text-muted-foreground">
                    Note: Whitelist rules are prioritized. If you add a whitelist rule, only matching IPs will be permitted.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="text-xs h-10 font-bold uppercase">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 px-10 font-bold uppercase text-xs shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-4" />} Deploy Rule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}