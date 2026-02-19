'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { 
  Star, 
  Crown, 
  TrendingUp, 
  Zap, 
  RefreshCw, 
  Settings2, 
  Award,
  ShieldCheck,
  LayoutGrid,
  Search,
  Filter,
  History,
  ArrowUpRight,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { cn } from "@/lib/utils";

export default function LoyaltyManagementPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Data Fetching: Permitted Institutions (Access Control)
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 2. Data Fetching: CRM Institutional Settings (Earn Rates)
  const crmSetupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'crm');
  }, [db, selectedInstId]);
  const { data: crmSetup } = useDoc(crmSetupRef);

  // 3. Data Fetching: High-Value Customer Leaderboard
  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'customers'), 
      orderBy('loyaltyPoints', 'desc'), 
      limit(50)
    );
  }, [db, selectedInstId]);
  const { data: leaderboards, isLoading } = useCollection(customersQuery);

  const pointsEarnRate = crmSetup?.pointsEarnRate || 1;

  // Filter leaders based on search with safe null checks
  const filteredLeaders = leaderboards?.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/20 text-accent shadow-inner border border-accent/10">
              <Star className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Loyalty Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Tiered Retention & Retention Intelligence</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/crm/setup">
              <Button size="sm" variant="outline" className="gap-2 h-10 text-xs font-bold uppercase shadow-sm border-primary/20 hover:bg-primary/5" disabled={!selectedInstId}>
                <Settings2 className="size-4 text-primary" /> Program Policy
              </Button>
            </Link>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <div className="size-20 rounded-full bg-accent/5 flex items-center justify-center mb-4">
              <Award className="size-10 text-muted-foreground opacity-20 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-muted-foreground text-center px-6">
              Select an institution to monitor real-time points velocity and member tiers.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* LEFT COLUMN: LOGIC & PERFORMANCE */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border/10 py-4 px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Tiered Hierarchy</CardTitle>
                    <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary">AUDITED</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {[
                    { tier: 'Platinum', icon: Crown, color: 'text-primary', min: 10000, benefit: '15% Off All Pharmacy Items', bg: 'bg-primary/5' },
                    { tier: 'Gold', icon: Star, color: 'text-accent', min: 5000, benefit: '5% Off Restaurant Orders', bg: 'bg-accent/5' },
                    { tier: 'Silver', icon: Award, color: 'text-muted-foreground', min: 0, benefit: 'Standard Institutional Pricing', bg: 'bg-secondary/20' },
                  ].map((t) => (
                    <div key={t.tier} className={cn("flex items-start gap-4 p-4 rounded-xl border border-transparent transition-all hover:border-border/50", t.bg)}>
                      <div className={`p-2.5 rounded-lg bg-background shadow-sm ${t.color}`}><t.icon className="size-5" /></div>
                      <div className="space-y-1">
                        <p className="text-sm font-black uppercase tracking-tight">{t.tier}</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{t.benefit}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[9px] font-mono font-bold opacity-40 uppercase">Gate: {t.min.toLocaleString()} Points</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 p-6 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Zap className="size-32 text-emerald-500" /></div>
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-500" />
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Points Velocity Logic</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Member rewards are calculated at **{pointsEarnRate} Point per 100** spent. The system performs an atomic update to the member's profile upon Sales Invoice finalization."
                  </p>
                  <Link href="/crm/setup" className="pt-2">
                    <Button variant="link" size="sm" className="p-0 h-auto text-emerald-500 font-bold text-[9px] uppercase gap-1.5 hover:gap-2 transition-all">
                      Adjust Multiplier <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>

            {/* RIGHT COLUMN: LEADERBOARD & MEMBER ANALYTICS */}
            <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">High-Value Member Matrix</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold opacity-60 tracking-tight text-primary">Top 50 profiles by spent-loyalty conversion</CardDescription>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search members..." 
                    className="pl-9 h-9 text-[10px] bg-secondary/20 border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Reward Member</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-center">Standing</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase w-[250px]">Tier Progression</TableHead>
                      <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Vault Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse font-black uppercase tracking-widest opacity-50">Polling Identity Nodes...</TableCell></TableRow>
                    ) : filteredLeaders.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No program members detected in the directory.</TableCell></TableRow>
                    ) : filteredLeaders.map((c) => {
                      const points = c.loyaltyPoints || 0;
                      // Logic: Determine progress to next tier
                      let nextGoal = 5000; // Gold
                      let currentTier = 'Silver';
                      if (points >= 10000) { nextGoal = 10000; currentTier = 'Platinum'; }
                      else if (points >= 5000) { nextGoal = 10000; currentTier = 'Gold'; }
                      
                      const progress = Math.min((points / nextGoal) * 100, 100);

                      return (
                        <TableRow key={c.id} className="h-16 hover:bg-secondary/5 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{c.name}</span>
                              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">REF: {c.id.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "text-[8px] h-4 uppercase font-black border-none ring-1 px-2 shadow-sm",
                              currentTier === 'Platinum' ? "bg-primary/10 text-primary ring-primary/20" : 
                              currentTier === 'Gold' ? "bg-accent/10 text-accent ring-accent/20" : 
                              "bg-secondary/50 text-muted-foreground ring-border"
                            )}>
                              {currentTier}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5 px-4">
                              <div className="flex justify-between text-[8px] font-black uppercase">
                                <span className="opacity-40">Velocity to {currentTier === 'Platinum' ? 'LEGEND' : currentTier === 'Gold' ? 'PLATINUM' : 'GOLD'}</span>
                                <span className="text-primary font-bold">{progress.toFixed(0)}%</span>
                              </div>
                              <Progress value={progress} className="h-1 bg-secondary/50 [&>div]:bg-primary shadow-inner" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex flex-col items-end">
                              <span className="font-mono font-black text-sm text-primary tracking-tight">
                                {points.toLocaleString()}
                              </span>
                              <span className="text-[8px] font-bold uppercase opacity-30">LIFETIME POINTS</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
              <div className="p-4 bg-secondary/10 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                  <History className="size-3 text-primary" /> Last Audit: {new Date().toLocaleTimeString()}
                </div>
                <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase gap-2 hover:bg-primary/10 hover:text-primary transition-all">
                  Redemption History <ArrowUpRight className="size-3" />
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
