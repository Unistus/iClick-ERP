
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, orderBy } from "firebase/firestore";
import { 
  PieChart, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Wallet,
  Settings2,
  Calendar,
  Filter,
  Search,
  ArrowRight,
  TrendingDown,
  ChevronDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

type BudgetStatus = 'All' | 'Exceeded' | 'Warning' | 'Healthy';

export default function BudgetManagementPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<BudgetStatus>('All');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), orderBy('startDate', 'desc'));
  }, [db, selectedInstId]);
  const { data: periods } = useCollection(periodsQuery);

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

  // Calculations & Filtering
  const filteredAccounts = budgetAccounts?.filter(acc => {
    const limit = acc.monthlyLimit || 0;
    const actual = acc.balance || 0;
    const pct = limit > 0 ? (actual / limit) * 100 : 0;
    
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || acc.code.includes(searchTerm);
    
    if (statusFilter === 'Exceeded') return matchesSearch && actual > limit;
    if (statusFilter === 'Warning') return matchesSearch && pct > 80 && actual <= limit;
    if (statusFilter === 'Healthy') return matchesSearch && pct <= 80;
    return matchesSearch;
  }) || [];

  const totalAllocated = budgetAccounts?.reduce((sum, acc) => sum + (acc.monthlyLimit || 0), 0) || 0;
  const totalActual = budgetAccounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
  const overallUtilization = totalAllocated > 0 ? (totalActual / totalAllocated) * 100 : 0;

  const overBudgetCount = budgetAccounts?.filter(acc => (acc.balance || 0) > (acc.monthlyLimit || 0)).length || 0;
  const warningCount = budgetAccounts?.filter(acc => {
    const pct = (acc.balance || 0) / (acc.monthlyLimit || 1) * 100;
    return pct > 80 && (acc.balance || 0) <= (acc.monthlyLimit || 0);
  }).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <PieChart className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Budget Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Real-time Financial Thresholds</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[200px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={!selectedInstId}>
              <SelectTrigger className="w-[160px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <Calendar className="size-3 mr-2 text-primary" />
                <SelectValue placeholder="Fiscal Period" />
              </SelectTrigger>
              <SelectContent>
                {periods?.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase" disabled={!selectedInstId}>
              <Settings2 className="size-3.5" /> Re-allocate
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Target className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access live budget metrics.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* High-Level Pulse */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1 tracking-wider">Ceiling Allocation</p>
                  <div className="text-xl font-bold">{currency} {totalAllocated.toLocaleString()}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground font-medium">
                    <Target className="size-3" /> Monthly Target
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-primary uppercase mb-1 tracking-wider">Burned Capital</p>
                  <div className="text-xl font-bold text-primary">{currency} {totalActual.toLocaleString()}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-emerald-500 font-bold text-[9px]">
                    <TrendingUp className="size-3" /> {((totalActual / (totalAllocated || 1)) * 100).toFixed(1)}% Usage
                  </div>
                </CardContent>
              </Card>
              <Card className={`border-none ring-1 shadow-sm transition-all ${overallUtilization > 90 ? 'bg-destructive/5 ring-destructive/20' : 'bg-card ring-border'}`}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[9px] font-bold text-accent uppercase tracking-wider">Threshold Risk</p>
                    <div className={`size-2 rounded-full animate-pulse ${overallUtilization > 90 ? 'bg-destructive' : overallUtilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  </div>
                  <div className="text-xl font-bold">{overallUtilization.toFixed(1)}%</div>
                  <Progress value={Math.min(overallUtilization, 100)} className={`h-1 mt-2 ${overallUtilization > 90 ? '[&>div]:bg-destructive' : ''}`} />
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-destructive uppercase mb-1 tracking-wider">Breached Nodes</p>
                  <div className="text-xl font-bold text-destructive">{overBudgetCount} Accounts</div>
                  <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                    <AlertCircle className="size-2.5 text-amber-500" /> {warningCount} accounts near limit
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* List Control Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex gap-1 p-1 bg-secondary/20 rounded-lg w-fit">
                {(['All', 'Exceeded', 'Warning', 'Healthy'] as BudgetStatus[]).map((status) => (
                  <Button 
                    key={status} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 px-4 text-[10px] font-bold uppercase tracking-wider ${statusFilter === status ? 'bg-background shadow-sm text-primary' : 'opacity-50'}`}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status} {status === 'Exceeded' && overBudgetCount > 0 && `(${overBudgetCount})`}
                  </Button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find ledger account..." 
                  className="pl-9 h-9 text-xs bg-card border-none ring-1 ring-border"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Main Registry */}
            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Ledger Account</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Limit</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Actual</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Variance</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold w-[300px]">Burn Rate</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs uppercase font-bold animate-pulse opacity-50">Polling threshold data...</TableCell></TableRow>
                  ) : filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24">
                        <Target className="size-12 mx-auto text-muted-foreground opacity-10 mb-3" />
                        <p className="text-xs text-muted-foreground font-bold uppercase">No matching budget nodes.</p>
                        <p className="text-[10px] text-muted-foreground opacity-50 mt-1">Check COA mappings or filter criteria.</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredAccounts.map((acc) => {
                    const limit = acc.monthlyLimit || 0;
                    const actual = acc.balance || 0;
                    const variance = limit - actual;
                    const pct = limit > 0 ? (actual / limit) * 100 : 0;
                    const isOver = actual > limit;
                    const isWarning = pct > 80 && !isOver;

                    return (
                      <TableRow key={acc.id} className="h-16 hover:bg-secondary/5 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{acc.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono opacity-50">GL: {acc.code}</span>
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
                          <div className="space-y-1.5 px-4">
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                              <span className="opacity-50">Utilization</span>
                              <span className={isOver ? 'text-destructive' : isWarning ? 'text-amber-500' : ''}>{pct.toFixed(1)}%</span>
                            </div>
                            <Progress 
                              value={Math.min(pct, 100)} 
                              className={`h-1.5 ${
                                isOver ? 'bg-destructive/20 [&>div]:bg-destructive' : 
                                isWarning ? 'bg-amber-500/20 [&>div]:bg-amber-500' : 
                                ''
                              }`} 
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-3">
                            <Badge variant="outline" className={`text-[9px] h-5 px-2 uppercase font-black border-none ring-1 ${
                              isOver ? 'bg-destructive/10 text-destructive ring-destructive/20 animate-pulse' : 
                              isWarning ? 'bg-amber-500/10 text-amber-500 ring-amber-500/20' : 
                              'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20'
                            }`}>
                              {isOver ? 'Exceeded' : isWarning ? 'Warning' : 'Healthy'}
                            </Badge>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100">
                                  <ChevronDown className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-[10px] font-bold uppercase">Controls</DropdownMenuLabel>
                                <DropdownMenuItem className="text-xs gap-2">
                                  <History className="size-3.5" /> View Period History
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2">
                                  <TrendingDown className="size-3.5" /> Request Re-allocation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs gap-2 text-destructive">
                                  <AlertCircle className="size-3.5" /> Lock Account Spend
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Strategy Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5">
                  <TrendingUp className="size-32" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2 tracking-[0.2em]">
                    <TrendingUp className="size-3" /> Efficiency Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] leading-relaxed relative z-10">
                  Global utilization is currently at <span className="font-bold text-emerald-500">{overallUtilization.toFixed(1)}%</span>. 
                  Personnel costs remain the highest burn factor, while administrative overhead has decreased by <span className="font-bold">4.2%</span> this period.
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5">
                  <Wallet className="size-32" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase text-primary flex items-center gap-2 tracking-[0.2em]">
                    <Wallet className="size-3" /> Liquidity Sweep
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] leading-relaxed relative z-10">
                  System detected <span className="font-bold">{currency} 124k</span> in unutilized marketing funds. 
                  Recommendation: Sweep surplus to cover the <span className="font-bold text-destructive">Utilities variance</span> detected in the CBD branch.
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
