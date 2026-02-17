
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeftRight, CreditCard, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PurchaseReturnsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-destructive/20 text-destructive">
              <ArrowLeftRight className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Purchase Returns</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Debit Notes & Reverse Logistics</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5 opacity-30 italic">
          <ArrowLeftRight className="size-16 mb-4" />
          <p className="text-sm font-bold uppercase tracking-widest">Reverse Procurement Hub</p>
          <p className="text-[10px] mt-1">Modules for physical restock and financial debit notes are being synchronized.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
