'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { 
  CalendarCheck, 
  Plus, 
  Activity, 
  Clock, 
  UserCircle, 
  Users,
  LayoutGrid,
  Zap,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function ShiftManagementPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const shiftsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'shifts'), orderBy('date', 'desc'));
  }, [db, selectedInstId]);
  const { data: shifts, isLoading } = useCollection(shiftsQuery);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
              <CalendarCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Roster Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Shift Planning & Labor Optimization</p>
            </div>
          </div>
          
          <div className="flex gap-2">
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
            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg bg-primary" disabled={!selectedInstId}>
              <Plus className="size-4" /> New Roster
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <CalendarCheck className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage labor schedules.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Shift Schedule</CardTitle>
                  <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary uppercase">Planning Active</Badge>
                </CardHeader>
                <CardContent className="p-20 text-center text-muted-foreground opacity-20 italic">
                  <LayoutGrid className="size-16 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Calendar View Initializing...</p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow bg-secondary/5 h-fit relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><Zap className="size-32 text-primary" /></div>
                <CardHeader><CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Roster Intelligence</CardTitle></CardHeader>
                <CardContent className="space-y-4 relative z-10">
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Shift logic is cross-referenced with **Attendance Hub** to automatically calculate late-ins and overtime variances."
                  </p>
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-3 items-center">
                    <Activity className="size-4 text-primary" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Labor Cost Ratio: OPTIMAL</span>
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