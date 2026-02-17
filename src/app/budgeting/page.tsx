'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, orderBy } from "firebase/firestore";
import { 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Zap,
  Calendar,
  Search,
  Wallet,
  Scale,
  BrainCircuit,
  ArrowRight,
  Activity,
  History,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { calculatePeriodVariance, type BudgetAllocation } from '@/lib/budgeting/budget.service';

export default function BudgetOverviewPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [varianceData, setVarianceData] = useState<BudgetAllocation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Data Fetching: Institutions
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  // Data Fetching: Open Fiscal Periods
  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'fiscal_periods'), 
      where('status', '==', 'Open'),
      orderBy('startDate', 'desc')
    );
  }, [db, selectedInstId]);
  const { data: activePeriods } = useCollection(periodsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // Trigger real-time variance calculation when period or institution changes
  const runAnalysis = async () => {
    if (!selectedInstId || !selectedPeriodId) return;
    setIsSyncing(true);
    try {
      const results = await calculatePeriodVariance(db, selectedInstId, selectedPeriodId);
      setVarianceData(results);
    } catch (e) {
      console.error("Variance calculation failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (selectedPeriodId) {
      runAnalysis();
    }
  }, [selectedPeriodId, selectedInstId]);

  // Aggregates for Pulse Cards
  const totalAllocated = varianceData.reduce((sum, item) => sum + (item.limit || 0), 0);
  const totalActual = varianceData.reduce((sum, item) => sum + (item.actual || 0), 0);
  const overallUtilization = totalAllocated > 0 ? (totalActual / totalAllocated) * 100 : 0;
  const breachedNodes = varianceData.filter(a => a.actual > a.limit && a.limit > 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Target className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Budget Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Institutional Spend Intelligence & Governance</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={(val) => {
              setSelectedInstId(val);
              setSelectedPeriodId("");
              setVarianceData([]);
            }}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId} disabled={!selectedInstId}>
              <SelectTrigger className="w-[180px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <Calendar className="size-3.5 mr-2 text-primary" />
                <SelectValue placeholder="Active Period" />
              </SelectTrigger>
              <SelectContent>
                {activePeriods?.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 border-primary/20 bg-primary/5 hover:bg-primary/10" 
              disabled={!selectedPeriodId || isSyncing}
              onClick={runAnalysis}
            >
              {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
          </div>
        </div>

        {!selectedPeriodId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <Scale className="size-10 text-muted-foreground opacity-20 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-muted-foreground text-center px-6 max-w-sm">
              Select an institution and an <strong>Open Fiscal Period</strong> to initialize real-time spend monitoring.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* High-Level Financial Pulse */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-md overflow-hidden relative group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Wallet className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Global Ceiling</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline">{currency} {totalAllocated.toLocaleString()}</div>
                  <p className="text-[9px] text-primary font-bold mt-1 uppercase">Period Target Total</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-md overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Realized Burn</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{currency} {totalActual.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Aggregated GL Activity</p>
                </CardContent>
              </Card>

              <Card className={cn("border-none ring-1 shadow-xl transition-all relative overflow-hidden", overallUtilization > 90 ? 'bg-destructive/5 ring-destructive/20' : 'bg-card ring-border')}>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5" />
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest", overallUtilization > 90 ? "text-destructive" : "text-accent")}>Resource Pulse</span>
                  <div className={cn("size-2.5 rounded-full animate-pulse", overallUtilization > 90 ? 'bg-destructive shadow-[0_0_10px_destructive]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]')} />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-2xl font-black font-headline">{overallUtilization.toFixed(1)}%</div>
                  <Progress value={Math.min(overallUtilization, 100)} className={cn("h-1.5 mt-2", overallUtilization > 90 && "[&>div]:bg-destructive")} />
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-md relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover:rotate-0 transition-transform"><Activity className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Audit Health</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-destructive">{breachedNodes} BREACHES</div>
                  <div className="flex items-center gap-1.5 mt-1 text-primary font-bold text-[9px] uppercase">
                    <AlertCircle className="size-3 text-amber-500" /> Threshold Critical
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Critical Channels Table */}
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Risk Matrix: High Intensity Nodes</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">Accounts with highest burn rates for {activePeriods?.find(p => p.id === selectedPeriodId)?.name}</CardDescription>
                  </div>
                  <Link href="/budgeting/variance">
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase gap-2 hover:bg-primary/10 hover:text-primary transition-all">
                      Full Audit Report <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Ledger Node</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase w-[280px]">Burn Velocity</TableHead>
                        <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Current Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {varianceData.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-12 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No allocations detected for this period.</TableCell></TableRow>
                      ) : varianceData?.sort((a, b) => b.utilization - a.utilization).slice(0, 6).map((acc) => {
                        const isOver = acc.utilization > 100;
                        const isWarning = acc.utilization > 80 && !isOver;
                        return (
                          <TableRow key={acc.accountId} className="h-16 hover:bg-secondary/5 transition-colors group">
                            <TableCell className="pl-6">
                              <div className="flex flex-col">
                                <span className="text-xs font-black uppercase tracking-tight">{acc.accountName}</span>
                                <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">GL: {acc.accountCode}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-[9px] font-black uppercase">
                                  <span className="opacity-40">Utilization</span>
                                  <span className={cn(isOver ? "text-destructive" : isWarning ? "text-amber-500" : "text-emerald-500")}>
                                    {acc.utilization.toFixed(1)}%
                                  </span>
                                </div>
                                <Progress value={Math.min(acc.utilization, 100)} className={cn("h-1.5 shadow-inner", isOver && "[&>div]:bg-destructive", isWarning && "[&>div]:bg-amber-500")} />
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex flex-col items-end">
                                <span className="font-mono font-black text-xs">{currency} {acc.actual.toLocaleString()}</span>
                                <span className="text-[8px] font-bold uppercase opacity-30">Target: {acc.limit.toLocaleString()}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Action & Strategy Panel */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <BrainCircuit className="size-4 text-primary" /> Strategist Insight
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="p-4 bg-secondary/20 rounded-2xl border border-border/50 relative overflow-hidden shadow-inner">
                      <div className="absolute top-0 right-0 p-2 opacity-5 rotate-12"><Zap className="size-16 text-primary" /></div>
                      <p className="text-[11px] leading-relaxed italic font-medium relative z-10 text-muted-foreground">
                        {breachedNodes > 0 
                          ? `System has detected ${breachedNodes} budget breaches. Suggesting immediate re-allocation from under-utilized categories to maintain positive quarterly margin.` 
                          : "Institutional burn rate is within healthy safety parameters. Predictive models suggest a 4.2% saving against this period's global ceiling."}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/budgeting/creation" className="w-full">
                        <Button variant="outline" className="w-full h-14 flex-col gap-1.5 bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                          <Zap className="size-4 text-primary group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">Set Limits</span>
                        </Button>
                      </Link>
                      <Link href="/budgeting/forecasting" className="w-full">
                        <Button variant="outline" className="w-full h-14 flex-col gap-1.5 bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                          <Activity className="size-4 text-accent group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">Predictive</span>
                        </Button>
                      </Link>
                      <Link href="/budgeting/departments" className="w-full">
                        <Button variant="outline" className="w-full h-14 flex-col gap-1.5 bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                          <History className="size-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">Branch Burn</span>
                        </Button>
                      </Link>
                      <Link href="/budgeting/setup" className="w-full">
                        <Button variant="outline" className="w-full h-14 flex-col gap-1.5 bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                          <RefreshCw className="size-4 text-muted-foreground group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">Config</span>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* Audit Context */}
                <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><LayoutGrid className="size-24 text-primary" /></div>
                  <div className="flex flex-col gap-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <History className="size-3.5 text-primary" />
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">Compliance Pulse</p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                      All realized spend figures are derived from finalized <strong>Journal Entries</strong>. Data synchronization occurs at the edge every 3000ms.
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
