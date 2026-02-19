'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { 
  Percent, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Ticket, 
  Zap, 
  Calendar, 
  TrendingUp, 
  MousePointer2, 
  MoreVertical,
  ArrowRight,
  ShieldCheck,
  Tag,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createPromoCode, updatePromoStatus } from "@/lib/crm/crm.service";
import { toast } from "@/hooks/use-toast";
import { format, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { getNextSequence } from "@/lib/sequence-service";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function PromoManagerPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Data Fetching: Permitted Institutions
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 2. Data Fetching: Promo Codes Registry
  const promosQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'promo_codes'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: promos, isLoading } = useCollection(promosQuery);

  // 3. Data Fetching: Institutional Settings (Currency)
  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // Aggregates
  const activeCount = promos?.filter(p => p.status === 'Active').length || 0;
  const totalRedemptions = promos?.reduce((sum, p) => sum + (p.redemptionCount || 0), 0) || 0;
  const avgDiscount = promos?.length ? promos.reduce((sum, p) => sum + (p.value || 0), 0) / promos.length : 0;

  const handleCreatePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    let code = formData.get('code') as string;

    // AUTOMATION KING: Secure Sequencing
    if (!code) {
      try {
        code = await getNextSequence(db, selectedInstId, 'promo_code');
      } catch (err) {
        // Fallback safety
        code = `PR-${Date.now().toString().slice(-6)}`;
      }
    }

    const data = {
      code: code.toUpperCase(),
      type: formData.get('type') as 'Percentage' | 'Fixed',
      value: parseFloat(formData.get('value') as string) || 0,
      minOrder: parseFloat(formData.get('minOrder') as string) || 0,
      maxDiscount: parseFloat(formData.get('maxDiscount') as string) || 0,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      status: 'Active',
    };

    setIsCreateOpen(false); // Snappy close

    try {
      await createPromoCode(db, selectedInstId, data);
      toast({ title: "Promo Code Deployed", description: `Rule ${data.code} is now live.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Deployment Error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = (promoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
    updatePromoStatus(db, selectedInstId, promoId, newStatus);
    toast({ title: `Promo ${newStatus}` });
  };

  const filteredPromos = promos?.filter(p => 
    p.code?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Percent className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Promo Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Discount Logic & Yield Governance</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Code
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Ticket className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage promotional yield logic.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* KPI Performance Section */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Offers</span>
                  <Zap className="size-3.5 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-foreground/90">{activeCount} RULES</div>
                  <div className="flex items-center gap-1.5 mt-1 text-emerald-500 font-bold text-[9px] uppercase tracking-tighter">
                    <TrendingUp className="size-3" /> Live Precision
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Global Redemptions</span>
                  <MousePointer2 className="size-3.5 text-accent opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-accent">{totalRedemptions.toLocaleString()} USES</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Interaction Volume</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Average Yield</span>
                  <TrendingUp className="size-3.5 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-emerald-500">{avgDiscount.toFixed(1)}% AVG</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Margin Contribution</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10"><Clock className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Expiring Window</span>
                  <div className="size-2.5 rounded-full bg-primary animate-pulse" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-xl font-black font-headline text-primary">4 CRITICAL</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Next 7 Days</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find code or rule ID..." 
                  className="pl-9 h-10 text-[10px] bg-card border-none ring-1 ring-border font-bold uppercase tracking-tight" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="size-10"><Filter className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-10" onClick={() => toast({ title: "Refreshing Vault" })}><RefreshCw className="size-4" /></Button>
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Discount Matrix</CardTitle>
                <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary uppercase font-black px-2">Yield Protection: ENABLED</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Promo Code</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Offer Logic</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Lifecycle</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Validity Window</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Redemptions</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Polling Discount Registry...</TableCell></TableRow>
                    ) : filteredPromos.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No promotional rules defined in the directory.</TableCell></TableRow>
                    ) : filteredPromos.map((p) => {
                      const isExpired = isBefore(new Date(p.endDate), new Date());
                      return (
                        <TableRow key={p.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-primary font-mono">{p.code}</span>
                              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">ID: {p.id.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-foreground/90">{p.value}{p.type === 'Percentage' ? '%' : ` ${currency}`} OFF</span>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold">Min Order: {currency} {p.minOrder}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className={cn(
                              "text-[8px] h-4 uppercase font-black border-none",
                              isExpired ? 'bg-destructive/10 text-destructive' : 
                              p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'
                            )}>
                              {isExpired ? 'Expired' : p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                              <Calendar className="size-3 opacity-50" />
                              <span>{format(new Date(p.startDate), 'dd MMM')} — {format(new Date(p.endDate), 'dd MMM yy')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-black text-primary">
                            {p.redemptionCount?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 text-[9px] font-black uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
                                onClick={() => handleToggleStatus(p.id, p.status)}
                                disabled={isExpired}
                              >
                                {p.status === 'Active' ? <XCircle className="size-3" /> : <CheckCircle2 className="size-3" />} 
                                {p.status === 'Active' ? 'Pause' : 'Activate'}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-all"><MoreVertical className="size-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs gap-2"><Tag className="size-3.5" /> View Campaigns</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs gap-2"><ArrowRight className="size-3.5" /> Performance Stats</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-xs gap-2 text-destructive"><XCircle className="size-3.5" /> Terminate Rule</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><ShieldCheck className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Yield Guard Protocol</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Promotional logic is validated at the point of POS finalization. The system cross-references **Minimum Order Values** and **Expiry Windows** in real-time to prevent margin leakage."
                  </p>
                </div>
              </Card>
              <div className="p-6 bg-secondary/10 rounded-2xl border border-border/50 flex items-center justify-between group cursor-default">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <LayoutGrid className="size-3 text-emerald-500" /> Multi-Tenant Silo
                  </p>
                  <p className="text-[11px] font-bold leading-tight">Discount codes are strictly unique per legal entity.</p>
                </div>
                <Zap className="size-8 text-primary opacity-10 group-hover:opacity-100 transition-all duration-700" />
              </div>
            </div>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-lg shadow-2xl ring-1 ring-border">
            <form onSubmit={handleCreatePromo}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded bg-primary/10 text-primary"><Tag className="size-5" /></div>
                  <DialogTitle className="text-lg font-bold uppercase">Initialize Discount Rule</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight text-primary">Marginal Yield Protection v2.1</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Promo Code (Unique)</Label>
                  <Input name="code" placeholder="Leave empty for auto-seq" className="h-11 border-none ring-1 ring-border bg-secondary/5 font-black uppercase font-mono text-lg text-primary tracking-widest" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Discount Strategy</Label>
                    <Select name="type" defaultValue="Percentage" required>
                      <SelectTrigger className="h-11 border-none ring-1 ring-border bg-background font-bold uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Percentage" className="text-xs font-bold uppercase">Percentage (%)</SelectItem>
                        <SelectItem value="Fixed" className="text-xs font-bold uppercase">Fixed Amount ({currency})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Offer Value</Label>
                    <Input name="value" type="number" step="0.01" placeholder="0.00" required className="h-11 font-black text-xl bg-primary/5 border-none ring-1 ring-primary/20" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Min. Spend Threshold</Label>
                    <Input name="minOrder" type="number" step="0.01" defaultValue="0" className="h-11 bg-secondary/10 border-none ring-1 ring-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Max Discount Cap</Label>
                    <Input name="maxDiscount" type="number" step="0.01" defaultValue="0" className="h-11 bg-secondary/10 border-none ring-1 ring-border" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Start Date</Label>
                    <Input name="startDate" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required className="h-11 bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Expiry Date</Label>
                    <Input name="endDate" type="date" required className="h-11 bg-background" />
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-4 items-start text-primary shadow-inner">
                  <Sparkles className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Revenue Integrity</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">
                      Automated yield protection will fetch from <strong>Admin > Doc Numbering</strong> if code is left empty.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-11 font-black uppercase tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-11 px-10 font-bold uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-4" />} Deploy Rule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
