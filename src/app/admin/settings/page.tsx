
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings, 
  ShoppingCart, 
  CreditCard, 
  MessageSquare, 
  Mail, 
  Database, 
  Palette, 
  Save,
  Loader2,
  CheckCircle2,
  Globe,
  Monitor,
  ShieldCheck,
  Server,
  Activity
} from "lucide-react";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function SystemSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // 1. Authorization: Fetch permitted institutions
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 2. Data Fetching: Specific Settings Node
  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);

  const { data: settings, isLoading: settingsLoading } = useDoc(settingsRef);

  const handleSave = async (category: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !settingsRef) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const currentCategoryData = settings?.[category] || {};
    
    const updates: any = {};
    formData.forEach((value, key) => {
      if (value === 'on') updates[key] = true;
      else if (value === 'off') updates[key] = false;
      else updates[key] = value;
    });

    try {
      await setDoc(settingsRef, {
        [category]: {
          ...currentCategoryData,
          ...updates
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSystemEvent(db, selectedInstId, user, 'SETTINGS', `Update ${category}`, `Institutional settings for ${category} were modified.`);
      toast({ title: "Settings Saved", description: `${category.toUpperCase()} configuration has been deployed.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed", description: "You might not have permission to modify global settings." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Settings className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Control Panel</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Global Institutional Configuration & Policy</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[280px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder={instLoading ? "Validating Access..." : "Select Institution Node"} />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2rem] bg-secondary/5">
            <Monitor className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to configure its operational perimeter.</p>
          </div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-8 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none w-full">
              <TabsTrigger value="general" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Globe className="size-3.5" /> General</TabsTrigger>
              <TabsTrigger value="pos" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><ShoppingCart className="size-3.5" /> Terminal</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><CreditCard className="size-3.5" /> Gateways</TabsTrigger>
              <TabsTrigger value="email" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Mail className="size-3.5" /> Communications</TabsTrigger>
              <TabsTrigger value="branding" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Palette className="size-3.5" /> Identity</TabsTrigger>
              <TabsTrigger value="maintenance" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Database className="size-3.5" /> Persistence</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-0 animate-in fade-in duration-500">
              <form onSubmit={(e) => handleSave('general', e)}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Localization & Fiscal Cycles</CardTitle>
                    <CardDescription className="text-[10px]">Core institutional defaults for accounting and timezone management.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 grid gap-8 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Operational Timezone</Label>
                      <Select name="timezone" defaultValue={settings?.general?.timezone || "Africa/Nairobi"}>
                        <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border shadow-inner">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Africa/Nairobi" className="text-xs font-bold uppercase">Nairobi (GMT+3)</SelectItem>
                          <SelectItem value="UTC" className="text-xs font-bold uppercase">Universal UTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Fiscal Year Inception</Label>
                      <Select name="fiscalYearStart" defaultValue={settings?.general?.fiscalYearStart || "January"}>
                        <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border shadow-inner">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="January" className="text-xs font-bold uppercase">January 1st</SelectItem>
                          <SelectItem value="July" className="text-xs font-bold uppercase">July 1st</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 transition-all active:scale-95">
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Commit Localization
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="pos" className="mt-0 animate-in fade-in duration-500">
              <form onSubmit={(e) => handleSave('pos', e)}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Terminal Behavior</CardTitle>
                    <CardDescription className="text-[10px]">Configure how point-of-sale stations operate at this institution.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid gap-6 py-4 border-2 border-dashed rounded-[2rem] p-8 bg-secondary/5 shadow-inner">
                      <div className="flex items-center justify-between group">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold uppercase tracking-tight">Identity Enforcement</Label>
                          <p className="text-[10px] text-muted-foreground italic">Force staff to select/create a customer before closing any sale.</p>
                        </div>
                        <Switch name="requireCustomerForSale" defaultChecked={settings?.pos?.requireCustomerForSale} />
                      </div>
                      <div className="flex items-center justify-between group">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold uppercase tracking-tight">Immediate Printing</Label>
                          <p className="text-[10px] text-muted-foreground italic">Trigger print dialog immediately upon transaction completion.</p>
                        </div>
                        <Switch name="printReceiptOnComplete" defaultChecked={settings?.pos?.printReceiptOnComplete} />
                      </div>
                      <div className="flex items-center justify-between group border-t pt-6 border-border/50">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold uppercase tracking-tight">Ad-hoc Discounting</Label>
                          <p className="text-[10px] text-muted-foreground italic">Allow staff to override catalog prices with manual discounts.</p>
                        </div>
                        <Switch name="allowCustomDiscounts" defaultChecked={settings?.pos?.allowCustomDiscounts} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Legal Receipt Footer</Label>
                      <Textarea 
                        name="receiptFooter" 
                        defaultValue={settings?.pos?.receiptFooter}
                        placeholder="e.g. Thank you for shopping with us! No returns after 24h."
                        className="min-h-[100px] text-xs bg-secondary/5 font-medium border-none ring-1 ring-border"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 transition-all active:scale-95">
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Deploy Terminal Rules
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="payments" className="mt-0 animate-in fade-in duration-500">
              <form onSubmit={(e) => handleSave('gateways', e)}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Financial Gateways</CardTitle>
                    <CardDescription className="text-[10px]">Connect M-Pesa STK Push and card processing services.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2 tracking-[0.2em]">
                        <CheckCircle2 className="size-4" /> M-Pesa Integration (Safaricom)
                      </h3>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-60 tracking-widest">Consumer Key</Label>
                          <Input name="mpesaConsumerKey" defaultValue={settings?.gateways?.mpesaConsumerKey} className="h-10 text-xs font-mono bg-secondary/5 border-none ring-1 ring-border" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-60 tracking-widest">Consumer Secret</Label>
                          <Input name="mpesaConsumerSecret" type="password" defaultValue={settings?.gateways?.mpesaConsumerSecret} className="h-10 text-xs font-mono bg-secondary/5 border-none ring-1 ring-border" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-60 tracking-widest">Till/Paybill</Label>
                          <Input name="mpesaShortcode" defaultValue={settings?.gateways?.mpesaShortcode} className="h-10 text-xs font-mono bg-secondary/5 border-none ring-1 ring-border" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6 pt-8 border-t border-border/50">
                      <h3 className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2 tracking-[0.2em]">
                        <CreditCard className="size-4" /> Card Processor (Stripe/Pesapal)
                      </h3>
                      <div className="space-y-1.5 max-w-md">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-60 tracking-widest">Public/Client API Key</Label>
                        <Input name="stripePublicKey" defaultValue={settings?.gateways?.stripePublicKey} className="h-10 text-xs font-mono bg-secondary/5 border-none ring-1 ring-border" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 transition-all active:scale-95">
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Deploy Gateways
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="email" className="mt-0 animate-in fade-in duration-500">
              <form onSubmit={(e) => handleSave('comms', e)}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Communications Hub</CardTitle>
                    <CardDescription className="text-[10px]">Configure secure SMTP channels for receipts and institutional alerts.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Sender Name / Entity</Label>
                        <Input name="emailFromAddress" defaultValue={settings?.comms?.emailFromAddress} placeholder="e.g. iClick Nairobi Accounts" className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border" />
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Delivery Engine</Label>
                        <Select name="emailProvider" defaultValue={settings?.comms?.emailProvider || "SMTP"}>
                          <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SMTP" className="text-xs font-bold uppercase">Custom Institutional SMTP</SelectItem>
                            <SelectItem value="SendGrid" className="text-xs font-bold uppercase">SendGrid API Node</SelectItem>
                            <SelectItem value="Resend" className="text-xs font-bold uppercase">Resend API Node</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="p-8 bg-secondary/10 rounded-[2rem] border border-border/50 space-y-8 shadow-inner">
                      <div className="flex items-center gap-3 text-primary font-black text-[10px] uppercase tracking-[0.3em] pb-2 border-b border-primary/10">
                        <Server className="size-4" /> Transport Layer Parameters
                      </div>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase opacity-40">SMTP Host</Label>
                          <Input name="smtpHost" defaultValue={settings?.comms?.smtpHost} placeholder="smtp.gmail.com" className="h-10 text-xs font-mono bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase opacity-40">Port Node</Label>
                          <Input name="smtpPort" type="number" defaultValue={settings?.comms?.smtpPort} placeholder="465" className="h-10 text-xs font-mono bg-background" />
                        </div>
                        <div className="flex items-center gap-3 pt-6 group">
                          <Switch name="smtpSecure" defaultChecked={settings?.comms?.smtpSecure} />
                          <Label className="text-[9px] font-black uppercase opacity-40 group-hover:opacity-100 transition-opacity">Enable SSL/TLS</Label>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase opacity-40">Auth Principal (User)</Label>
                          <Input name="smtpUser" defaultValue={settings?.comms?.smtpUser} placeholder="erp@company.com" className="h-10 text-xs font-mono bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase opacity-40">Auth Secret (Pass)</Label>
                          <Input name="smtpPass" type="password" defaultValue={settings?.comms?.smtpPass} className="h-10 text-xs font-mono bg-background" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 transition-all active:scale-95">
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Deploy Communication Node
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="branding" className="mt-0 animate-in fade-in duration-500">
              <form onSubmit={(e) => handleSave('branding', e)}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Institutional Identity</CardTitle>
                    <CardDescription className="text-[10px]">Customize the ERP interface to align with brand guidelines.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="grid md:grid-cols-3 gap-12">
                      <div className="space-y-3">
                        <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Primary Brand Node</Label>
                        <div className="flex gap-3">
                          <Input name="primaryColor" defaultValue={settings?.branding?.primaryColor || "#008080"} className="h-12 font-black text-lg bg-secondary/5 border-none ring-1 ring-border uppercase font-mono" />
                          <div className="size-12 rounded-2xl border-2 border-white/10 shrink-0 shadow-lg" style={{ backgroundColor: settings?.branding?.primaryColor || '#008080' }} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Accent Action Node</Label>
                        <div className="flex gap-3">
                          <Input name="accentColor" defaultValue={settings?.branding?.accentColor || "#FF4500"} className="h-12 font-black text-lg bg-secondary/5 border-none ring-1 ring-border uppercase font-mono" />
                          <div className="size-12 rounded-2xl border-2 border-white/10 shrink-0 shadow-lg" style={{ backgroundColor: settings?.branding?.accentColor || '#FF4500' }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-6 rounded-[2rem] bg-primary/5 border border-primary/10 shadow-inner">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-black uppercase">UI Density</Label>
                          <p className="text-[9px] text-muted-foreground">Enable compact workspace mode.</p>
                        </div>
                        <Switch name="compactMode" defaultChecked={settings?.branding?.compactMode} />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 transition-all active:scale-95">
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Apply Brand Guidelines
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="maintenance" className="mt-0 animate-in fade-in duration-700">
              <form onSubmit={(e) => handleSave('maintenance', e)}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Data Persistence & Vaults</CardTitle>
                    <CardDescription className="text-[10px]">Configure automated backup cycles and cold-storage retention.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] flex items-start gap-4 shadow-inner">
                      <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600"><Database className="size-6" /></div>
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase text-amber-600 tracking-widest">Consistency Protocol active</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed italic font-medium">
                          "iClick ERP performs real-time shadowing of every transaction node. These settings control secondary institutional archives for labor and financial compliance."
                        </p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="flex items-center justify-between p-6 bg-secondary/5 border border-border/50 rounded-[2rem] shadow-inner">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold uppercase tracking-tight">Automated Cloud Snapshots</Label>
                          <p className="text-[10px] text-muted-foreground italic">Export full institutional state to encrypted cold-storage.</p>
                        </div>
                        <Switch name="autoBackup" defaultChecked={settings?.maintenance?.autoBackup} />
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Snapshot Frequency</Label>
                        <Select name="backupFrequency" defaultValue={settings?.maintenance?.backupFrequency || "Daily"}>
                          <SelectTrigger className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Daily" className="text-xs font-bold uppercase">Daily Cycle (02:00 AM)</SelectItem>
                            <SelectItem value="Weekly" className="text-xs font-bold uppercase">Weekly Deep Archive (Sun)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 transition-all active:scale-95">
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Commit Persistence Policy
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
