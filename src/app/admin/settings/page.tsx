'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  ShieldCheck, 
  Server, 
  Database, 
  Globe, 
  Save, 
  Loader2, 
  Activity, 
  Zap, 
  Mail, 
  Lock,
  Smartphone
} from "lucide-react";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function GlobalSystemSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);

  // 1. Authorization: Only Super Admins can access this page
  const { isSuperAdmin, isLoading: authLoading } = usePermittedInstitutions();

  // 2. Data Fetching: Global System Node (Not institution dependent)
  const systemRef = useMemoFirebase(() => doc(db, 'system', 'config'), [db]);
  const { data: systemConfig, isLoading: configLoading } = useDoc(systemRef);

  const handleSave = async (category: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSuperAdmin || !systemRef) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates: any = {};
    formData.forEach((value, key) => {
      if (value === 'on') updates[key] = true;
      else if (value === 'off') updates[key] = false;
      else updates[key] = value;
    });

    try {
      await setDoc(systemRef, {
        [category]: {
          ...systemConfig?.[category],
          ...updates
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSystemEvent(db, "SYSTEM", user, 'SYSTEM', `Update Global ${category}`, `Global system settings for ${category} were modified.`);
      toast({ title: "System Configuration Updated", description: "Global changes deployed successfully." });
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed", description: "Access Denied: Root credentials required." });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="h-[70vh] flex flex-col items-center justify-center text-center gap-4">
          <Lock className="size-16 text-destructive opacity-20" />
          <h2 className="text-xl font-headline font-black uppercase tracking-tight">Root Access Required</h2>
          <p className="text-xs text-muted-foreground max-w-xs">This node manages the entire multi-tenant architecture and is restricted to Global Super Administrators.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10">
            <Server className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-headline font-bold text-foreground tracking-tight">System Console</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em] mt-1">Multi-Tenant Architecture Control (Root)</p>
          </div>
        </div>

        <Tabs defaultValue="infra" className="w-full">
          <TabsList className="bg-secondary/20 h-auto p-1 mb-8 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none w-full">
            <TabsTrigger 
              value="infra" 
              className="text-sm gap-2.5 px-8 py-3.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent uppercase font-bold tracking-widest transition-all"
            >
              <Globe className="size-4" /> Infrastructure
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="text-sm gap-2.5 px-8 py-3.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent uppercase font-bold tracking-widest transition-all"
            >
              <ShieldCheck className="size-4" /> Security Policy
            </TabsTrigger>
            <TabsTrigger 
              value="comms" 
              className="text-sm gap-2.5 px-8 py-3.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent uppercase font-bold tracking-widest transition-all"
            >
              <Mail className="size-4" /> Global Mail
            </TabsTrigger>
            <TabsTrigger 
              value="maintenance" 
              className="text-sm gap-2.5 px-8 py-3.5 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent uppercase font-bold tracking-widest transition-all"
            >
              <Activity className="size-4" /> Maintenance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="infra" className="space-y-6 animate-in fade-in duration-500">
            <form onSubmit={(e) => handleSave('infra', e)}>
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Global Environment Parameters</CardTitle>
                  <CardDescription className="text-[10px]">Defaults for new institution provisioning.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 grid gap-8 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">System Name</Label>
                    <Input name="systemName" defaultValue={systemConfig?.infra?.systemName || "iClick ERP"} className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Provisioning Region</Label>
                    <Input name="defaultRegion" defaultValue={systemConfig?.infra?.defaultRegion || "us-central1"} className="h-11 font-mono bg-secondary/5 border-none ring-1 ring-border" />
                  </div>
                </CardContent>
                <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                  <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90">
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Commit Changes
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 animate-in fade-in duration-500">
            <form onSubmit={(e) => handleSave('security', e)}>
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Root Security Policy</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between p-6 bg-secondary/5 rounded-3xl border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold uppercase tracking-tight">Strict Identity Verification</Label>
                      <p className="text-[10px] text-muted-foreground">Mandate 2FA for all Super Admin actions.</p>
                    </div>
                    <Switch name="strictAdminAuth" defaultChecked={systemConfig?.security?.strictAdminAuth} />
                  </div>
                  <div className="flex items-center justify-between p-6 bg-secondary/5 rounded-3xl border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold uppercase tracking-tight">Audit Log Retention (Days)</Label>
                      <Input name="logRetentionDays" type="number" defaultValue={systemConfig?.security?.logRetentionDays || 365} className="h-10 w-24 bg-background" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                  <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary">
                    <Save className="size-4" /> Save Security Node
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6 animate-in fade-in duration-500">
            <form onSubmit={(e) => handleSave('maintenance', e)}>
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b py-4 px-8">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">System Lifecycle Management</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600"><Zap className="size-6" /></div>
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-amber-600 tracking-widest">Global Maintenance Mode</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic">"Activating this will lock access for all institutions except Super Admins."</p>
                    </div>
                    <Switch name="maintenanceMode" defaultChecked={systemConfig?.maintenance?.maintenanceMode} className="ml-auto mt-2" />
                  </div>
                </CardContent>
                <CardFooter className="bg-secondary/5 border-t p-6 flex justify-end">
                  <Button type="submit" disabled={isSaving} className="h-11 px-10 font-black uppercase text-xs shadow-xl shadow-primary/40 bg-primary">
                    <Save className="size-4" /> Update Lifecycle
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
