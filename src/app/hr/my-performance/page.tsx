'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where, doc } from "firebase/firestore";
import { 
  TrendingUp, 
  Award, 
  Star, 
  Zap, 
  Target,
  History,
  Activity,
  CheckCircle2,
  BrainCircuit,
  LayoutGrid,
  ShieldCheck,
  ChevronRight,
  Info,
  BadgeCent
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function MyPerformancePage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 1. Identify current employee
  const employeesQuery = useMemoFirebase(() => {
    if (!selectedInstId || !user?.email) return null;
    return query(collection(db, 'institutions', selectedInstId, 'employees'), where('email', '==', user.email));
  }, [db, selectedInstId, user?.email]);
  const { data: myProfiles } = useCollection(employeesQuery);
  const myProfile = myProfiles?.[0];

  // 2. Fetch my reviews
  const myReviewsQuery = useMemoFirebase(() => {
    if (!selectedInstId || !myProfile?.id) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'performance_reviews'), 
      where('employeeId', '==', myProfile.id),
      orderBy('date', 'desc')
    );
  }, [db, selectedInstId, myProfile?.id]);
  const { data: reviews, isLoading } = useCollection(myReviewsQuery);

  const latestReview = reviews?.[0];
  const avgScore = useMemo(() => {
    if (!reviews?.length) return 0;
    return reviews.reduce((sum, r) => sum + (r.score || 0), 0) / reviews.length;
  }, [reviews]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/20 text-accent shadow-inner border border-accent/10">
              <TrendingUp className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Talent Scorecard</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Personal Growth & Objective Audit</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder={instLoading ? "Analyzing..." : "Select Institution"} />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Award className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to view your institutional performance metrics.</p>
          </div>
        ) : !myProfile ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-destructive/5 text-destructive">
            <ShieldCheck className="size-16 opacity-20 mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Unauthorized Access</p>
            <p className="text-xs opacity-60 mt-1">Identity link required for performance telemetry.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* KPI Performance Section */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden relative group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Star className="size-24 text-accent" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Growth Standing</span></CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-2xl font-black font-headline text-accent">TOP TIER</div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Institutional Ranking</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Velocity Score</span>
                  <Activity className="size-3.5 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{avgScore.toFixed(1)} / 10</div>
                  <div className="flex items-center gap-1.5 mt-1 text-primary font-bold text-[9px] uppercase tracking-tighter">
                    <TrendingUp className="size-3" /> Career Momentum
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">KRA Realization</span>
                  <CheckCircle2 className="size-3.5 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">
                    {reviews?.filter(r => r.kraAchieved).length || 0} MET
                  </div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Lifecycle Milestones</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Award className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Points Standing</span>
                  <div className="size-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#008080]" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-2xl font-black font-headline text-primary">{myProfile.loyaltyScore || 100} PTS</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Staff Engagement Node</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Review History */}
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Audit Stream</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold opacity-60 text-primary">Bi-annual and ad-hoc supervisor evaluations</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-black uppercase bg-primary/10 text-primary border-none ring-1 ring-primary/20 px-3 h-7">
                    {reviews?.length || 0} Finalized Audits
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Review Period</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase text-center">Score</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase">Manager Feedback Summary</TableHead>
                        <TableHead className="h-10 text-right pr-6 text-[9px] font-black uppercase">Objective Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Syncing Scorecard...</TableCell></TableRow>
                      ) : reviews?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No historical evaluations found.</TableCell></TableRow>
                      ) : reviews?.map((r) => (
                        <TableRow key={r.id} className="h-20 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{format(new Date(r.date), 'MMMM yyyy')}</span>
                              <span className="text-[8px] text-muted-foreground font-mono uppercase tracking-widest opacity-60">REF: {r.id.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn("font-mono font-black text-xs px-2 py-0.5 rounded", 
                                r.score >= 8 ? "bg-emerald-500/10 text-emerald-500" : 
                                r.score >= 5 ? "bg-amber-500/10 text-amber-500" : 
                                "bg-destructive/10 text-destructive"
                              )}>
                                {r.score} / 10
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <p className="text-[11px] leading-relaxed text-muted-foreground italic line-clamp-2">"{r.feedback}"</p>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Badge variant="outline" className={cn(
                              "text-[8px] h-5 px-2.5 font-black uppercase border-none ring-1",
                              r.kraAchieved ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-destructive/10 text-destructive ring-destructive/20'
                            )}>
                              {r.kraAchieved ? 'KRA ACHIEVED' : 'BELOW TARGET'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Development Node */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-secondary/5 h-full relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><BrainCircuit className="size-24 text-primary" /></div>
                  <CardHeader className="bg-primary/5 border-b border-border/10 pb-3">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Target className="size-4 text-primary" /> Active Development Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6 relative z-10">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="opacity-50">Technical Mastery</span>
                          <span className="text-primary">82%</span>
                        </div>
                        <Progress value={82} className="h-1 bg-secondary [&>div]:bg-primary shadow-inner" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="opacity-50">Operational Velocity</span>
                          <span className="text-accent">64%</span>
                        </div>
                        <Progress value={64} className="h-1 bg-secondary [&>div]:bg-accent shadow-inner" />
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-3 shadow-inner">
                      <div className="flex items-center gap-2">
                        <Zap className="size-3 text-primary animate-pulse" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">Next Review Window</p>
                      </div>
                      <p className="text-xs font-bold leading-tight">Quarterly Q4 Review starts in 14 days.</p>
                      <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                        Prepare your self-evaluation highlighting process improvements in your department.
                      </p>
                    </div>

                    <Button variant="outline" className="w-full justify-between h-11 text-[9px] font-black uppercase bg-background border-none ring-1 ring-border group hover:ring-primary/30 transition-all">
                      <span>Download Audit Reports</span>
                      <LayoutGrid className="size-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
