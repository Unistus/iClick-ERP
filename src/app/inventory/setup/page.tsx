
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Settings, Save, Loader2, Info, Package, Factory, Scale } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function InventorySetupPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'inventory');
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
    formData.forEach((value, key) => updates[key] = value);

    try {
      await setDoc(setupRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSystemEvent(db, selectedInstId, user, 'INVENTORY', 'Update Setup', 'Inventory settings and account mappings were updated.');
      toast({ title: "Setup Saved", description: "Inventory workflows are now synchronized with accounting." });
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
              <Package className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Inventory Workflow</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Automation & Ledger Mappings</p>
            </div>
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
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure its inventory engine.</p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Factory className="size-5 text-primary" /> Logic & Valuation
                    </CardTitle>
                    <CardDescription>Define how the system values stock and triggers purchases.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Valuation Method</Label>
                      <Select name="valuationMethod" defaultValue={setup?.valuationMethod || "WeightedAverage"}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                          <SelectItem value="LIFO">LIFO (Last In, First Out)</SelectItem>
                          <SelectItem value="WeightedAverage">Weighted Average</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground italic">Weighted average is recommended for pharmacy/retail consumables.</p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Stock Deduction Trigger</Label>
                      <Select name="deductionTrigger" defaultValue={setup?.deductionTrigger || "SaleCompletion"}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SaleCompletion">On Sale Complete (Real-time)</SelectItem>
                          <SelectItem value="KitchenDispatch">On Kitchen/Bar Dispatch</SelectItem>
                          <SelectItem value="DailyReconcile">Daily Batch Reconcile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Scale className="size-5 text-accent" /> Financial Mapping
                    </CardTitle>
                    <CardDescription>Link inventory events to your Chart of Accounts nodes.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <AccountSelect 
                      name="inventoryAssetAccountId" 
                      label="Inventory Asset" 
                      description="Balance Sheet account tracking total stock value."
                      typeFilter={['Asset', 'Inventory']}
                    />
                    <AccountSelect 
                      name="cogsAccountId" 
                      label="Cost of Goods Sold" 
                      description="Expense account debited when items are sold."
                      typeFilter={['Expense', 'COGS']}
                    />
                    <AccountSelect 
                      name="inventoryShrinkageAccountId" 
                      label="Shrinkage & Write-offs" 
                      description="Expense account for damages or stolen stock."
                      typeFilter={['Expense']}
                    />
                    <AccountSelect 
                      name="inventoryAdjustmentAccountId" 
                      label="Adjustment Surplus/Deficit" 
                      description="Clearing account for physical count corrections."
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow bg-secondary/5">
                  <CardHeader>
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Automation Pulse</CardTitle>
                  </CardHeader>
                  <CardContent className="text-[11px] space-y-4 leading-relaxed">
                    <p>The "Automation King" engine uses these settings to maintain a pristine ledger.</p>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-emerald-500">Auto-Journaling Active</span>
                    </div>
                    <p className="opacity-60 italic">Ensure your COA nodes are 'Active' before committing these mappings.</p>
                  </CardContent>
                  <div className="p-6 border-t">
                    <Button type="submit" disabled={isSaving} className="w-full gap-2 h-10 font-bold uppercase text-[10px]">
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Inventory Config
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
