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
  RefreshCw, 
  Search, 
  Calendar, 
  Loader2, 
  AlertCircle,
  BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { calculatePeriodVariance, type BudgetAllocation } from '@/lib/budgeting/budget.service';
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { cn } from "@/lib/utils";

export default function VarianceAnalysisPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<BudgetAllocation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Data Fetching: Permitted Institutions
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 2. Data Fetching: Fiscal Periods
  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), orderBy('startDate', 'desc'));
  }, [db, selectedInstId]);
  const { data: periods, isLoading: periodsLoading } = useCollection(periodsQuery);

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
    if (selectedPeriodId && selectedInstId) runAnalysis();
  }, [selectedPeriodId, selectedInstId]);

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
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Audit vs Actuals</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={(val) => {
              setSelectedInstId(val);
              setSelectedPeriodId("");
              setData([]);
            }}>
              <SelectTrigger className="w-[200px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId} disabled={!selectedInstId}>
              <SelectTrigger className="w-[180px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <Calendar className="size-3.5 mr-2 text-primary" />
                <SelectValue placeholder={periodsLoading ? "Scanning..." : "Audit Period"} />
              </SelectTrigger>
              <SelectContent>
                {periods?.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" className="size-9 h-9" disabled={!selectedPeriodId || isSyncing} onClick={runAnalysis}>
              {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
          </div>
        </div>

        {!selectedPeriodId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <BarChart3 className="size-16 text-muted-foreground opacity-10 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution and cycle to run variance analysis.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Find spend channel..." 
                    className="pl-9 h-10 text-[10px] bg-secondary/20 border-none" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/20 bg-primary/5 px-3 h-7">
                  {filteredData.length} Accounts Monitored
                </Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Ledger Node</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Target Ceiling</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Realized Spend</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Utilization (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isSyncing ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Syncing Transactional Data...</TableCell></TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No variance records found.</TableCell></TableRow>
                    ) : filteredData.map((acc) => (
                      <TableRow key={acc.accountId} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase">{acc.accountName}</span>
                            <span className="text-[9px] opacity-60">GL-{acc.accountCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs opacity-50">
                          {acc.limit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-primary">
                          {acc.actual.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-mono font-black h-5 border-none ring-1 px-2.5",
                            acc.utilization > 100 ? "bg-destructive/10 text-destructive ring-destructive/20 animate-pulse" : "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20"
                          )}>
                            {acc.utilization.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}