'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Settings, Save, Loader2, Info, Truck, Zap, ShieldCheck, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function LogisticsSetupPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'logistics');
  }, [db, selectedInstId]);
  const { data: setup } = useDoc(setupRef);

  const warehousesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'warehouses');
  }, [db, selectedInstId]);
  const { data: warehouses } = useCollection(warehousesRef);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !setupRef) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates: any = {};
    formData.forEach((value, key) => {
      if (key === 'autoOptimization' || key === 'requireProofOfDelivery') {
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

      logSystemEvent(db, selectedInstId, user, 'LOGISTICS', 'Update Setup', 'Fulfillment policies modified.');
      toast({ title: "Logistics Setup Saved" });
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed" });
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
              <Truck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Fulfillment Policy</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Logistics & Resource Governance</p>
            </div>
          </div>
          
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
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Settings className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure logistics logic.</p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50 bg-secondary/5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Zap className="size-4 text-accent" /> Dispatch Workflow
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Primary Dispatch Warehouse</Label>
                      <Select name="defaultWarehouseId" defaultValue={setup?.defaultWarehouseId}>
                        <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Select Site..." /></SelectTrigger>
                        <SelectContent>
                          {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] text-muted-foreground italic">Target warehouse for automatic stock deduction during dispatch.</p>
                    </div>
                    
                    <div className="space-y-6 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold">Proof of Delivery</Label>
                          <p className="text-[10px] text-muted-foreground">Require photo or signature for trip confirmation.</p>
                        </div>
                        <Switch name="requireProofOfDelivery" defaultChecked={setup?.requireProofOfDelivery} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold">AI Route Optimization</Label>
                          <p className="text-[10px] text-muted-foreground">Enable predictive stop sequencing engine.</p>
                        </div>
                        <Switch name="autoOptimization" defaultChecked={setup?.autoOptimization} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50 bg-secondary/5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" /> Fleet Integrity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Max Stops per Route</Label>
                      <Input name="maxStopsPerRoute" type="number" defaultValue={setup?.maxStopsPerRoute || 10} className="h-9 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Idle Alert Threshold (Mins)</Label>
                      <Input name="idleAlertThreshold" type="number" defaultValue={setup?.idleAlertThreshold || 30} className="h-9 font-bold" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4">
                <Card className="border-none ring-1 ring-border shadow-xl bg-secondary/5 h-full">
                  <CardHeader>
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Fulfillment Engine</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12"><Zap className="size-12 text-primary" /></div>
                      <p className="text-[11px] leading-relaxed italic font-medium relative z-10">
                        "Institutional logistics parameters govern the physical transit of assets. Revenue recognition is tied directly to the Proof of Delivery event."
                      </p>
                    </div>
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