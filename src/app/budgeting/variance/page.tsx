'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { 
  Scale, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  History
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

export default function VarianceAnalysisPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

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
  const { data: accounts, isLoading } = useCollection(budgetAccountsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const filteredAccounts = accounts?.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acc.code.includes(searchTerm)
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner">
              <Scale className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Variance Audit</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Budget vs Actual Deviation Matrix</p>
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
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId}>
              <RefreshCw className="size-3.5" /> Re-audit
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <BarChart3 className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground text-center">Select an institution to analyze spend deviations.</p>
          </div>
        ) : (
          <div className="space-y-6">
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-9 px-4 text-[10px] font-black uppercase bg-destructive/5 text-destructive border-destructive/20">
                  {accounts?.filter(a => (a.balance || 0) > (a.monthlyLimit || 0)).length} Breached Nodes
                </Badge>
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Deviation Ledger</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Ledger Node</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Planned (Budget)</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Burned (Actual)</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Variance (Abs)</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right pr-6">Variance (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase">Syncing Ledger Delta...</TableCell></TableRow>
                    ) : filteredAccounts.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No variance records found.</TableCell></TableRow>
                    ) : filteredAccounts.map((acc) => {
                      const limit = acc.monthlyLimit || 0;
                      const actual = acc.balance || 0;
                      const variance = limit - actual;
                      const pct = limit > 0 ? ((actual - limit) / limit) * 100 : 0;
                      const isOver = actual > limit;

                      return (
                        <TableRow key={acc.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase">{acc.name}</span>
                              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">GL-{acc.code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold opacity-50">
                            {currency} {limit.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-black text-primary">
                            {currency} {actual.toLocaleString()}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono text-xs font-black", isOver ? "text-destructive" : "text-emerald-500")}>
                            {variance < 0 ? '-' : ''}{currency} {Math.abs(variance).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Badge variant="outline" className={cn(
                              "text-[10px] font-mono font-black h-5 border-none ring-1 px-2",
                              isOver ? "bg-destructive/10 text-destructive ring-destructive/20" : "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20"
                            )}>
                              {isOver ? '+' : ''}{pct.toFixed(1)}%
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
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><Scale className="size-24" /></div>
                <CardHeader className="pb-2 pt-4"><CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">Audit Logic</CardTitle></CardHeader>
                <CardContent className="text-[11px] leading-relaxed text-muted-foreground opacity-70">
                  Absolute Variance represents the remaining institutional ceiling. Percentage Variance identifies the rate of over-spend relative to the allocated baseline. 
                </CardContent>
              </Card>
              <Card className="bg-secondary/10 border-none ring-1 ring-border shadow-sm p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <History className="size-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-foreground">Variance Snapshots</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Automatic period closing enabled.</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase underline decoration-dotted">History</Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
