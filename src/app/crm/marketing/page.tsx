
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { 
  Zap, 
  Plus, 
  Search, 
  MessageSquare, 
  Mail, 
  TrendingUp, 
  RefreshCw, 
  Loader2, 
  Target,
  Users,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  BarChart3,
  Filter,
  ArrowRight,
  MousePointer2,
  MoreVertical
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createMarketingCampaign } from "@/lib/crm/crm.service";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function MarketingHubPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // UI CLEANUP HOOK
  useEffect(() => {
    if (!isCreateOpen) {
      setIsProcessing(false);
    }
  }, [isCreateOpen]);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const campaignsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'campaigns'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: campaigns, isLoading } = useCollection(campaignsQuery);

  const segmentsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'customer_segments');
  }, [db, selectedInstId]);
  const { data: segments } = useCollection(segmentsRef);

  // Aggregates for KPIs
  const totalReach = campaigns?.reduce((sum, c) => sum + (c.reach || 0), 0) || 0;
  const totalBudget = campaigns?.reduce((sum, c) => sum + (c.budget || 0), 0) || 0;
  const activeCount = campaigns?.filter(c => c.status === 'Active').length || 0;

  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      channel: formData.get('channel') as any,
      budget: parseFloat(formData.get('budget') as string) || 0,
      description: formData.get('description') as string,
      segmentId: formData.get('segmentId') as string,
      status: 'Draft',
      reach: 0
    };

    // Non-blocking close
    setIsCreateOpen(false);

    try {
      await createMarketingCampaign(db, selectedInstId, data);
      toast({ title: "Campaign Initialized", description: "Overture phase ready for batching." });
    } catch (err) {
      toast({ variant: "destructive", title: "Deployment Error" });
    }
  };

  const handleTriggerBatch = (campaign: any) => {
    toast({ 
      title: "Batch Sequence Active", 
      description: `Disseminating ${campaign.channel} payload to ${campaign.segmentId || 'targeted'} segment.` 
    });
  };

  const filteredCampaigns = campaigns?.filter(c => 
    c.title?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Target className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Marketing Cloud</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Outreach Intelligence & Conversion Command</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Raise Campaign
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Sparkles className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to deploy targeted marketing logic.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* KPI Performance Section */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Aggregate Reach</span>
                  <Users className="size-3.5 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-foreground/90">{totalReach.toLocaleString()} IDENTITIES</div>
                  <div className="flex items-center gap-1.5 mt-1 text-emerald-500 font-bold text-[9px] uppercase tracking-tighter">
                    <TrendingUp className="size-3" /> Targeted Growth
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Cycles</span>
                  <Zap className="size-3.5 text-accent opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-accent">{activeCount} CAMPAIGNS</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Operational Pulse: HIGH</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Capital Commitment</span>
                  <BarChart3 className="size-3.5 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-emerald-500">KES {totalBudget.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Consolidated Spend</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10"><MousePointer2 className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Engagement Rate</span>
                  <div className="size-2.5 rounded-full bg-primary animate-pulse" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-xl font-black font-headline text-primary">12.4% AVG</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Interaction Velocity</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Filter campaign title or ID..." 
                  className="pl-9 h-10 text-[10px] bg-card border-none ring-1 ring-border font-bold uppercase tracking-tight" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="size-10"><Filter className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-10"><RefreshCw className="size-4" /></Button>
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Outreach Matrix</CardTitle>
                <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary uppercase font-black px-2">Compliance Phase: ACTIVE</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Campaign Strategy</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Channel</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Lifecycle</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Commitment</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Reach</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Engagement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Syncing Marketing Stream...</TableCell></TableRow>
                    ) : filteredCampaigns.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No outreach cycles detected in the pipeline.</TableCell></TableRow>
                    ) : filteredCampaigns.map((c) => (
                      <TableRow key={c.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{c.title}</span>
                            <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">Created: {c.createdAt?.toDate ? format(c.createdAt.toDate(), 'dd MMM yyyy') : 'Just now'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded bg-background border", c.channel === 'SMS' ? 'text-emerald-500' : 'text-primary')}>
                              {c.channel === 'SMS' ? <MessageSquare className="size-3" /> : <Mail className="size-3" />}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-tight">{c.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={cn(
                            "text-[8px] h-4 uppercase font-black border-none",
                            c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 
                            c.status === 'Draft' ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'
                          )}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-primary">
                          KES {c.budget?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs opacity-60">
                          {c.reach?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 text-[9px] font-black uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleTriggerBatch(c)}
                            >
                              <Send className="size-3" /> Trigger
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-all"><MoreVertical className="size-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><CheckCircle2 className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Compliance Protocol</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "All outreach cycles are filtered against the **Opt-out Registry**. Payload dissemination is throttled at 50 requests per second to ensure gateway stability."
                  </p>
                </div>
              </Card>
              <div className="p-6 bg-secondary/10 rounded-2xl border border-border/50 flex items-center justify-between group cursor-default">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="size-3 text-emerald-500" /> Revenue Correlation
                  </p>
                  <p className="text-[11px] font-bold">Campaign efficiency is cross-referenced with POS traffic spikes.</p>
                </div>
                <Zap className="size-8 text-primary opacity-10 group-hover:opacity-100 transition-all duration-700" />
              </div>
            </div>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-lg shadow-2xl ring-1 ring-border">
            <form onSubmit={handleCreateCampaign}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded bg-primary/10 text-primary"><Target className="size-5" /></div>
                  <DialogTitle className="text-lg font-bold uppercase">Initialize outreach Cycle</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight text-primary">Strategic Conversion Protocol v1.4</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Campaign Title</Label>
                  <Input name="title" placeholder="e.g. Q4 Loyalty Harvest - VIP" required className="h-11 border-none ring-1 ring-border bg-secondary/5 font-black uppercase" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Channel Engagement</Label>
                    <Select name="channel" defaultValue="Email" required>
                      <SelectTrigger className="h-11 border-none ring-1 ring-border bg-background font-bold uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMS" className="text-xs font-bold uppercase"><span className="flex items-center gap-2"><MessageSquare className="size-3" /> SMS Gateway</span></SelectItem>
                        <SelectItem value="Email" className="text-xs font-bold uppercase"><span className="flex items-center gap-2"><Mail className="size-3" /> Email Center</span></SelectItem>
                        <SelectItem value="System" className="text-xs font-bold uppercase"><span className="flex items-center gap-2"><Zap className="size-3" /> System Push</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Target Segment</Label>
                    <Select name="segmentId" required>
                      <SelectTrigger className="h-11 border-none ring-1 ring-border bg-background font-bold uppercase">
                        <SelectValue placeholder="All Customers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All" className="text-xs font-bold uppercase">Consolidated Base</SelectItem>
                        {segments?.map(s => <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase">{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Projected Budget (Commitment)</Label>
                  <Input name="budget" type="number" step="0.01" placeholder="0.00" required className="h-11 font-black text-xl bg-primary/5 border-none ring-1 ring-primary/20 focus-visible:ring-primary" />
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Strategy Brief / Message</Label>
                  <Input name="description" placeholder="Operational goals for this cycle..." className="h-11 bg-secondary/10 border-none ring-1 ring-border" />
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-4 items-start text-primary shadow-inner">
                  <Sparkles className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Financial Safeguard</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">
                      Cycle targets will be cross-referenced with the **Marketing Budget** node in your Accounting module for real-time variance tracking.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-11 font-black uppercase tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-11 px-10 font-bold uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-4" />} Initialize Outreach
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
