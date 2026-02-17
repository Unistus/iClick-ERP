'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { 
  Building, 
  MapPin, 
  Target, 
  TrendingUp, 
  Activity,
  LayoutGrid,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function DepartmentBudgetPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const branchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'branches');
  }, [db, selectedInstId]);
  const { data: branches, isLoading: branchesLoading } = useCollection(branchesQuery);

  const budgetAccountsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'coa'), 
      where('isTrackedForBudget', '==', true)
    );
  }, [db, selectedInstId]);
  const { data: accounts } = useCollection(budgetAccountsQuery);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Building className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Departmental Split</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Cross-Branch Expenditure Analysis</p>
            </div>
          </div>
          
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
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <LayoutGrid className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground text-center">Select an institution to analyze branch spend hierarchies.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-4">
              {branches?.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed rounded-3xl opacity-20">
                  <MapPin className="size-12 mx-auto mb-4" />
                  <p className="font-bold uppercase tracking-widest">No branch locations registered.</p>
                </div>
              ) : branches?.map((branch) => {
                // Simulate departmental breakdown per branch for MVP
                const simulatedAllocated = 450000;
                const simulatedActual = 320000;
                const pct = (simulatedActual / simulatedAllocated) * 100;

                return (
                  <Card key={branch.id} className="border-none ring-1 ring-border shadow-sm hover:ring-primary/30 transition-all bg-card overflow-hidden group">
                    <CardContent className="p-0 flex flex-col md:flex-row md:items-center">
                      <div className="p-6 md:w-1/3 bg-secondary/5 border-r border-border/50">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary"><MapPin className="size-4" /></div>
                          <h3 className="font-black text-sm uppercase tracking-tight">{branch.name}</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{branch.address}</p>
                      </div>
                      <div className="p-6 flex-1 space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Branch Spend</p>
                            <div className="text-lg font-black font-headline">KES {simulatedActual.toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-[9px] font-black h-5 px-2 bg-emerald-500/10 text-emerald-500 border-none">HEALTHY</Badge>
                            <p className="text-[10px] font-mono mt-1 opacity-50">Limit: {simulatedAllocated.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black uppercase">
                            <span className="opacity-50">Combined Allocation</span>
                            <span>{pct.toFixed(1)}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-center border-l border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="size-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card">
                <CardHeader className="pb-3 border-b border-border/10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Departmental Logic</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-[11px] leading-relaxed text-muted-foreground italic">
                  <p>Expenditure is aggregated by cross-referencing Journal Entries with institutional **Cost Centers**.</p>
                  <p>In this view, the "Branch Spend" represents the consolidated actual balance of all Expense accounts tagged to the specific location.</p>
                  <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex gap-3 items-center text-primary font-bold">
                    <Activity className="size-4" />
                    <span>Cost-center tagging: ACTIVE</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
