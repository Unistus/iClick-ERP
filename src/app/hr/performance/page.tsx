'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { 
  Star, 
  TrendingUp, 
  Target, 
  Award, 
  Plus, 
  Search, 
  Zap,
  Activity,
  History,
  MoreVertical,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function PerformanceReviewsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const reviewsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'performance_reviews'), orderBy('date', 'desc'));
  }, [db, selectedInstId]);
  const { data: reviews, isLoading } = useCollection(reviewsQuery);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-accent/20 text-accent">
              <Star className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Growth & Reviews</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">KRA / Talent Performance Hub</p>
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
            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg bg-accent" disabled={!selectedInstId}>
              <Plus className="size-4" /> Conduct Review
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Award className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to track talent performance.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Staff Performance Matrix</CardTitle>
                  <Badge variant="secondary" className="text-[8px] bg-accent/10 text-accent uppercase font-black">Audit Ready</Badge>
                </CardHeader>
                <CardContent className="p-20 text-center text-muted-foreground opacity-20 italic">
                  <Activity className="size-16 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Performance Data Polling...</p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><TrendingUp className="size-24 text-primary" /></div>
                <div className="space-y-3 relative z-10">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Growth Intelligence</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                    Reviews are aggregated to calculate the **Talent Velocity Score**. High-performers are flagged for institutional leadership promotion tracks.
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