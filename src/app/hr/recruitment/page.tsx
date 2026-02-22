
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
import { collection, query, orderBy, where, doc, deleteDoc } from "firebase/firestore";
import { 
  UserSearch, 
  Plus, 
  Search, 
  Briefcase, 
  Users, 
  ChevronRight, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText,
  Mail,
  Phone,
  LayoutGrid,
  Filter,
  MoreVertical,
  Zap,
  Sparkles,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createJobPost } from "@/lib/hr/hr.service";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

const STAGES = ["New", "Screening", "Interview", "Offer", "Hired", "Rejected"];

export default function RecruitmentHubPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateJobOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'jobs' | 'applicants'>('jobs');

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Jobs
  const jobsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'jobs'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: jobs, isLoading: jobsLoading } = useCollection(jobsQuery);

  // Data Fetching: Applicants
  const applicantsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'applicants'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: applicants, isLoading: appLoading } = useCollection(applicantsQuery);

  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      department: formData.get('department') as string,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
      status: 'Active',
    };

    try {
      await createJobPost(db, selectedInstId, data);
      toast({ title: "Job Post Published", description: "Identity node active on career portal." });
      setIsCreateJobOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Publication Failed" });
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
              <UserSearch className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Talent Acquisition</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Institutional ATS & Pipeline Lifecycle</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Verifying..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg bg-primary" disabled={!selectedInstId} onClick={() => setIsCreateJobOpen(true)}>
              <Plus className="size-4" /> Publish Job
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2rem] bg-secondary/5">
            <Users className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">
              Select an institution to initialize the Talent Acquisition pipeline and candidate matrix.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* KPI STRIP */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Vacancies</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{jobs?.filter(j => j.status === 'Active').length || 0} OPEN</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-accent/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Applicant Flow</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-accent">{applicants?.length || 0} PROFILES</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-emerald-500/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Onboarding Pipeline</span>
                  <CheckCircle2 className="size-3 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">{applicants?.filter(a => a.stage === 'Hired').length || 0} OFFERS</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Zap className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase tracking-widest text-primary">Time-To-Hire</span></CardHeader>
                <CardContent className="pb-4"><div className="text-2xl font-black font-headline">14.2 DAYS</div></CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              {/* MAIN AREA */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex gap-1 p-1 bg-secondary/20 rounded-xl w-fit">
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('jobs')} className={cn("h-9 px-6 text-[10px] font-black uppercase tracking-widest", activeTab === 'jobs' ? "bg-background shadow-sm text-primary" : "opacity-50")}>Job Registry</Button>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('applicants')} className={cn("h-9 px-6 text-[10px] font-black uppercase tracking-widest", activeTab === 'applicants' ? "bg-background shadow-sm text-primary" : "opacity-50")}>Candidate Flow</Button>
                </div>

                {activeTab === 'jobs' ? (
                  <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                    <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                      <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Vacancy Matrix</CardTitle>
                      <Badge variant="outline" className="text-[8px] bg-primary/10 text-primary border-none font-black uppercase">Published: LIVE</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-secondary/20">
                          <TableRow>
                            <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Vacancy Title</TableHead>
                            <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Department Node</TableHead>
                            <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Applicants</TableHead>
                            <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Lifecycle</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {!jobs?.length ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-20 text-[10px] opacity-30 italic uppercase font-black">No active vacancies.</TableCell></TableRow>
                          ) : jobs.map(job => (
                            <TableRow key={job.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                              <TableCell className="pl-8">
                                <div className="flex items-center gap-3">
                                  <div className="size-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Briefcase className="size-4" /></div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase tracking-tight">{job.title}</span>
                                    <span className="text-[8px] text-muted-foreground font-bold uppercase opacity-60">{job.type} • ID: {job.id.slice(0, 5)}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[8px] h-5 px-2 bg-secondary/50 font-black border-border/50 uppercase">{job.department || 'GENERAL'}</Badge>
                              </TableCell>
                              <TableCell className="text-center font-black text-xs">
                                {applicants?.filter(a => a.jobId === job.id).length || 0}
                              </TableCell>
                              <TableCell className="text-right pr-8">
                                <Badge className={cn("text-[8px] h-5 px-3 font-black uppercase border-none", job.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground')}>{job.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {!applicants?.length ? (
                      <div className="p-20 text-center border-2 border-dashed rounded-[2rem] opacity-20"><UserSearch className="size-12 mx-auto mb-4" /><p className="font-bold uppercase tracking-widest text-xs">No active applications in this cycle.</p></div>
                    ) : applicants.map(app => (
                      <Card key={app.id} className="border-none ring-1 ring-border shadow-sm hover:ring-primary/30 transition-all bg-card group">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-secondary/50 flex items-center justify-center font-black text-primary border border-border">{(app.firstName?.[0] || '?')}{(app.lastName?.[0] || '?')}</div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-tight">{app.firstName} {app.lastName}</p>
                              <p className="text-[10px] font-bold text-primary uppercase">{jobs?.find(j => j.id === app.jobId)?.title || 'General Pool'}</p>
                              <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground font-mono">
                                <span className="flex items-center gap-1"><Mail className="size-2.5" /> {app.email}</span>
                                <span className="flex items-center gap-1"><Phone className="size-2.5" /> {app.phone}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="h-6 px-3 font-black uppercase bg-primary/5 text-primary border-none ring-1 ring-primary/20">{app.stage}</Badge>
                            <Button variant="ghost" size="icon" className="size-9 rounded-xl opacity-0 group-hover:opacity-100"><ArrowRight className="size-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* SIDE INTELLIGENCE */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" /> Acquisition Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 text-[11px] leading-relaxed text-muted-foreground italic">
                    <p>"The ATS layer utilizes **Workflow Siloing**. Applicants are anchored to specific Job Nodes, ensuring zero crossover in multi-tenant environments."</p>
                    <div className="p-4 bg-secondary/20 rounded-xl border border-border/50 flex gap-3 items-center text-foreground font-bold">
                      <ShieldCheck className="size-4 text-emerald-500" />
                      <span className="uppercase text-[9px] tracking-widest">KYC Shield: ACTIVE</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 rounded-[2rem] relative overflow-hidden shadow-inner">
                  <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><LayoutGrid className="size-24 text-primary" /></div>
                  <div className="space-y-3 relative z-10">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Talent Pipeline Logic</p>
                    <p className="text-[11px] leading-relaxed font-medium">
                      The system calculates **Conversion Velocity** from Screening to Offer, providing HR with real-time bottlenecks in the recruitment cycle.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* CREATE JOB DIALOG */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateJobOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2rem] overflow-hidden">
            <form onSubmit={handleCreateJob}>
              <DialogHeader className="bg-secondary/10 p-6 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="size-5 text-primary" />
                  <DialogTitle className="text-sm font-black uppercase tracking-widest">Publish Requisition</DialogTitle>
                </div>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Institutional Vacancy Lifecycle Hub</CardDescription>
              </DialogHeader>
              <div className="p-6 space-y-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Job Node Title</Label>
                  <Input name="title" placeholder="e.g. Lead Pharmacist" required className="h-11 font-black bg-secondary/5 border-none ring-1 ring-border" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Department Node</Label>
                    <Input name="department" placeholder="e.g. Pharmacy" required className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Employment Basis</Label>
                    <Select name="type" defaultValue="Full-time">
                      <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-time" className="text-[10px] font-black uppercase">FULL-TIME</SelectItem>
                        <SelectItem value="Contract" className="text-[10px] font-black uppercase">CONTRACT</SelectItem>
                        <SelectItem value="Intern" className="text-[10px] font-black uppercase">INTERNSHIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Strategic Description</Label>
                  <Input name="description" placeholder="Brief overview of role objectives..." className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                </div>
              </div>
              <DialogFooter className="bg-secondary/10 p-6 border-t gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsCreateJobOpen(false)} className="h-11 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-11 px-12 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20">
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Deploy Requisition
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
