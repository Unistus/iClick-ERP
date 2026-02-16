
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { 
  PieChart, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  CheckCircle2, 
  Wallet,
  Settings2,
  Calendar,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BudgetManagementPage() {
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

  // Calculations
  const totalAllocated = budgetAccounts?.reduce((sum, acc) => sum + (acc.monthlyLimit || 0), 0) || 0;
  const totalActual = budgetAccounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
  const overallUtilization = totalAllocated > 0 ? (totalActual / totalAllocated) * 100 : 0;

  const overBudgetCount = budgetAccounts?.filter(acc => (acc.balance || 0) > (acc.monthlyLimit || 0)).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <PieChart className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Budgeting & Controls</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Real-time Spend Monitoring</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase">
              <Calendar className="size-3.5" /> Current Period
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Target className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to view its budget health.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Allocation</p>
                  <div className="text-xl font-bold">{currency} {totalAllocated.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground mt-1">Institutional Ceiling</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[10px] font-bold text-primary uppercase mb-1">Actual Spend</p>
                  <div className="text-xl font-bold text-primary">{currency} {totalActual.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground mt-1">Live Ledger Usage</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[10px] font-bold text-accent uppercase mb-1">Utilization</p>
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold">{overallUtilization.toFixed(1)}%</div>
                    <div className={`size-2 rounded-full animate-pulse ${overallUtilization > 90 ? 'bg-destructive' : 'bg-emerald-500'}`} />
                  </div>
                  <Progress value={Math.min(overallUtilization, 100)} className="h-1 mt-2" />
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[10px] font-bold text-destructive uppercase mb-1">Over Budget</p>
                  <div className="text-xl font-bold text-destructive">{overBudgetCount} Accounts</div>
                  <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                    <AlertCircle className="size-2.5" /> High priority attention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Budget Table */}
            <Card className="border-none ring-1 ring-border shadow-xl bg-card">
              <CardHeader className="py-3 px-6 border-b flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">Expense Thresholds</CardTitle>
                  <CardDescription className="text-[10px]">Accounts marked for budget tracking in the COA.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="size-8"><Filter className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="size-8"><Settings2 className="size-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Ledger Account</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Limit</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Actual</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Variance</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold w-[250px]">Usage</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs animate-pulse">Syncing budget data...</TableCell></TableRow>
                    ) : !budgetAccounts || budgetAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <p className="text-xs text-muted-foreground font-bold uppercase mb-2">No budget items defined.</p>
                          <p className="text-[10px] text-muted-foreground opacity-50">Enable "Budget Tracking" on expense accounts in the COA.</p>
                        </TableCell>
                      </TableRow>
                    ) : budgetAccounts.map((acc) => {
                      const limit = acc.monthlyLimit || 0;
                      const actual = acc.balance || 0;
                      const variance = limit - actual;
                      const pct = limit > 0 ? (actual / limit) * 100 : 0;
                      const isOver = actual > limit;

                      return (
                        <TableRow key={acc.id} className="h-14 hover:bg-secondary/5 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{acc.name}</span>
                              <span className="text-[9px] text-muted-foreground font-mono">{acc.code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px] font-bold">
                            {currency} {limit.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px] font-bold text-primary">
                            {currency} {actual.toLocaleString()}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-[11px] font-bold ${isOver ? 'text-destructive' : 'text-emerald-500'}`}>
                            {variance < 0 ? '-' : ''}{currency} {Math.abs(variance).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[9px] font-bold uppercase">
                                <span>Utilization</span>
                                <span>{pct.toFixed(1)}%</span>
                              </div>
                              <Progress value={Math.min(pct, 100)} className={`h-1.5 ${isOver ? 'bg-destructive/20 [&>div]:bg-destructive' : ''}`} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Badge variant="outline" className={`text-[9px] h-4 uppercase font-bold border-none ring-1 ${
                              isOver ? 'bg-destructive/10 text-destructive ring-destructive/20' : 
                              pct > 80 ? 'bg-amber-500/10 text-amber-500 ring-amber-500/20' : 
                              'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20'
                            }`}>
                              {isOver ? 'Exceeded' : pct > 80 ? 'Warning' : 'Healthy'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Dynamic AI-Style Insights Placeholder */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2">
                    <TrendingUp className="size-3" /> Cost Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] leading-relaxed">
                  The institution is operating at <span className="font-bold">{overallUtilization.toFixed(1)}%</span> total capacity. 
                  Marketing and Travel accounts show the highest burn rate this period.
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                    <Wallet className="size-3" /> Sweep Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] leading-relaxed">
                  Unused petty cash from the Office Supplies budget could be re-allocated to cover the Utility variance detected in the Nairobi branch.
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
