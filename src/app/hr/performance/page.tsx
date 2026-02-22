
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp } from "firebase/firestore";
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
  RefreshCw,
  LayoutGrid,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { conductPerformanceReview } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function PerformanceReviewsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const reviewsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'performance_reviews'), orderBy('date', 'desc'));
  }, [db, selectedInstId]);
  const { data: reviews, isLoading } = useCollection(reviewsQuery);

  const employeesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'employees');
  }, [db, selectedInstId]);
  const { data: employees } = useCollection(employeesRef);

  const handleSubmitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      employeeId: formData.get('employeeId') as string,
      reviewerId: user?.uid,
      date: formData.get('date') as string,
      score: parseInt(formData.get('score') as string),
      feedback: formData.get('feedback') as string,
      kraAchieved: formData.get('kraAchieved') === 'on',
      status: 'Finalized',
    };

    try {
      await conductPerformanceReview(db, selectedInstId, data);
      toast({ title: "Review Submitted", description: "Talent scorecard updated." });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Submission Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-accent/20 text-accent shadow-inner border border-accent/10">
              <Star className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Growth & Reviews</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">KRA / Talent Performance Hub</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-full md:w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Verifying..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg bg-accent" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
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
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
            <div className="lg:col-span-8">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Staff Performance Matrix</CardTitle>
                  <Badge variant="secondary" className="text-[8px] bg-accent/10 text-accent uppercase font-black">Audit Ready</Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Staff Member</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase">Review Date</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase text-center">Velocity Score</TableHead>
                        <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing Scorecards...</TableCell></TableRow>
                      ) : (!reviews || reviews.length === 0) ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No performance logs.</TableCell></TableRow>
                      ) : reviews.map((r) => (
                        <TableRow key={r.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6 font-bold text-xs uppercase tracking-tight">
                            {employees?.find(e => e.id === r.employeeId)?.firstName || '...'}
                          </TableCell>
                          <TableCell className="text-[10px] font-mono font-bold uppercase opacity-60">
                            {format(new Date(r.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "text-[10px] h-5 font-black uppercase border-none ring-1 px-2.5",
                              r.score >= 8 ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20" : 
                              r.score >= 5 ? "bg-amber-500/10 text-amber-500 ring-amber-500/20" : 
                              "bg-destructive/10 text-destructive ring-destructive/20"
                            )}>
                              {r.score} / 10
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Badge variant="secondary" className="text-[8px] h-4 uppercase font-black border-none">{r.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 rounded-2xl relative overflow-hidden group shadow-md">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><TrendingUp className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Growth Intelligence</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Reviews are aggregated to calculate the **Talent Velocity Score**. High-performers are flagged for institutional leadership promotion tracks."
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border">
            <form onSubmit={handleSubmitReview}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="size-5 text-accent" />
                  <DialogTitle>Conduct Performance Audit</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tighter">KRA Realization & Talent Grading</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Staff Member</Label>
                  <Select name="employeeId" required>
                    <SelectTrigger className="h-10 font-bold uppercase"><SelectValue placeholder="Pick Subject..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => <SelectItem key={e.id} value={e.id} className="text-xs font-bold uppercase">{e.firstName} {e.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Audit Date</Label>
                    <Input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Performance Grade (1-10)</Label>
                    <Input name="score" type="number" min="1" max="10" defaultValue="7" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Qualitative Feedback</Label>
                  <Textarea name="feedback" placeholder="Observations on output and behavior..." required className="min-h-[100px] bg-secondary/5" />
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">KRA Met?</Label>
                    <p className="text-[10px] text-muted-foreground">Verification of objective attainment.</p>
                  </div>
                  <input type="checkbox" name="kraAchieved" className="size-4" />
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-11 font-black uppercase tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-11 px-10 font-bold uppercase text-xs shadow-2xl shadow-primary/40 bg-accent hover:bg-accent/90 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-4" />} Finalize Scorecard
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
