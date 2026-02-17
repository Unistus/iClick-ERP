
'use client';

import { useState } from 'react';
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
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function BudgetOverviewPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const budgetAccountsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'coa'), 
      where('isTrackedForBudget', '==', true)
    );
  }, [db, selectedInstId]);
  const { data: budgetAccounts, isLoading } = useCollection(budgetAccountsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // Aggregates
  const totalAllocated = budgetAccounts?.reduce((sum, acc) => sum + (acc.monthlyLimit || 0), 0) || 0;
  const totalActual = budgetAccounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
  const overallUtilization = totalAllocated > 0 ? (totalActual / totalAllocated) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner">
              <Target className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Budget Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Institutional Spend Intelligence</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/budgeting/creation">
              <Button size="sm" className="gap-2 h-10 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId}>
                <Zap className="size-4" /> Manage Limits
              </Button>
            </Link>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Scale className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize the budget monitoring engine.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Wallet className="size-24" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Global Allocation</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold font-headline">{currency} {totalAllocated.toLocaleString()}</div>
                  <p className="text-[9px] text-primary font-bold mt-1 uppercase">Monthly Ceiling</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Real-time Burn</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-primary font-headline">{currency} {totalActual.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Actual Expenditure</p>
                </CardContent>
              </Card>

              <Card className={`border-none ring-1 shadow-sm transition-all ${overallUtilization > 90 ? 'bg-destructive/5 ring-destructive/20' : 'bg-card ring-border'}`}>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-accent tracking-widest">Resource Pulse</span>
                  <div className={`size-2 rounded-full animate-pulse ${overallUtilization > 90 ? 'bg-destructive' : 'bg-emerald-500'}`} />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold font-headline">{overallUtilization.toFixed(1)}%</div>
                  <Progress value={Math.min(overallUtilization, 100)} className="h-1 mt-2" />
                </CardContent>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Active Nodes</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-lg font-bold text-primary font-headline">{budgetAccounts?.length || 0} ACCOUNTS</div>
                  <div className="flex items-center gap-1.5 mt-1 text-primary font-bold text-[9px] uppercase">
                    <TrendingUp className="size-3" /> Tracked for Spend
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Critical Spend Channels</CardTitle>
                    <CardDescription className="text-[10px]">Accounts nearing or exceeding institutional limits.</CardDescription>
                  </div>
                  <Link href="/budgeting/variance">
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase gap-1">Full Audit <ArrowRight className="size-3" /></Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {budgetAccounts?.length === 0 ? (
                        <TableRow><TableCell className="text-center py-12 text-xs text-muted-foreground uppercase font-bold">No accounts configured for budget tracking.</TableCell></TableRow>
                      ) : budgetAccounts?.sort((a, b) => ((b.balance / b.monthlyLimit) || 0) - ((a.balance / a.monthlyLimit) || 0)).slice(0, 6).map((acc) => {
                        const pct = acc.monthlyLimit > 0 ? (acc.balance / acc.monthlyLimit) * 100 : 0;
                        return (
                          <TableRow key={acc.id} className="h-16 hover:bg-secondary/5 transition-colors group">
                            <TableCell className="pl-6">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase">{acc.name}</span>
                                <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">GL: {acc.code}</span>
                              </div>
                            </TableCell>
                            <TableCell className="w-[300px]">
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-[9px] font-bold uppercase">
                                  <span className="opacity-50">Utilization</span>
                                  <span className={pct > 90 ? 'text-destructive' : ''}>{pct.toFixed(1)}%</span>
                                </div>
                                <Progress value={Math.min(pct, 100)} className={cn("h-1", pct > 90 && "[&>div]:bg-destructive")} />
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6 font-mono font-black text-xs">
                              {currency} {acc.balance?.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <BrainCircuit className="size-4 text-primary" /> Strategist Alert
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="p-4 bg-secondary/20 rounded-xl border border-border/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12"><Zap className="size-12 text-primary" /></div>
                      <p className="text-[11px] leading-relaxed italic font-medium relative z-10 text-muted-foreground">
                        "Institutional burn rate is trending <span className="text-emerald-500 font-bold">4.2% lower</span> than last month. Suggesting re-allocation of unutilized marketing funds to cover the projected utilities variance in Branch A."
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/budgeting/creation" className="w-full">
                        <Button variant="outline" className="w-full h-12 flex-col gap-1 bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border">
                          <Zap className="size-4 text-primary" />
                          <span className="text-[8px] font-black uppercase">Set Limits</span>
                        </Button>
                      </Link>
                      <Link href="/budgeting/forecasting" className="w-full">
                        <Button variant="outline" className="w-full h-12 flex-col gap-1 bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border">
                          <Activity className="size-4 text-accent" />
                          <span className="text-[8px] font-black uppercase">Forecast</span>
                        </Button>
                      </Link>
                    </div>
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
