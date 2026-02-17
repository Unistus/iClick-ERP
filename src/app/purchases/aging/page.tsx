
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Hourglass, Wallet, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SupplierAgingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Hourglass className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Supplier Aging</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Vendor Maturity Analysis</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Current", val: "KES 420k", color: "text-emerald-500" },
            { label: "1 - 30 Days", val: "KES 180k", color: "text-primary" },
            { label: "31 - 60 Days", val: "KES 92k", color: "text-amber-500" },
            { label: "Over 60 Days", val: "KES 45k", color: "text-destructive" },
          ].map(g => (
            <Card key={g.label} className="bg-card border-none ring-1 ring-border shadow-sm">
              <CardContent className="pt-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{g.label}</p>
                <p className={cn("text-lg font-bold font-mono", g.color)}>{g.val}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5 opacity-30">
          <Hourglass className="size-12 mb-3" />
          <p className="text-xs font-bold uppercase tracking-widest">Generating Maturity Matrix...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
