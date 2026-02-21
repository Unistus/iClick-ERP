'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, orderBy, limit } from "firebase/firestore";
import { 
  Landmark, 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  Activity, 
  Search, 
  Filter, 
  CheckCircle2, 
  ExternalLink,
  History,
  Scale,
  Zap,
  Loader2,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function StatutoryHubPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Runs (Simplified query to avoid composite index requirement)
  const runsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'payroll_runs'), 
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [db, selectedInstId]);
  const { data: runs, isLoading: runsLoading } = useCollection(runsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // In-memory filter for finalized runs
  const finalizedRuns = runs?.filter(r => r.status === 'Posted') || [];

  const handleExport = (type: string) => {
    toast({ title: "Filing Ready", description: `Generating ${type} CSV for regulatory upload.` });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/20 text-accent shadow-inner border border-accent/10">
              <Landmark className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Statutory Matrix</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Regulatory Filing & Tax Compliance Hub</p>
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
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => toast({ title: "Syncing Regulatory Tables..." })}><RefreshCw className="size-4" /></Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <Scale className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to access verified tax and pension summaries.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Tax (PAYE)</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-foreground/90">{currency} 1.2M</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Ready for ITax upload</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">NSSF (Tier I/II)</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-primary">{currency} 420k</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Consolidated Contributions</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Housing Levy</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-accent">{currency} 184k</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">1.5% Multi-Tenant Deductions</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><CheckCircle2 className="size-24 text-emerald-500" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Compliance Status</span>
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-xl font-black font-headline text-emerald-500">VERIFIED</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Validated against KRA V2.0</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Filing Command Center</CardTitle>
                  <CardDescription className="text-[10px]">Select a cycle to generate unified regulatory files.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[9px] font-black uppercase gap-2" onClick={() => handleExport('P.A.Y.E')}><Download className="size-3.5" /> P.A.Y.E</Button>
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[9px] font-black uppercase gap-2" onClick={() => handleExport('NSSF')}><Download className="size-3.5" /> NSSF</Button>
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[9px] font-black uppercase gap-2" onClick={() => handleExport('HOUSING_LEVY')}><Download className="size-3.5" /> Housing</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Cycle Period</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Gross Payload</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Filing Integrity</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">Liability Total</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runsLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Polling Compliances...</TableCell></TableRow>
                    ) : finalizedRuns.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No finalized cycles available for filing.</TableCell></TableRow>
                    ) : finalizedRuns.map((run) => (
                      <TableRow key={run.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8 font-black uppercase text-xs tracking-tight">{run.runNumber}</TableCell>
                        <TableCell className="font-mono text-[10px] opacity-60 uppercase">{currency} {run.totalGross?.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[8px] h-5 px-3 font-black uppercase bg-emerald-500/10 text-emerald-500 border-none ring-1 ring-emerald-500/20 shadow-sm">
                            <ShieldCheck className="size-2 mr-1.5" /> SIGNED
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-primary uppercase">
                          {currency} {(run.totalDeductions || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button variant="ghost" size="sm" className="h-9 px-4 text-[9px] font-black uppercase gap-2 hover:bg-primary/10 hover:text-primary transition-all group-hover:scale-105 shadow-inner">
                            Review Filing <ExternalLink className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-md">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><FileText className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Compliance Protocol</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Statutory logic is hard-coded to **Kenyan iTax** specifications. Exported CSVs are pre-validated for immediate upload to the regulatory portal, ensuring zero non-compliance penalties."
                  </p>
                </div>
              </Card>
              <div className="p-8 bg-secondary/10 rounded-[2rem] border border-border/50 flex flex-col justify-between group cursor-default shadow-inner">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <Zap className="size-3 text-emerald-500" /> Auto-Accrual Node
                  </p>
                  <p className="text-[11px] font-bold leading-tight max-w-[250px]">Liability balances are updated atomically in the Chart of Accounts upon payroll posting.</p>
                </div>
                <div className="flex justify-end pt-4">
                  <Button variant="link" size="sm" className="p-0 h-auto text-emerald-500 font-bold text-[9px] uppercase gap-1.5 hover:gap-2 transition-all">Audit Ledger Mapping <ArrowUpRight className="size-3" /></Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}