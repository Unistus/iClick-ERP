'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, orderBy } from "firebase/firestore";
import { 
  Scale, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  History,
  Calendar,
  Loader2,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { calculatePeriodVariance, type BudgetAllocation } from '@/lib/budgeting/budget.service';

export default function VarianceAnalysisPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<BudgetAllocation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), orderBy('startDate', 'desc'));
  }, [db, selectedInstId]);
  const { data: periods } = useCollection(periodsQuery);

  const runAnalysis = async () => {
    if (!selectedInstId || !selectedPeriodId) return;
    setIsSyncing(true);
    try {
      const results = await calculatePeriodVariance(db, selectedInstId, selectedPeriodId);
      setData(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (selectedPeriodId) runAnalysis();
  }, [selectedPeriodId]);

  const filteredData = data.filter(acc => 
    acc.accountName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acc.accountCode.includes(searchTerm)
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner">
              <Scale className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Variance Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Budget vs Real-time Transactional Actuals</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
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

            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId} disabled={!selectedInstId}>
              <SelectTrigger className="w-[180px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <Calendar className="size-3 mr-2 text-primary" />
                <SelectValue placeholder="Audit Period" />
              </SelectTrigger>
              <SelectContent>
                {periods?.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" className="size-9" disabled={!selectedPeriodId || isSyncing} onClick={runAnalysis}>
              {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
          </div>
        </div>

        {!selectedPeriodId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <BarChart3 className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground text-center">Select institution and audit period to run variance analysis.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find spend channel..." 
                  className="pl-9 h-9 text-[10px] bg-card border-none ring-1 ring-border font-bold uppercase tracking-tight" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Badge variant="outline" className="h-9 px-4 text-[10px] font-black uppercase bg-destructive/5 text-destructive border-destructive/20 gap-2">
                <AlertCircle className="size-3" /> {data.filter(a => a.actual > a.limit && a.limit > 0).length} Breached Nodes
              </Badge>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Live Delta Matrix</CardTitle>
                <Badge variant="secondary" className="text-[8px] bg-emerald-500/10 text-emerald-500">AGGREGATING JOURNAL ENTRIES</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Ledger Node</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Period Allocation</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Realized Spend</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Deviation (Abs)</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Utilization (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isSyncing ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Syncing Transactional Data...</TableCell></TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No variance records found for this period.</TableCell></TableRow>
                    ) : filteredData.map((acc) => {
                      const isOver = acc.actual > acc.limit && acc.limit > 0;
                      return (
                        <TableRow key={acc.accountId} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase">{acc.accountName}</span>
                              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">GL-{acc.accountCode}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold opacity-50 uppercase">
                            {acc.limit.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-black text-primary uppercase">
                            {acc.actual.toLocaleString()}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono text-xs font-black uppercase", acc.variance < 0 ? "text-destructive" : "text-emerald-500")}>
                            {acc.variance < 0 ? '-' : ''}{Math.abs(acc.variance).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Badge variant="outline" className={cn(
                              "text-[10px] font-mono font-black h-5 border-none ring-1 px-2.5",
                              isOver ? "bg-destructive/10 text-destructive ring-destructive/20 animate-pulse" : "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20"
                            )}>
                              {acc.utilization.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><Activity className="size-24" /></div>
                <CardHeader className="pb-2 pt-4"><CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">Audit Logic</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-[11px] leading-relaxed text-muted-foreground opacity-70 relative z-10">
                    Realized Spend is computed by summing all **Debit** entries in the General Ledger for the selected period range. This provides an absolute source-of-truth variance analysis compared to set allocations.
                  </p>
                </CardContent>
              </Card>
              <div className="p-6 bg-secondary/10 rounded-2xl border flex flex-col justify-center gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground opacity-50">
                  <History className="size-3" /> System Health
                </div>
                <p className="text-[11px] font-bold text-foreground">Multi-tenant indexing is synchronized with Global Command.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
