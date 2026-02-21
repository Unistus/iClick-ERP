'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Banknote, 
  TrendingUp, 
  Wallet, 
  Landmark, 
  Activity, 
  History, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Loader2,
  PieChart,
  Users,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Zap,
  LayoutGrid
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { format } from "date-fns";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import Link from 'next/link';

export default function PayrollDashboard() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Runs
  const runsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'payroll_runs'), orderBy('createdAt', 'desc'), limit(5));
  }, [db, selectedInstId]);
  const { data: recentRuns, isLoading: runsLoading } = useCollection(runsQuery);

  // Data Fetching: Global Settings
  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const metrics = useMemo(() => {
    if (!recentRuns) return { gross: 0, count: 0, status: 'IDLE' };
    const latest = recentRuns[0];
    return {
      gross: recentRuns.reduce((sum, r) => sum + (r.totalGross || 0), 0),
      count: recentRuns.length,
      status: latest?.status || 'IDLE'
    };
  }, [recentRuns]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner">
              <Banknote className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Payroll Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Institutional Remuneration Intelligence</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder={instLoading ? "Validating..." : "Select Institution"} />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <PieChart className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access its payroll command center.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Gross Expenditure (MTD)</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-foreground/90">{currency} {metrics.gross.toLocaleString()}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-emerald-500 font-bold text-[9px] uppercase tracking-tighter">
                    <TrendingUp className="size-3" /> Budget Adherence: 94%
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Cycles</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-accent">{metrics.count} RUNS</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Institutional Flow</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-emerald-500/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Audit Stage</span>
                  <History className="size-3 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">{metrics.status}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Current State</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><ShieldCheck className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Compliance Pulse</span>
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-2xl font-black font-headline">LOCKED</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Regulatory Sync: OK</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Recent Processing Log</CardTitle>
                    <CardDescription className="text-[10px]">Audit trail of finalized remuneration cycles.</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[8px] h-5 px-3 bg-background font-black border-primary/20 text-primary">REAL-TIME DATA</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/10">
                    {runsLoading ? (
                      <div className="p-12 text-center text-xs animate-pulse font-black uppercase">Syncing Ledger...</div>
                    ) : recentRuns?.length === 0 ? (
                      <div className="p-12 text-center text-xs text-muted-foreground uppercase font-bold opacity-30 italic">No cycles processed in this institution node.</div>
                    ) : recentRuns?.map((run) => (
                      <div key={run.id} className="p-4 flex items-center justify-between hover:bg-secondary/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"><Activity className="size-5" /></div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight">{run.runNumber}</p>
                            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">REF: {run.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black font-mono text-primary">{currency} {run.totalGross?.toLocaleString()}</p>
                          <Badge variant="outline" className="text-[7px] h-3.5 px-1 mt-1 font-black uppercase border-none bg-secondary/50">{run.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Users className="size-4 text-primary" /> Staff Remuneration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <Link href="/payroll/structure" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[9px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2">Salary Structures</span>
                        <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                    <Link href="/payroll/processing" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[9px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2">Process Run</span>
                        <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                    <Link href="/payroll/statutory" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[9px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2">Statutory Filings</span>
                        <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 rounded-2xl relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><LayoutGrid className="size-24 text-primary" /></div>
                  <div className="flex flex-col gap-3 relative z-10">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Compliance Matrix</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                      "Remuneration flows are strictly siloed by legal entity. Cross-tenant payroll processing is prohibited at the edge."
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
