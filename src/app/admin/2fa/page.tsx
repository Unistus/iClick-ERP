
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  ShieldCheck, 
  Fingerprint, 
  Smartphone, 
  Mail, 
  ShieldAlert, 
  Zap, 
  Info,
  History,
  Lock,
  Loader2,
  Save,
  CheckCircle2
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function TwoFactorAuthPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Data Fetching: Institutions
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  // Data Fetching: 2FA Config
  const authRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'auth_policy');
  }, [db, selectedInstId]);
  const { data: policy } = useDoc(authRef);

  const handleSavePolicy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !authRef) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates: any = {};
    formData.forEach((value, key) => updates[key] = value === 'on');

    try {
      await setDoc(authRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSystemEvent(db, selectedInstId, user, 'SECURITY', 'Update 2FA Policy', 'Institutional multi-factor protocols were updated.');
      toast({ title: "Security Policy Deployed" });
    } catch (err) {
      toast({ variant: "destructive", title: "Policy Save Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Fingerprint className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Multi-Factor Control</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Identity Verification & MFA Protocols</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder="Select Institution" />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Fingerprint className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure its authentication perimeter.</p>
          </div>
        ) : (
          <form onSubmit={handleSavePolicy}>
            <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
              <div className="lg:col-span-8 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-500" /> Mandatory MFA Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid gap-6">
                      <div className="flex items-center justify-between p-4 border rounded-xl bg-secondary/5 group hover:ring-1 hover:ring-primary/20 transition-all">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold flex items-center gap-2">
                            <Lock className="size-3.5 text-primary" /> Enforce Global 2FA
                          </Label>
                          <p className="text-[10px] text-muted-foreground">Require all institutional staff to set up and use secondary verification.</p>
                        </div>
                        <Switch name="enforceGlobal" defaultChecked={policy?.enforceGlobal} />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-xl bg-secondary/5 group hover:ring-1 hover:ring-accent/20 transition-all">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold flex items-center gap-2">
                            <ShieldAlert className="size-3.5 text-accent" /> High-Risk Modules Only
                          </Label>
                          <p className="text-[10px] text-muted-foreground">Force 2FA challenge only when accessing Finance or Admin hubs.</p>
                        </div>
                        <Switch name="enforceHighRisk" defaultChecked={policy?.enforceHighRisk} />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Authorized Verification Channels</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                          <div className="flex items-center gap-2">
                            <Smartphone className="size-3.5 text-primary" />
                            <span className="text-[10px] font-bold uppercase">Authenticator App</span>
                          </div>
                          <Switch name="allowApp" defaultChecked={policy?.allowApp !== false} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                          <div className="flex items-center gap-2">
                            <Smartphone className="size-3.5 text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase">SMS OTP</span>
                          </div>
                          <Switch name="allowSMS" defaultChecked={policy?.allowSMS} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                          <div className="flex items-center gap-2">
                            <Mail className="size-3.5 text-accent" />
                            <span className="text-[10px] font-bold uppercase">Email PIN</span>
                          </div>
                          <Switch name="allowEmail" defaultChecked={policy?.allowEmail} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-4 items-start shadow-inner">
                  <ShieldCheck className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Security Pulse</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                      "MFA policies are evaluated at the login sequence and every 30 minutes thereafter. Session validation requires a 100% match against institutional policy."
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-secondary/5 h-full relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><Zap className="size-32 text-primary" /></div>
                  <CardHeader>
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Policy Engine</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                      "Updating these parameters will take effect immediately. Users currently logged in without 2FA will be prompted to enroll on their next dashboard refresh."
                    </p>
                    <Button type="submit" disabled={isSaving} className="w-full h-11 font-black uppercase text-[10px] gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Auth Policy
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
