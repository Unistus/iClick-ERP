
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { UserCheck, Wallet, TrendingUp, Calculator, RefreshCw, BadgeCent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CommissionsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-500">
              <UserCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Incentive Tracking</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Sales Commissions & Performance Audits</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" variant="outline" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId}>
              <Calculator className="size-4" /> Recalculate
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <BadgeCent className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to view commission performance.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card border-none ring-1 ring-border shadow-sm">
              <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Accrued</span>
                <Wallet className="size-3 text-emerald-500" />
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-xl font-bold text-emerald-500">KES 142,500</div>
                <p className="text-[9px] text-muted-foreground mt-1 uppercase font-black">Awaiting Payout Approval</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-none ring-1 ring-border shadow-sm">
              <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Top Earner</span>
                <TrendingUp className="size-3 text-primary" />
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-xl font-bold">Staff ID: 104</div>
                <p className="text-[9px] text-primary mt-1 uppercase font-black">KES 42,000 MTD</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
              <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-primary">Calculation Logic</span>
                <RefreshCw className="size-3 text-primary" />
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-xl font-bold uppercase">Flat 2.5%</div>
                <p className="text-[9px] text-muted-foreground mt-1 uppercase font-black">Based on Cleared Payments</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
