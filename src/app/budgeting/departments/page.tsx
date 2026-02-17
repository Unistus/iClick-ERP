'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { 
  Building, 
  MapPin, 
  Activity,
  LayoutGrid,
  ChevronRight,
  Calendar,
  Loader2,
  RefreshCw,
  Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { calculateDepartmentalSpend } from "@/lib/budgeting/budget.service";
import { Button } from "@/components/ui/button";

export default function DepartmentBudgetPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [branchSpendMap, setBranchSpendMap] = useState<Record<string, number>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const branchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'branches');
  }, [db, selectedInstId]);
  const { data: branches, isLoading: branchesLoading } = useCollection(branchesQuery);

  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), orderBy('startDate', 'desc'));
  }, [db, selectedInstId]);
  const { data: periods } = useCollection(periodsQuery);

  const runAnalysis = async () => {
    if (!selectedInstId || !selectedPeriodId) return;
    setIsSyncing(true);
    try {
      const spendMap = await calculateDepartmentalSpend(db, selectedInstId, selectedPeriodId);
      setBranchSpendMap(spendMap);
    } catch (e) {
      console.error("Departmental analysis failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (selectedPeriodId) {
      runAnalysis();
    }
  }, [selectedPeriodId, selectedInstId]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner">
              <Building className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Departmental Split</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Cross-Branch Expenditure Analysis</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={(val) => {
              setSelectedInstId(val);
              setSelectedPeriodId("");
              setBranchSpendMap({});
            }}>
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
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name} ({p.status})</SelectItem>
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
            <Target className="size-16 text-muted-foreground opacity-10 mb-4" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">
              Select an institution and an active fiscal period to analyze branch-level spend hierarchies.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-4">
              {branchesLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="size-8 animate-spin text-primary opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Indexing Cost Centers...</p>
                </div>
              ) : branches?.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed rounded-3xl opacity-20">
                  <MapPin className="size-12 mx-auto mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">No branch locations registered for this entity.</p>
                </div>
              ) : branches?.map((branch) => {
                const actual = branchSpendMap[branch.id] || 0;
                // Since allocations are global per account in this MVP version, 
                // we'll show actual consumption per branch.
                
                return (
                  <Card key={branch.id} className="border-none ring-1 ring-border shadow-sm hover:ring-primary/30 transition-all bg-card overflow-hidden group">
                    <CardContent className="p-0 flex flex-col md:flex-row md:items-center">
                      <div className="p-6 md:w-1/3 bg-secondary/5 border-r border-border/50">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary"><MapPin className="size-4" /></div>
                          <h3 className="font-black text-sm uppercase tracking-tight">{branch.name}</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{branch.address || 'Standard Operational Node'}</p>
                      </div>
                      <div className="p-6 flex-1 space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Branch Spend Consumption</p>
                            <div className="text-xl font-black font-headline text-primary">KES {actual.toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-[9px] font-black h-5 px-2 bg-emerald-500/10 text-emerald-500 border-none">
                              {actual === 0 ? 'NO BURN' : 'ACTIVE'}
                            </Badge>
                            <p className="text-[9px] font-mono mt-1 opacity-50 uppercase">Period: {periods?.find(p => p.id === selectedPeriodId)?.name}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black uppercase">
                            <span className="opacity-50">Operational Intensity</span>
                            <span className="text-primary font-bold">LIVE</span>
                          </div>
                          <Progress value={actual > 0 ? 100 : 0} className="h-1" />
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-center border-l border-border/50 opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronRight className="size-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Departmental Logic</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-[11px] leading-relaxed text-muted-foreground italic">
                  <p>Expenditure is aggregated by cross-referencing **Journal Entries** with institutional **Cost Centers**.</p>
                  <p>In this view, the "Branch Spend" represents the consolidated actual balance of all tracked Expense and Asset accounts tagged to the specific location for the selected period.</p>
                  <div className="p-4 bg-secondary/20 rounded-xl border border-border/50 flex gap-3 items-center text-foreground font-bold">
                    <Activity className="size-4 text-primary" />
                    <span className="uppercase text-[9px] tracking-widest">Multi-Tenant Indexing: ACTIVE</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><LayoutGrid className="size-24" /></div>
                <div className="flex flex-col gap-2 relative z-10">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">System Health</p>
                  <p className="text-[11px] leading-relaxed">
                    Real-time consumption factors in every finalized sales transaction, procurement receipt, and manual journal correction recorded at the branch level.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
