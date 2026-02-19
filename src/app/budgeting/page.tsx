'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function BudgetOverviewPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [varianceData, setVarianceData] = useState<BudgetAllocation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Data Fetching: Permitted Institutions (Bypass check)
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 2. Data Fetching: Open Fiscal Periods
  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'fiscal_periods'), 
      orderBy('startDate', 'desc')
    );
  }, [db, selectedInstId]);
  const { data: activePeriods, isLoading: periodsLoading } = useCollection(periodsQuery);

  // Auto-select first period if none selected
  useEffect(() => {
    if (!selectedPeriodId && activePeriods && activePeriods.length > 0) {
      setSelectedPeriodId(activePeriods[0].id);
    }
  }, [activePeriods, selectedPeriodId]);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

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
    if (selectedPeriodId && selectedInstId) {
      runAnalysis();
    }
  }, [selectedPeriodId, selectedInstId]);

  // Aggregates
  const totalAllocated = varianceData.reduce((sum, item) => sum + (item.limit || 0), 0);
  const totalActual = varianceData.reduce((sum, item) => sum + (item.actual || 0), 0);
  const overallUtilization = totalAllocated > 0 ? (totalActual / totalAllocated) * 100 : 0;
  const breachedNodes = varianceData.filter(a => a.actual > a.limit && a.limit > 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Target className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Budget Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Real-time Fiscal Control</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={(val) => {
              setSelectedInstId(val);
              setSelectedPeriodId("");
              setVarianceData([]);
            }}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
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
                <SelectValue placeholder={periodsLoading ? "Loading Periods..." : "Audit Period"} />
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
              className="h-10 w-10 border-primary/20 bg-primary/5" 
              disabled={!selectedPeriodId || isSyncing}
              onClick={runAnalysis}
            >
              {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <Scale className="size-10 text-muted-foreground opacity-20 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-muted-foreground text-center px-6 max-w-sm">
              Select an institution to initialize real-time spend monitoring.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-md">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Global Ceiling</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline">{currency} {totalAllocated.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-md">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Realized Burn</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{currency} {totalActual.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className={cn("border-none ring-1 shadow-xl transition-all relative overflow-hidden", overallUtilization > 90 ? 'bg-destructive/5 ring-destructive/20' : 'bg-card ring-border')}>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest", overallUtilization > 90 ? "text-destructive" : "text-accent")}>Resource Pulse</span>
                  <div className={cn("size-2.5 rounded-full animate-pulse", overallUtilization > 90 ? 'bg-destructive' : 'bg-emerald-500')} />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline">{overallUtilization.toFixed(1)}%</div>
                  <Progress value={Math.min(overallUtilization, 100)} className={cn("h-1.5 mt-2", overallUtilization > 90 && "[&>div]:bg-destructive")} />
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-md">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Audit Health</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-destructive">{breachedNodes} BREACHES</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Risk Matrix: High Intensity Nodes</CardTitle>
                  <Link href="/budgeting/variance">
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase gap-2 hover:bg-primary/10">
                      Full Report <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Ledger Node</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase w-[280px]">Burn Velocity</TableHead>
                        <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Current Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {varianceData.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-12 text-xs opacity-20 italic">No allocations detected.</TableCell></TableRow>
                      ) : varianceData?.sort((a, b) => b.utilization - a.utilization).slice(0, 6).map((acc) => (
                        <TableRow key={acc.accountId} className="h-16 hover:bg-secondary/5 transition-colors border-b-border/30">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase">{acc.accountName}</span>
                              <span className="text-[9px] opacity-60">GL: {acc.accountCode}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5 px-4">
                              <div className="flex justify-between text-[8px] font-black uppercase">
                                <span className="opacity-40">Utilization</span>
                                <span className={acc.utilization > 100 ? "text-destructive" : "text-emerald-500"}>{acc.utilization.toFixed(1)}%</span>
                              </div>
                              <Progress value={Math.min(acc.utilization, 100)} className={cn("h-1", acc.utilization > 100 && "[&>div]:bg-destructive")} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6 font-mono text-xs font-black">
                            {currency} {acc.actual.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <BrainCircuit className="size-4 text-primary" /> Budget Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <Link href="/budgeting/creation" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border">
                        <span>Define Allocations</span>
                        <ArrowRight className="size-3" />
                      </Button>
                    </Link>
                    <Link href="/budgeting/variance" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border">
                        <span>Variance Hub</span>
                        <ArrowRight className="size-3" />
                      </Button>
                    </Link>
                    <Link href="/budgeting/departments" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border">
                        <span>Branch Split</span>
                        <ArrowRight className="size-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}