
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Settings, Save, Loader2, Info, ShoppingBag, BadgeCent, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function SalesSetupPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'sales');
  }, [db, selectedInstId]);

  const { data: setup } = useDoc(setupRef);

  const coaRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'coa');
  }, [db, selectedInstId]);

  const { data: accounts } = useCollection(coaRef);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !setupRef) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates: any = {};
    formData.forEach((value, key) => {
      if (key === 'autoPostInvoices' || key === 'requireOrderForInvoice') {
        updates[key] = value === 'on';
      } else {
        updates[key] = value;
      }
    });

    try {
      await setDoc(setupRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSystemEvent(db, selectedInstId, user, 'SALES', 'Update Setup', 'Institutional sales policies updated.');
      toast({ title: "Setup Saved", description: "Sales workflows now follow these parameters." });
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const AccountSelect = ({ name, label, description, typeFilter }: { name: string, label: string, description: string, typeFilter?: string[] }) => (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
        {label} <Info className="size-3 opacity-30" />
      </Label>
      <p className="text-[10px] text-muted-foreground leading-none mb-2">{description}</p>
      <Select name={name} defaultValue={setup?.[name]}>
        <SelectTrigger className="h-9 text-xs bg-secondary/10 border-none ring-1 ring-border">
          <SelectValue placeholder="Select Account" />
        </SelectTrigger>
        <SelectContent>
          {accounts?.filter(acc => !typeFilter || typeFilter.includes(acc.type) || typeFilter.includes(acc.subtype)).map(acc => (
            <SelectItem key={acc.id} value={acc.id} className="text-xs">
              [{acc.code}] {acc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <ShoppingBag className="size-5" />
            </div>
            <h1 className="text-2xl font-headline font-bold">Sales Configuration</h1>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs">
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
            <Settings className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure sales workflow logic.</p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" /> Workflow Policies
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Default Tax Rate (%)</Label>
                        <Input name="defaultTaxRate" type="number" step="0.01" defaultValue={setup?.defaultTaxRate || 16} className="h-9" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Standard Commission (%)</Label>
                        <Input name="commissionRate" type="number" step="0.01" defaultValue={setup?.commissionRate || 2.5} className="h-9" />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold">Strict Order Flow</Label>
                          <p className="text-[10px] text-muted-foreground">Require confirmed Sales Order for all Invoices.</p>
                        </div>
                        <Switch name="requireOrderForInvoice" defaultChecked={setup?.requireOrderForInvoice} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold">Auto-Post to GL</Label>
                          <p className="text-[10px] text-muted-foreground">Automatically finalize and post invoices on creation.</p>
                        </div>
                        <Switch name="autoPostInvoices" defaultChecked={setup?.autoPostInvoices} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <BadgeCent className="size-4 text-accent" /> Ledger Mapping
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <AccountSelect 
                      name="salesRevenueAccountId" 
                      label="Sales Revenue" 
                      description="Income account for product sales." 
                      typeFilter={['Income']} 
                    />
                    <AccountSelect 
                      name="accountsReceivableAccountId" 
                      label="Accounts Receivable" 
                      description="Asset node for pending customer payments." 
                      typeFilter={['Asset']} 
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4">
                <Card className="border-none ring-1 ring-border shadow bg-secondary/5 h-full">
                  <CardHeader>
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Pipeline Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-[11px] leading-relaxed opacity-70">
                      These settings govern the transitions from Quote to Order to Invoice. GL postings only occur at the Invoicing stage based on your mapping.
                    </p>
                    <Button type="submit" disabled={isSaving} className="w-full h-10 font-bold uppercase text-[10px] gap-2 px-10 shadow-lg shadow-primary/20">
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Configuration
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
