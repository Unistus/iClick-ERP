'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  Palette, 
  Globe, 
  Mail, 
  Save, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck,
  Server,
  Activity,
  User,
  Settings
} from "lucide-react";
import { useDoc, useFirestore, useMemoFirebase, useUser, useCollection } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function InstitutionProfilePage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

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

      logSystemEvent(db, selectedInstId, user, 'SETTINGS', `Update ${category}`, `Institution profile for ${category} was modified.`);
      toast({ title: "Settings Saved", description: `${category.toUpperCase()} configuration has been deployed.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Building2 className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">Entity Profile</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Branding, Localization & Identity</p>
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
            <Settings className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to configure its visual and regional parameters.</p>
          </div>
        ) : (
          <Tabs defaultValue="branding" className="w-full">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-8 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none w-full">
              <TabsTrigger value="branding" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent font-bold uppercase"><Palette className="size-3.5" /> Visual Branding</TabsTrigger>
              <TabsTrigger value="localization" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent font-bold uppercase"><Globe className="size-3.5" /> Localization</TabsTrigger>
              <TabsTrigger value="email" className="text-xs gap-2 px-6 py-3 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent font-bold uppercase"><Mail className="size-3.5" /> Comms (SMTP)</TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="mt-0 animate-in fade-in duration-500">
              <form onSubmit={(e) => handleSave('branding', e)}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Institutional Identity</CardTitle>
                    <CardDescription className="text-[10px]">Customize the ERP interface to align with brand guidelines.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="grid md:grid-cols-2 gap-12">
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
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary">
                      <Save className="size-4" /> Commit Branding
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="localization" className="mt-0 animate-in fade-in duration-500">
              <form onSubmit={(e) => handleSave('general', e)}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Localization & Fiscal Cycles</CardTitle>
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
                      <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Base Currency Symbol</Label>
                      <Input name="currencySymbol" defaultValue={settings?.general?.currencySymbol || "KES"} className="h-11 font-bold bg-secondary/5" />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary">
                      <Save className="size-4" /> Save Region Node
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="email" className="mt-0 animate-in fade-in duration-500">
              <form onSubmit={(e) => handleSave('comms', e)}>
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Institutional SMTP</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase opacity-40">SMTP Host</Label>
                        <Input name="smtpHost" defaultValue={settings?.comms?.smtpHost} placeholder="smtp.gmail.com" className="h-10 text-xs font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase opacity-40">Port Node</Label>
                        <Input name="smtpPort" type="number" defaultValue={settings?.comms?.smtpPort} placeholder="465" className="h-10 text-xs font-mono" />
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <Switch name="smtpSecure" defaultChecked={settings?.comms?.smtpSecure} />
                        <Label className="text-[9px] font-black uppercase opacity-40">Enable SSL/TLS</Label>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase opacity-40">Auth Principal (User)</Label>
                        <Input name="smtpUser" defaultValue={settings?.comms?.smtpUser} className="h-10 text-xs font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase opacity-40">Auth Secret (Pass)</Label>
                        <Input name="smtpPass" type="password" defaultValue={settings?.comms?.smtpPass} className="h-10 text-xs font-mono" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary">
                      <Save className="size-4" /> Save Comms Node
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
