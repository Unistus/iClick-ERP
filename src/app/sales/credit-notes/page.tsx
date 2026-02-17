
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { CreditCard, Plus, Search, Filter, History, MoreVertical, Loader2, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function CreditNotesPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-destructive/20 text-destructive">
              <CreditCard className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Credit Notes</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Adjustments & Liability Reductions</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={selectedInstId} 
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold rounded-md px-3"
            >
              <option value="">Select Institution</option>
              {institutions?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>

            <Button size="sm" variant="destructive" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-destructive/20" disabled={!selectedInstId}>
              <Plus className="size-4" /> Issue Credit
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <CreditCard className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage credit notes.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Credit Adjustment Log</CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold uppercase">Reverse Journal Enabled</Badge>
              </CardHeader>
              <CardContent className="p-20 text-center text-muted-foreground opacity-30 italic">
                <ArrowLeftRight className="size-12 mx-auto mb-4" />
                <p>No credit notes have been issued for this period.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
