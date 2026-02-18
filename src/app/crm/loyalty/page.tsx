
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
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
  LayoutGrid
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';

export default function LoyaltyManagementPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const crmSetupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'crm');
  }, [db, selectedInstId]);
  const { data: crmSetup } = useDoc(crmSetupRef);

  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'customers'), orderBy('loyaltyPoints', 'desc'), limit(50));
  }, [db, selectedInstId]);
  const { data: leaderboards, isLoading } = useCollection(customersQuery);

  const pointsEarnRate = crmSetup?.pointsEarnRate || 1;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-accent/20 text-accent shadow-inner">
              <Star className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Loyalty Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Tiered Retention & Engagement Logic</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/crm/setup">
              <Button size="sm" variant="outline" className="gap-2 h-9 text-xs font-bold uppercase shadow-sm" disabled={!selectedInstId}>
                <Settings2 className="size-3.5" /> Program Config
              </Button>
            </Link>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Award className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to monitor program performance.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
            {/* Tier Definition Summary */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="border-none ring-1 ring-border shadow bg-card overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border/10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Tiered Hierarchy</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  {[
                    { tier: 'Platinum', icon: Crown, color: 'text-primary', min: 10000, benefit: '15% Off All Pharmacy Items' },
                    { tier: 'Gold', icon: Star, color: 'text-accent', min: 5000, benefit: '5% Off Restaurant Orders' },
                    { tier: 'Silver', icon: Award, color: 'text-muted-foreground', min: 0, benefit: 'Standard Pricing' },
                  ].map((t) => (
                    <div key={t.tier} className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg bg-secondary/50 ${t.color}`}><t.icon className="size-5" /></div>
                      <div className="space-y-1">
                        <p className="text-sm font-black uppercase tracking-tight">{t.tier}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{t.benefit}</p>
                        <p className="text-[9px] font-mono font-bold opacity-40">Requirement: {t.min.toLocaleString()} Points</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Zap className="size-24 text-emerald-500" /></div>
                <div className="flex flex-col gap-2 relative z-10">
                  <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Logic: Earn & Burn</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                    Program configured at **{pointsEarnRate} Point per 100** spent. Points are calculated on finalized invoices only.
                  </p>
                </div>
              </Card>
            </div>

            {/* Leaderboard / High Value Customers */}
            <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest">High-Value Leaders</CardTitle>
                <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary uppercase font-black">Retention Focus</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Member</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Status</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Tier Reach</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Total Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Polling Points Hub...</TableCell></TableRow>
                    ) : leaderboards?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No program members detected.</TableCell></TableRow>
                    ) : leaderboards?.map((c) => (
                      <TableRow key={c.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight">{c.name}</span>
                            <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">Member ID: {c.id.slice(0, 5)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-4 uppercase font-black border-primary/20 text-primary bg-primary/5">{c.tier || 'Silver'}</Badge>
                        </TableCell>
                        <TableCell className="w-[200px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase"><span className="opacity-40">Next Tier Goal</span><span>72%</span></div>
                            <Progress value={72} className="h-1 [&>div]:bg-primary" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">
                          {(c.loyaltyPoints || 0).toLocaleString()}
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
