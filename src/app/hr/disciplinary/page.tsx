'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { 
  ShieldAlert, 
  Plus, 
  Search, 
  Gavel, 
  History, 
  MoreVertical, 
  Activity,
  Flame,
  AlertTriangle,
  LayoutGrid
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function DisciplinaryRecordsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const recordsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'disciplinary_records'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: records, isLoading } = useCollection(recordsQuery);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-destructive/20 text-destructive shadow-inner">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Conduct & Discipline</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Institutional Compliance & Conduct Log</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="destructive" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-destructive/20" disabled={!selectedInstId}>
              <Plus className="size-4" /> Log Incident
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Gavel className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access conduct archives.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Conduct Ledger</CardTitle>
                  <Badge variant="outline" className="text-[8px] bg-destructive/10 text-destructive font-black uppercase border-none">Secure Archive</Badge>
                </CardHeader>
                <CardContent className="p-20 text-center text-muted-foreground opacity-20 italic">
                  <Flame className="size-16 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Scanning Regulatory Records...</p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-destructive/5 border-none ring-1 ring-destructive/20 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><AlertTriangle className="size-24 text-destructive" /></div>
                <div className="space-y-3 relative z-10">
                  <p className="text-[10px] font-black uppercase text-destructive tracking-widest">Risk Governance</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                    "Disciplinary data is strictly controlled. Every record entry is permanently linked to the creating administrator's audit trail."
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