
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
  Server
} from "lucide-react";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function SystemSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instCollectionRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null;
    return doc(db, 'institutions', selectedInstitutionId, 'settings', 'global');
  }, [db, selectedInstitutionId]);

  const { data: settings } = useDoc(settingsRef);

  const handleSave = async (category: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstitutionId) return;

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
      await setDoc(settingsRef!, {
        [category]: {
          ...currentCategoryData,
          ...updates
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSystemEvent(db, selectedInstitutionId, user, 'SETTINGS', `Update ${category}`, `Institutional settings for ${category} were modified.`);
      toast({ title: "Settings Saved", description: `${category.toUpperCase()} configuration has been deployed.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed", description: "You might not have permission to modify global settings." });
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
              <Settings className="size-5" />
            </div>
            <h1 className="text-2xl font-headline font-bold">Institutional Control</h1>
          </div>
          
          <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
            <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
              <SelectValue placeholder="Select Institution" />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Monitor className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure its environment.</p>
          </div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-wrap justify-start gap-1">
              <TabsTrigger value="general" className="text-xs gap-2"><Globe className="size-3.5" /> General</TabsTrigger>
              <TabsTrigger value="pos" className="text-xs gap-2"><ShoppingCart className="size-3.5" /> POS</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs gap-2"><CreditCard className="size-3.5" /> Payments</TabsTrigger>
              <TabsTrigger value="sms" className="text-xs gap-2"><MessageSquare className="size-3.5" /> SMS</TabsTrigger>
              <TabsTrigger value="email" className="text-xs gap-2"><Mail className="size-3.5" /> Email Center</TabsTrigger>
              <TabsTrigger value="branding" className="text-xs gap-2"><Palette className="size-3.5" /> Branding</TabsTrigger>
              <TabsTrigger value="maintenance" className="text-xs gap-2"><Database className="size-3.5" /> Maintenance</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <form onSubmit={(e) => handleSave('general', e)}>
                <Card className="border-none ring-1 ring-border shadow-xl">
                  <CardHeader>
                    <CardTitle>Regional & Fiscal</CardTitle>
                    <CardDescription>Core institutional defaults for accounting and localization.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Operational Timezone</Label>
                        <Select name="timezone" defaultValue={settings?.general?.timezone || "Africa/Nairobi"}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Africa/Nairobi">Nairobi (GMT+3)</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Fiscal Year Start</Label>
                        <Select name="fiscalYearStart" defaultValue={settings?.general?.fiscalYearStart || "January"}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="January">January 1st</SelectItem>
                            <SelectItem value="July">July 1st</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit" disabled={isSaving} className="w-fit gap-2 h-9 px-6 font-bold uppercase text-[10px]">
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit General
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="pos">
              <form onSubmit={(e) => handleSave('pos', e)}>
                <Card className="border-none ring-1 ring-border shadow-xl">
                  <CardHeader>
                    <CardTitle>Terminal Behavior</CardTitle>
                    <CardDescription>Configure how point-of-sale stations operate at this institution.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 py-2 border rounded-lg p-4 bg-secondary/10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Require Customer for Sale</Label>
                          <p className="text-[10px] text-muted-foreground">Force staff to select/create a customer before closing any sale.</p>
                        </div>
                        <Switch name="requireCustomerForSale" defaultChecked={settings?.pos?.requireCustomerForSale} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Auto-Print Receipts</Label>
                          <p className="text-[10px] text-muted-foreground">Trigger print dialog immediately upon transaction completion.</p>
                        </div>
                        <Switch name="printReceiptOnComplete" defaultChecked={settings?.pos?.printReceiptOnComplete} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Allow Manual Discounts</Label>
                          <p className="text-[10px] text-muted-foreground">Allow staff to override prices with ad-hoc discounts.</p>
                        </div>
                        <Switch name="allowCustomDiscounts" defaultChecked={settings?.pos?.allowCustomDiscounts} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Receipt Footer Message</Label>
                      <Textarea 
                        name="receiptFooter" 
                        defaultValue={settings?.pos?.receiptFooter}
                        placeholder="Thank you for shopping with us! No returns after 24h."
                        className="min-h-[80px] text-xs bg-secondary/5"
                      />
                    </div>
                    <Button type="submit" className="w-fit gap-2 h-9 px-6 font-bold uppercase text-[10px]">
                      <Save className="size-3" /> Commit POS Config
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="payments">
              <form onSubmit={(e) => handleSave('gateways', e)}>
                <Card className="border-none ring-1 ring-border shadow-xl">
                  <CardHeader>
                    <CardTitle>Financial Gateways</CardTitle>
                    <CardDescription>Connect M-Pesa STK Push and card processing services.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-primary flex items-center gap-2">
                        <CheckCircle2 className="size-3" /> M-Pesa Integration (Safaricom)
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Consumer Key</Label>
                          <Input name="mpesaConsumerKey" defaultValue={settings?.gateways?.mpesaConsumerKey} className="h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Consumer Secret</Label>
                          <Input name="mpesaConsumerSecret" type="password" defaultValue={settings?.gateways?.mpesaConsumerSecret} className="h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Till/Paybill</Label>
                          <Input name="mpesaShortcode" defaultValue={settings?.gateways?.mpesaShortcode} className="h-8 text-xs font-mono" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-xs font-bold text-blue-500 flex items-center gap-2">
                        <CreditCard className="size-3" /> Card Processor (Stripe/Pesapal)
                      </h3>
                      <div className="space-y-1.5 max-w-md">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Public/Client Key</Label>
                        <Input name="stripePublicKey" defaultValue={settings?.gateways?.stripePublicKey} className="h-8 text-xs font-mono" />
                      </div>
                    </div>
                    <Button type="submit" className="w-fit gap-2 h-9 px-6 font-bold uppercase text-[10px]">
                      <Save className="size-3" /> Commit Gateways
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="sms">
              <form onSubmit={(e) => handleSave('comms', e)}>
                <Card className="border-none ring-1 ring-border shadow-xl">
                  <CardHeader>
                    <CardTitle>SMS Gateway</CardTitle>
                    <CardDescription>Configure bulk messaging provider for receipts and alerts.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>SMS Provider</Label>
                        <Select name="smsProvider" defaultValue={settings?.comms?.smsProvider || "AfricasTalking"}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AfricasTalking">Africa's Talking</SelectItem>
                            <SelectItem value="Twilio">Twilio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Provider API Key</Label>
                        <Input name="smsApiKey" type="password" defaultValue={settings?.comms?.smsApiKey} className="h-9 text-xs font-mono" />
                      </div>
                    </div>
                    <Button type="submit" className="w-fit gap-2 h-9 px-6 font-bold uppercase text-[10px]">
                      <Save className="size-3" /> Commit SMS Setup
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="email">
              <form onSubmit={(e) => handleSave('comms', e)}>
                <Card className="border-none ring-1 ring-border shadow-xl">
                  <CardHeader>
                    <CardTitle>SMTP & Mail Gateway</CardTitle>
                    <CardDescription>Configure the system to send emails directly using institutional mail servers.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>From Name / Entity</Label>
                        <Input name="emailFromAddress" defaultValue={settings?.comms?.emailFromAddress} placeholder="e.g. iClick Nairobi Accounts" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-2">
                        <Label>Service Provider</Label>
                        <Select name="emailProvider" defaultValue={settings?.comms?.emailProvider || "SMTP"}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SMTP">Custom SMTP</SelectItem>
                            <SelectItem value="SendGrid">SendGrid API</SelectItem>
                            <SelectItem value="Resend">Resend API</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="p-4 bg-secondary/10 rounded-lg border space-y-4">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                        <Server className="size-3.5" /> Connection Parameters
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold opacity-60">SMTP HOST</Label>
                          <Input name="smtpHost" defaultValue={settings?.comms?.smtpHost} placeholder="smtp.gmail.com" className="h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold opacity-60">SMTP PORT</Label>
                          <Input name="smtpPort" type="number" defaultValue={settings?.comms?.smtpPort} placeholder="465" className="h-8 text-xs font-mono" />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <Switch name="smtpSecure" defaultChecked={settings?.comms?.smtpSecure} />
                          <Label className="text-[10px] font-bold opacity-60">USE SSL/TLS</Label>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold opacity-60">AUTH USERNAME</Label>
                          <Input name="smtpUser" defaultValue={settings?.comms?.smtpUser} placeholder="erp@company.com" className="h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold opacity-60">AUTH PASSWORD</Label>
                          <Input name="smtpPass" type="password" defaultValue={settings?.comms?.smtpPass} className="h-8 text-xs font-mono" />
                        </div>
                      </div>
                    </div>

                    <Button type="submit" className="w-fit gap-2 h-9 px-6 font-bold uppercase text-[10px]">
                      <Save className="size-3" /> Save SMTP Setup
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="branding">
              <form onSubmit={(e) => handleSave('branding', e)}>
                <Card className="border-none ring-1 ring-border shadow-xl">
                  <CardHeader>
                    <CardTitle>Theme & Visual Identity</CardTitle>
                    <CardDescription>Customize the ERP interface to match institution colors.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Primary Brand Color</Label>
                        <div className="flex gap-2">
                          <Input name="primaryColor" defaultValue={settings?.branding?.primaryColor || "#008080"} className="h-9 text-xs font-mono uppercase" />
                          <div className="size-9 rounded border shrink-0" style={{ backgroundColor: settings?.branding?.primaryColor || '#008080' }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Accent Action Color</Label>
                        <div className="flex gap-2">
                          <Input name="accentColor" defaultValue={settings?.branding?.accentColor || "#FF4500"} className="h-9 text-xs font-mono uppercase" />
                          <div className="size-9 rounded border shrink-0" style={{ backgroundColor: settings?.branding?.accentColor || '#FF4500' }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-8">
                        <Label>UI Compact Mode</Label>
                        <Switch name="compactMode" defaultChecked={settings?.branding?.compactMode} />
                      </div>
                    </div>
                    <Button type="submit" className="w-fit gap-2 h-9 px-6 font-bold uppercase text-[10px]">
                      <Save className="size-3" /> Apply Branding
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="maintenance">
              <form onSubmit={(e) => handleSave('maintenance', e)}>
                <Card className="border-none ring-1 ring-border shadow-xl">
                  <CardHeader>
                    <CardTitle>Data Integrity</CardTitle>
                    <CardDescription>Configure automated backup policies and data retention.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-start gap-3">
                      <Database className="size-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-amber-500">Database Consistency Check</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          iClick ERP automatically snapshots data hourly at the edge. These settings control secondary institutional archives for compliance.
                        </p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/10">
                        <div className="space-y-0.5">
                          <Label>Automated Cloud Backups</Label>
                          <p className="text-[10px] text-muted-foreground">Export full state to secure institutional bucket.</p>
                        </div>
                        <Switch name="autoBackup" defaultChecked={settings?.maintenance?.autoBackup} />
                      </div>
                      <div className="space-y-2">
                        <Label>Backup Frequency</Label>
                        <Select name="backupFrequency" defaultValue={settings?.maintenance?.backupFrequency || "Daily"}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Daily">Daily at 02:00 AM</SelectItem>
                            <SelectItem value="Weekly">Weekly (Sunday)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit" className="w-fit gap-2 h-9 px-6 font-bold uppercase text-[10px]">
                      <Save className="size-3" /> Commit Maintenance
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
