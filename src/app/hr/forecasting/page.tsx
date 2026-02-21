'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  LineChart, 
  TrendingUp, 
  BrainCircuit, 
  Zap, 
  RefreshCw, 
  LayoutGrid,
  Sparkles,
  ArrowRight,
  Loader2,
  Activity,
  Users,
  Target,
  BadgeCent,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function HRForecastingPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <BrainCircuit className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Workforce Strategy</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">AI-Powered Predictive Workforce Planning</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" 
              disabled={!selectedInstId || isSimulating}
              onClick={handleSimulate}
            >
              {isSimulating ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Engage Forecaster
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <LineChart className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center">Select an institution to initialize predictive labor modeling.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-700">
            {/* PREDICTIVE VIZ */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden h-[450px] relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
                  <div className="size-80 rounded-full border-4 border-dashed border-primary/20 animate-[spin_40s_linear_infinite]" />
                  <Activity className="size-12 text-primary mt-[-200px]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6 text-primary">Headcount Variance Logic v2.4</p>
                </div>
                <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end relative z-10">
                  <div className="space-y-4">
                    <Badge variant="outline" className="h-7 px-4 bg-background/80 backdrop-blur-sm border-primary/30 text-primary font-black uppercase tracking-widest shadow-xl">Projection Cycle: Q4 2024</Badge>
                    <div className="space-y-1">
                      <p className="text-4xl font-black font-headline tracking-tighter">+12.4%</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Projected Headcount Increase</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="size-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
                    <div className="size-2 rounded-full bg-accent animate-pulse [animation-delay:0.4s]" />
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card border-none ring-1 ring-border shadow-sm p-6 space-y-2">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Target className="size-3 text-primary" /> Hiring Need</p>
                  <div className="text-2xl font-black font-headline text-foreground/90">14 NODES</div>
                  <p className="text-[9px] text-emerald-500 font-bold uppercase">Optimized across branches</p>
                </Card>
                <Card className="bg-card border-none ring-1 ring-border shadow-sm p-6 space-y-2">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><BadgeCent className="size-3 text-accent" /> Cost Projection</p>
                  <div className="text-2xl font-black font-headline text-accent">KES 2.4M</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">Est. Monthly Delta</p>
                </Card>
                <Card className="bg-card border-none ring-1 ring-border shadow-sm p-6 space-y-2">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><RefreshCw className="size-3 text-primary" /> Turnover Risk</p>
                  <div className="text-2xl font-black font-headline text-primary">LOW</div>
                  <p className="text-[9px] text-primary font-bold uppercase">Stability Score: 94%</p>
                </Card>
              </div>
            </div>

            {/* AI RECOMMENDATIONS */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden h-full flex flex-col">
                <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Zap className="size-4 text-primary" /> Tactical Strategy
                    </CardTitle>
                    <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary border-none font-black uppercase">LIVE</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 flex-1">
                  <div className="p-5 bg-secondary/20 rounded-2xl border border-border/50 relative overflow-hidden shadow-inner group cursor-default">
                    <div className="absolute top-0 right-0 p-3 opacity-10 rotate-12 group-hover:rotate-0 transition-transform"><Sparkles className="size-12 text-primary" /></div>
                    <p className="text-[11px] leading-relaxed italic font-medium relative z-10 text-muted-foreground">
                      "Turnover in the <span className="text-primary font-bold">Mombasa Branch</span> has stabilized. However, current sales growth suggests a deficit of **2 Pharmacist Nodes** by October. Recommendation: Initialize Job Requisitions now to account for the **14-day Time-To-Hire** lag."
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[9px] font-black uppercase text-muted-foreground tracking-widest px-1">Automated Directives</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-between h-12 text-[9px] font-bold uppercase bg-background border-none ring-1 ring-border group hover:ring-primary/30 transition-all">
                        <span className="flex items-center gap-2"><Plus className="size-3.5 text-primary" /> Publish Job Nodes</span>
                        <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-all" />
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-12 text-[9px] font-bold uppercase bg-background border-none ring-1 ring-border group hover:ring-primary/30 transition-all">
                        <span className="flex items-center gap-2"><Activity className="size-3.5 text-accent" /> Analyze Training ROI</span>
                        <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-all" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-6 bg-secondary/5 border-t border-border/50">
                  <p className="text-[9px] text-muted-foreground leading-tight italic">
                    Forecast model factors in real-time **POS Revenue**, **Attendance Intensity**, and **COA Budget Thresholds**.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
