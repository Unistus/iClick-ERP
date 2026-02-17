'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { 
  LineChart, 
  TrendingUp, 
  BrainCircuit, 
  Zap, 
  RefreshCw, 
  LayoutGrid,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ForecastingPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 1500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-accent/20 text-accent shadow-inner">
              <LineChart className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Predictive Burn</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">AI-Powered Fiscal Projections</p>
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
            <Button 
              className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" 
              disabled={!selectedInstId || isSimulating}
              onClick={handleSimulate}
            >
              {isSimulating ? <RefreshCw className="size-3 animate-spin" /> : <BrainCircuit className="size-3" />} Run Simulation
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Sparkles className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground text-center">Select an institution to initialize predictive modeling.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden h-[400px] flex items-center justify-center relative">
                <div className="absolute inset-0 bg-secondary/10 flex flex-col items-center justify-center opacity-30">
                  <div className="size-64 rounded-full border-4 border-dashed border-primary/20 animate-[spin_30s_linear_infinite]" />
                  <LineChart className="size-12 text-primary mt-[-160px]" />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Predictive Graph Layer Loading...</p>
                </div>
                <div className="z-10 text-center space-y-4">
                  <Badge variant="outline" className="h-6 px-4 bg-primary/10 border-primary/20 text-primary font-black uppercase tracking-widest">Projection v1.4</Badge>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Analyzing historical journal entry velocity to project period-end utilization across all budget nodes.
                  </p>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card border-none ring-1 ring-border shadow-sm p-4">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Projected Saving</p>
                  <div className="text-lg font-black text-emerald-500">KES 42,500</div>
                </Card>
                <Card className="bg-card border-none ring-1 ring-border shadow-sm p-4">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Threshold Breach Risk</p>
                  <div className="text-lg font-black text-destructive">LOW</div>
                </Card>
                <Card className="bg-card border-none ring-1 ring-border shadow-sm p-4">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Forecast Accuracy</p>
                  <div className="text-lg font-black text-primary">94.2%</div>
                </Card>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Zap className="size-4 text-primary" /> Recommendation Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="p-4 bg-secondary/20 rounded-xl border border-border/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12"><Sparkles className="size-12 text-primary" /></div>
                    <p className="text-[11px] leading-relaxed italic font-medium relative z-10 text-muted-foreground">
                      "Projected spend for **Utilities** is trending 12% above budget due to seasonal fluctuations. Recommendation: Temporarily cap discretionary marketing spend by **KES 15,000** to maintain a positive period-end variance."
                    </p>
                  </div>
                  <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                    <span>Adjust Ceiling Automically</span>
                    <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
