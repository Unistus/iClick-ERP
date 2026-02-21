'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp } from "firebase/firestore";
import { 
  GraduationCap, 
  Plus, 
  Search, 
  History, 
  PlayCircle, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  Loader2, 
  Zap,
  Sparkles,
  ShieldCheck,
  Activity,
  LayoutGrid,
  Filter,
  ArrowRight,
  MoreVertical,
  Timer
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createTrainingCourse } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function TrainingLMSPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Courses
  const coursesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'courses'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: courses, isLoading: coursesLoading } = useCollection(coursesQuery);

  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      duration: formData.get('duration') as string,
      description: formData.get('description') as string,
      points: parseInt(formData.get('points') as string) || 0,
    };

    try {
      await createTrainingCourse(db, selectedInstId, data);
      toast({ title: "Module Registered", description: "LMS identity node active." });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Registration Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Learning Cloud</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Institutional LMS & Skills Matrix</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Validating..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg bg-primary" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Add Module
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
            <BookOpen className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6 max-w-sm">
              Select an institution to initialize the Learning Management System and personnel skills matrix.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* KPI MATRIX */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Curriculum</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{courses?.length || 0} MODULES</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-accent/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Enrollment Intensity</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-accent">84 ACTIVE</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-emerald-500/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Certified Personnel</span>
                  <Award className="size-3 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">124 BADGES</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Timer className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase tracking-widest text-primary">Training Yield</span></CardHeader>
                <CardContent className="pb-4"><div className="text-2xl font-black font-headline">92%</div></CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search modules or curriculum..." 
                    className="pl-9 h-10 text-[10px] bg-secondary/20 border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase text-primary border-primary/20 bg-primary/5 h-8 px-4">
                    Official Course Registry
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Module Identity</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Category Node</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Reward Points</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Window</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursesLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Scanning LMS Hub...</TableCell></TableRow>
                    ) : (!courses || courses.length === 0) ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No training modules registered.</TableCell></TableRow>
                    ) : courses.map(c => (
                      <TableRow key={c.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/5 group-hover:rotate-3 transition-transform">
                              <BookOpen className="size-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{c.name}</span>
                              <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">ID: {c.id.slice(0, 5)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-5 px-2.5 font-black uppercase border-primary/20 text-primary bg-primary/5">
                            {c.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[8px] h-5 px-3 bg-emerald-500/10 text-emerald-500 border-none font-black uppercase">
                            +{c.points} XP
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono font-black uppercase tracking-tighter text-foreground/70">
                          {c.duration}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button variant="ghost" size="sm" className="h-9 px-4 text-[9px] font-black uppercase gap-2 hover:bg-primary/10 hover:text-primary transition-all">
                            Manage Participants <ArrowRight className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-md">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-6 transition-transform"><Award className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Credential Integrity</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Completion of modules atomically updates the employee's **Skills Matrix** and **Talent Scorecard**, feeding directly into the bi-annual performance audit engine."
                  </p>
                </div>
              </Card>
              <div className="p-8 bg-secondary/10 rounded-[2rem] border border-border/50 flex items-center justify-between group cursor-default shadow-inner">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <Zap className="size-3 text-amber-500" /> Reward Logic
                  </p>
                  <p className="text-[11px] font-bold leading-tight max-w-[250px]">Personnel earn 'Institutional Points' for every completed course, redeemable for career track promotions.</p>
                </div>
                <Activity className="size-10 text-primary opacity-10 group-hover:opacity-100 transition-all duration-700 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* ADD MODULE DIALOG */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2rem] overflow-hidden">
            <form onSubmit={handleCreateCourse}>
              <DialogHeader className="bg-secondary/10 p-8 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><BookOpen className="size-5" /></div>
                  <DialogTitle className="text-sm font-black uppercase tracking-widest">Register LMS Module</DialogTitle>
                </div>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Institutional Learning Provision Node</CardDescription>
              </DialogHeader>
              
              <div className="p-8 space-y-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Course Designation</Label>
                  <Input name="name" placeholder="e.g. Pharmacy Compliance 101" required className="h-11 font-black bg-secondary/5 border-none ring-1 ring-border" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Category Node</Label>
                    <Select name="category" defaultValue="Compliance">
                      <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Compliance" className="text-[10px] font-black uppercase">COMPLIANCE</SelectItem>
                        <SelectItem value="Technical" className="text-[10px] font-black uppercase">TECHNICAL</SelectItem>
                        <SelectItem value="Leadership" className="text-[10px] font-black uppercase">LEADERSHIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Reward XP</Label>
                    <Input name="points" type="number" defaultValue={50} required className="h-11 font-black bg-secondary/5 border-none ring-1 ring-border" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Time Estimate</Label>
                  <Input name="duration" placeholder="e.g. 2 Hours" className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-8 border-t gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-12 px-12 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-4" />} Deploy Module
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
