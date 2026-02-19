
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Settings, Save, Loader2, Info, Factory, ShoppingCart, Banknote, ShieldCheck, Calculator } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { bootstrapPurchasesFinancials } from '@/lib/purchases/purchases.service';

export default function PurchasesSetupPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'purchases');
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
      if (key === 'requireApprovedPO' || key === 'autoApproveGRN') {
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

      logSystemEvent(db, selectedInstId, user, 'PURCHASES', 'Update Setup', 'Institutional procurement parameters modified.');
      toast({ title: "Setup Parameters Saved" });
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBootstrap = async () => {
    if (!selectedInstId) return;
    setIsBootstrapping(true);
    try {
      await bootstrapPurchasesFinancials(db, selectedInstId);
      toast({ title: "Financial Nodes Synced", description: "Purchasing liability and tax accounts created." });
    } catch (err) {
      toast({ variant: "destructive", title: "Bootstrap Failed" });
    } finally {
      setIsBootstrapping(false);
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
          <SelectValue placeholder="Select Ledger Account" />
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
              <Settings className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Procurement Policy</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Automation & Vendor Controls</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 h-9 text-[10px] font-black uppercase border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5"
              disabled={!selectedInstId || isBootstrapping}
              onClick={handleBootstrap}
            >
              {isBootstrapping ? <Loader2 className="size-3 animate-spin" /> : <Calculator className="size-3" />} 
              Sync Financial Nodes
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Factory className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure its supply chain engine.</p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50 bg-secondary/5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <ShoppingCart className="size-4 text-primary" /> Fulfillment Workflows
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Stock Receipt Trigger</Label>
                      <Select name="receiptTrigger" defaultValue={setup?.receiptTrigger || "GRNCompletion"}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GRNCompletion">On physical GRN entry</SelectItem>
                          <SelectItem value="InvoiceBooking">On Vendor Invoice finalization</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] text-muted-foreground italic leading-tight">Determines at what point physical quantities are added to the vault.</p>
                    </div>
                    
                    <div className="space-y-6 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold">Strict PO Compliance</Label>
                          <p className="text-[10px] text-muted-foreground">Require approved PO for every GRN.</p>
                        </div>
                        <Switch name="requireApprovedPO" defaultChecked={setup?.requireApprovedPO} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold">Atomic GRN Approval</Label>
                          <p className="text-[10px] text-muted-foreground">Auto-receive items upon GRN entry.</p>
                        </div>
                        <Switch name="autoApproveGRN" defaultChecked={setup?.autoApproveGRN} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50 bg-secondary/5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Banknote className="size-4 text-accent" /> Ledger Integration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <AccountSelect 
                      name="accountsPayableAccountId" 
                      label="Accounts Payable" 
                      description="Default liability node for supplier debt." 
                      typeFilter={['Liability']} 
                    />
                    <AccountSelect 
                      name="purchaseTaxAccountId" 
                      label="Input VAT Account" 
                      description="Account for tracking deductible tax on purchases." 
                      typeFilter={['Asset', 'Liability']} 
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4">
                <Card className="border-none ring-1 ring-border shadow bg-secondary/5 h-full">
                  <CardHeader>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-500" /> Procurement Engine
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-[11px] leading-relaxed opacity-70">
                      Institutional procurement parameters govern the financial and physical arrival of assets. Ensure your General Ledger mappings are verified before committing changes.
                    </p>
                    <Button type="submit" disabled={isSaving} className="w-full h-11 font-bold uppercase text-[10px] gap-2 shadow-lg shadow-primary/20">
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
