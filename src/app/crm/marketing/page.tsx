
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
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
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createMarketingCampaign } from "@/lib/crm/crm.service";
import { toast } from "@/hooks/use-toast";

export default function MarketingHubPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const campaignsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'campaigns'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: campaigns, isLoading } = useCollection(campaignsQuery);

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
    };

    try {
      await createMarketingCampaign(db, selectedInstId, data);
      toast({ title: "Campaign Ready", description: "Overture phase initialized." });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Campaign Error" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner">
              <Target className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Marketing Center</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Outreach & Conversion Engine</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
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

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Campaign
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Target className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to deploy marketing logic.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Reach</span>
                  <Users className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">14,250 USERS</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Success Rate</span>
                  <TrendingUp className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-emerald-500">12.4%</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Budget Cap</span>
                  <Zap className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold uppercase">Monitoring</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Active Campaigns</CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter text-primary bg-primary/5 border-primary/20">Operational</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Campaign Title</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Channel</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Allocated</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Management</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Polling Marketing Cloud...</TableCell></TableRow>
                    ) : campaigns?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No active outreach cycles.</TableCell></TableRow>
                    ) : campaigns?.map((c) => (
                      <TableRow key={c.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6 font-bold text-xs uppercase tracking-tight">{c.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {c.channel === 'SMS' ? <MessageSquare className="size-3.5 text-emerald-500" /> : <Mail className="size-3.5 text-primary" />}
                            <span className="text-[10px] font-bold uppercase">{c.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[8px] h-4 uppercase font-black bg-emerald-500/10 text-emerald-500 border-none">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black">KES {c.budget?.toLocaleString()}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Button size="sm" variant="ghost" className="h-8 text-[9px] font-black uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                            <Send className="size-3" /> Trigger Batch
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreateCampaign}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="size-5 text-primary" />
                  <DialogTitle>Raise Marketing Campaign</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight">Outreach Strategy Hub</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Campaign Title</Label>
                  <Input name="title" placeholder="e.g. Q4 Loyalty Discount" required className="h-10 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Engagement Channel</Label>
                    <Select name="channel" defaultValue="Email">
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMS">SMS Gateway</SelectItem>
                        <SelectItem value="Email">Email Center</SelectItem>
                        <SelectItem value="System">App Notifications</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Projected Budget</Label>
                    <Input name="budget" type="number" step="0.01" placeholder="0.00" required className="h-10 font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Overture Message / Content</Label>
                  <Input name="description" placeholder="Short description of the campaign goal..." className="h-10" />
                </div>
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex gap-3 items-start">
                  <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    This campaign will be cross-referenced with your <strong>Marketing Budget</strong> node in the Accounting module for variance tracking.
                  </p>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-10 font-bold uppercase">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 px-10 font-bold uppercase text-xs shadow-xl shadow-primary/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Sparkles className="size-3 mr-2" />} Initialize Strategy
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
