
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { 
  Settings2, 
  Save, 
  Loader2, 
  Users, 
  Star, 
  Wallet, 
  Gift, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Sparkles,
  Tag,
  BadgeCent,
  Zap,
  TrendingUp,
  Info,
  Layers,
  History
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { Badge } from "@/components/ui/badge";

interface IncentiveRule {
  threshold: number;
  promoId: string;
}

export default function CRMSetupPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Dynamic Incentive Rules State
  const [incentiveRules, setIncentiveRules] = useState<IncentiveRule[]>([]);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const globalSettingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: globalSettings } = useDoc(globalSettingsRef);

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'crm');
  }, [db, selectedInstId]);
  const { data: setup } = useDoc(setupRef);

  const segmentsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'customer_segments');
  }, [db, selectedInstId]);
  const { data: segments } = useCollection(segmentsRef);

  const typesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'customer_types');
  }, [db, selectedInstId]);
  const { data: types } = useCollection(typesRef);

  const promosRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'promo_codes');
  }, [db, selectedInstId]);
  const { data: promos } = useCollection(promosRef);

  const currency = globalSettings?.general?.currencySymbol || "KES";

  // Sync incentive rules from setup
  useEffect(() => {
    if (setup?.incentiveRules) {
      setIncentiveRules(setup.incentiveRules);
    } else {
      setIncentiveRules([]);
    }
  }, [setup]);

  const handleSavePolicy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !setupRef) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates: any = {};
    formData.forEach((value, key) => {
      if (key === 'autoAwardPoints' || key === 'strictCreditControl' || key === 'autoAssignPromo') {
        updates[key] = value === 'on';
      } else if (key === 'pointsEarnRate' || key === 'defaultCreditLimit') {
        updates[key] = parseFloat(value as string) || 0;
      } else {
        updates[key] = value;
      }
    });

    // Add the dynamic rules to the update payload
    updates.incentiveRules = incentiveRules;

    try {
      await setDoc(setupRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSystemEvent(db, selectedInstId, user, 'CRM', 'Update Setup', 'Institutional CRM & Sales policies modified.');
      toast({ title: "Policies Deployed" });
    } catch (err) {
      toast({ variant: "destructive", title: "Deployment Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const addIncentiveRule = () => {
    setIncentiveRules(prev => [...prev, { threshold: 0, promoId: "" }]);
  };

  const updateIncentiveRule = (index: number, field: keyof IncentiveRule, value: any) => {
    const updated = [...incentiveRules];
    updated[index] = { ...updated[index], [field]: value };
    setIncentiveRules(updated);
  };

  const removeIncentiveRule = (index: number) => {
    setIncentiveRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSubItem = (col: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      createdAt: serverTimestamp()
    };
    addDocumentNonBlocking(collection(db, 'institutions', selectedInstId, col), data);
    e.currentTarget.reset();
    toast({ title: "Requirement Added" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Settings2 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">CRM Configuration</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Institutional Relationship Logic</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder="Select Institution" />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Sparkles className="size-16 text-muted-foreground opacity-10 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure CRM and Loyalty parameters.</p>
          </div>
        ) : (
          <Tabs defaultValue="loyalty" className="w-full">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none">
              <TabsTrigger value="loyalty" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Star className="size-3.5" /> Loyalty & Points</TabsTrigger>
              <TabsTrigger value="structure" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Users className="size-3.5" /> Customer Identity</TabsTrigger>
              <TabsTrigger value="financial" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Wallet className="size-3.5" /> Financial Policy</TabsTrigger>
              <TabsTrigger value="sales" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><TrendingUp className="size-3.5" /> Sales & Incentives</TabsTrigger>
            </TabsList>

            <TabsContent value="loyalty">
              <form onSubmit={handleSavePolicy}>
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                      <CardHeader className="border-b border-border/50 bg-secondary/10">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Star className="size-4 text-accent" /> Reward Parameters
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Points per 100 {currency} Spent</Label>
                          <Input name="pointsEarnRate" type="number" step="0.1" defaultValue={setup?.pointsEarnRate || 1} className="h-10 text-lg font-black bg-secondary/5" />
                          <p className="text-[9px] text-muted-foreground italic leading-tight">Standard institutional rate. Awarded on finalized invoices.</p>
                        </div>
                        <div className="space-y-6 pt-2">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold">Auto-Award Points</Label>
                              <p className="text-[10px] text-muted-foreground">Award points instantly on invoice finalization.</p>
                            </div>
                            <Switch name="autoAwardPoints" defaultChecked={setup?.autoAwardPoints} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="lg:col-span-4">
                    <Card className="border-none ring-1 ring-border shadow bg-primary/5 h-full relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><Sparkles className="size-24" /></div>
                      <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest">Loyalty Logic</CardTitle></CardHeader>
                      <CardContent className="space-y-4 relative z-10">
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          Define how your customers earn status. These rates are applied across POS and Sales modules automatically.
                        </p>
                        <Button type="submit" disabled={isSaving} className="w-full h-10 font-black uppercase text-[10px] gap-2 px-10 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                          {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Loyalty Rules
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="structure">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Tag className="size-4 text-primary" /> Customer Segments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-secondary/5">
                      <form onSubmit={(e) => handleAddSubItem('customer_segments', e)} className="flex gap-2">
                        <Input name="name" placeholder="Segment Name" required className="h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 px-4 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                      </form>
                    </div>
                    <Table>
                      <TableBody>
                        {segments?.map(s => (
                          <TableRow key={s.id} className="h-10 hover:bg-secondary/5 group">
                            <TableCell className="text-xs font-bold pl-6 uppercase tracking-tight">{s.name}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'customer_segments', s.id))}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Users className="size-4 text-accent" /> Profile Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-secondary/5">
                      <form onSubmit={(e) => handleAddSubItem('customer_types', e)} className="flex gap-2">
                        <Input name="name" placeholder="Type Name" required className="h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 px-4 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                      </form>
                    </div>
                    <Table>
                      <TableBody>
                        {types?.map(t => (
                          <TableRow key={t.id} className="h-10 hover:bg-secondary/5 group">
                            <TableCell className="text-xs font-bold pl-6 uppercase tracking-tight">{t.name}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'customer_types', t.id))}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="financial">
              <form onSubmit={handleSavePolicy}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50 bg-secondary/10">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <BadgeCent className="size-4 text-emerald-500" /> Trust & Credit Governance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Default Credit Limit ({currency})</Label>
                        <Input name="defaultCreditLimit" type="number" defaultValue={setup?.defaultCreditLimit || 0} className="h-10 font-bold bg-secondary/5" />
                        <p className="text-[9px] text-muted-foreground italic">Assigned automatically to new 'Approved' customers.</p>
                      </div>
                      <div className="space-y-6 pt-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-bold">Strict Credit Control</Label>
                            <p className="text-[10px] text-muted-foreground">Block invoices if balance exceeds customer limit.</p>
                          </div>
                          <Switch name="strictCreditControl" defaultChecked={setup?.strictCreditControl} />
                        </div>
                      </div>
                    </div>
                    <Button type="submit" disabled={isSaving} className="w-fit h-10 font-black uppercase text-[10px] gap-2 px-10 shadow-lg shadow-emerald-900/20 bg-emerald-600 hover:bg-emerald-700">
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />} Deploy Financial Policies
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="sales">
              <form onSubmit={handleSavePolicy}>
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                      <CardHeader className="border-b border-border/50 bg-secondary/10">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Zap className="size-4 text-primary" /> Tiered Incentive Matrix
                        </CardTitle>
                        <CardDescription className="text-[10px]">Configure multiple reward triggers based on invoice volume.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-bold">Enable Auto-Promotion</Label>
                            <p className="text-[10px] text-muted-foreground">Trigger rewards instantly when threshold is breached in Sales.</p>
                          </div>
                          <Switch name="autoAssignPromo" defaultChecked={setup?.autoAssignPromo} />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Reward Thresholds</Label>
                            <Button type="button" size="sm" variant="outline" className="h-7 text-[9px] font-bold uppercase gap-1.5" onClick={addIncentiveRule}>
                              <Plus className="size-3" /> Add Tier
                            </Button>
                          </div>

                          <div className="border rounded-xl bg-secondary/5 ring-1 ring-border overflow-hidden">
                            <Table>
                              <TableHeader className="bg-secondary/20">
                                <TableRow>
                                  <TableHead className="text-[10px] uppercase font-black pl-6">Min. Amount ({currency})</TableHead>
                                  <TableHead className="text-[10px] uppercase font-black">Applied Promo Rule</TableHead>
                                  <TableHead className="w-10"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {incentiveRules.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center py-12 text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-30 italic">
                                      No incentive tiers defined.
                                    </TableCell>
                                  </TableRow>
                                ) : incentiveRules.map((rule, idx) => (
                                  <TableRow key={idx} className="h-12 border-b-border/30">
                                    <TableCell className="pl-6">
                                      <Input 
                                        type="number" 
                                        value={rule.threshold} 
                                        onChange={(e) => updateIncentiveRule(idx, 'threshold', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs font-black bg-background border-none ring-1 ring-border w-32"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Select 
                                        value={rule.promoId} 
                                        onValueChange={(val) => updateIncentiveRule(idx, 'promoId', val)}
                                      >
                                        <SelectTrigger className="h-8 text-[10px] font-bold uppercase border-none ring-1 ring-border bg-background">
                                          <SelectValue placeholder="Select Promo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {promos?.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold uppercase">
                                              {p.code} ({p.value}{p.type === 'Percentage' ? '%' : ''} Off)
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="pr-4">
                                      <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => removeIncentiveRule(idx)}>
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="lg:col-span-4">
                    <Card className="border-none ring-1 ring-border shadow-xl bg-secondary/5 h-full relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><Zap className="size-24 text-primary" /></div>
                      <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest">Incentive Hub</CardTitle></CardHeader>
                      <CardContent className="space-y-4 relative z-10">
                        <div className="flex gap-3 items-start">
                          <Info className="size-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                            "Defining multiple thresholds allows for automated cross-selling. The system will automatically select the **highest qualifying tier** based on the invoice total."
                          </p>
                        </div>
                        <Button type="submit" disabled={isSaving} className="w-full h-11 font-black uppercase text-[10px] gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                          {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Sales Config
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
