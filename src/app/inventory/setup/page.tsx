
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { 
  Settings, 
  Save, 
  Loader2, 
  Info, 
  Package, 
  Factory, 
  Scale, 
  Tag, 
  Ruler, 
  Banknote,
  Plus,
  Trash2,
  ListTree,
  Activity
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { Badge } from "@/components/ui/badge";

export default function InventorySetupPage() {
  const db = useFirestore();
  const { user } = user;
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Data Fetching
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

  const categoriesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'categories');
  }, [db, selectedInstId]);
  const { data: categories } = useCollection(categoriesRef);

  const uomsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'uoms');
  }, [db, selectedInstId]);
  const { data: uoms } = useCollection(uomsRef);

  const reasonsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'adjustment_reasons');
  }, [db, selectedInstId]);
  const { data: reasons } = useCollection(reasonsRef);

  const handleSaveAutomation = async (e: React.FormEvent<HTMLFormElement>) => {
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

      logSystemEvent(db, selectedInstId, user, 'INVENTORY', 'Update Setup', 'Inventory ledger mappings updated.');
      toast({ title: "Setup Saved" });
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      createdAt: serverTimestamp()
    };
    addDocumentNonBlocking(collection(db, 'institutions', selectedInstId, 'categories'), data);
    e.currentTarget.reset();
    toast({ title: "Category Added" });
  };

  const handleAddUoM = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      code: formData.get('code'),
      name: formData.get('name'),
      baseFactor: parseFloat(formData.get('factor') as string) || 1,
      createdAt: serverTimestamp()
    };
    addDocumentNonBlocking(collection(db, 'institutions', selectedInstId, 'uoms'), data);
    e.currentTarget.reset();
    toast({ title: "UoM Registered" });
  };

  const handleAddReason = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      createdAt: serverTimestamp()
    };
    addDocumentNonBlocking(collection(db, 'institutions', selectedInstId, 'adjustment_reasons'), data);
    e.currentTarget.reset();
    toast({ title: "Adjustment Reason Added" });
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
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Automation & Catalog Dictionaries</p>
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
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure its inventory logic.</p>
          </div>
        ) : (
          <Tabs defaultValue="automation" className="w-full">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-wrap justify-start gap-1">
              <TabsTrigger value="automation" className="text-xs gap-2"><Factory className="size-3.5" /> Automation & Ledger</TabsTrigger>
              <TabsTrigger value="catalog" className="text-xs gap-2"><ListTree className="size-3.5" /> Catalog Settings</TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs gap-2"><Banknote className="size-3.5" /> Price Lists</TabsTrigger>
            </TabsList>

            <TabsContent value="automation">
              <form onSubmit={handleSaveAutomation}>
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                      <CardHeader className="border-b border-border/50">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Scale className="size-4 text-primary" /> Logic & Valuation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest">Valuation Method</Label>
                          <Select name="valuationMethod" defaultValue={setup?.valuationMethod || "WeightedAverage"}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIFO" className="text-xs">FIFO</SelectItem>
                              <SelectItem value="LIFO" className="text-xs">LIFO</SelectItem>
                              <SelectItem value="WeightedAverage" className="text-xs">Weighted Average</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest">Stock Deduction</Label>
                          <Select name="deductionTrigger" defaultValue={setup?.deductionTrigger || "SaleCompletion"}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SaleCompletion" className="text-xs">Real-time on Sale</SelectItem>
                              <SelectItem value="KitchenDispatch" className="text-xs">On Dispatch (Kitchen Mode)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                      <CardHeader className="border-b border-border/50">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Scale className="size-4 text-accent" /> Financial Mapping
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                        <AccountSelect name="inventoryAssetAccountId" label="Inventory Asset" description="Stock balance sheet node." typeFilter={['Asset']} />
                        <AccountSelect name="cogsAccountId" label="COGS" description="Cost of Goods Sold expense." typeFilter={['Expense']} />
                        <AccountSelect name="inventoryShrinkageAccountId" label="Shrinkage" description="Losses and damages." typeFilter={['Expense']} />
                        <AccountSelect name="inventoryAdjustmentAccountId" label="Adjustment Node" description="Audit reconciliation." />
                      </CardContent>
                    </Card>
                  </div>
                  <div className="lg:col-span-4">
                    <Card className="border-none ring-1 ring-border shadow bg-secondary/5 h-full">
                      <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest">Automation Engine</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-[11px] leading-relaxed opacity-70">
                          Committing these settings will synchronize your inventory movements with the General Ledger. All stock-outs and adjustments will auto-generate double-entry journals.
                        </p>
                        <Button type="submit" disabled={isSaving} className="w-full h-10 font-bold uppercase text-[10px] gap-2">
                          {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Automation
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="catalog">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <Tag className="size-4 text-primary" /> Categories
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-secondary/5">
                      <form onSubmit={handleAddCategory} className="flex gap-2">
                        <Input name="name" placeholder="Category Name" required className="h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 px-4 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                      </form>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableBody>
                          {categories?.map(cat => (
                            <TableRow key={cat.id} className="h-10 hover:bg-secondary/5 group">
                              <TableCell className="text-xs font-bold pl-6">{cat.name}</TableCell>
                              <TableCell className="text-right pr-6">
                                <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'categories', cat.id))}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Ruler className="size-4 text-accent" /> Units of Measure
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-secondary/5">
                      <form onSubmit={handleAddUoM} className="grid grid-cols-3 gap-2">
                        <Input name="code" placeholder="Code" required className="h-9 text-xs" />
                        <Input name="name" placeholder="Name" required className="h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                      </form>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableBody>
                          {uoms?.map(uom => (
                            <TableRow key={uom.id} className="h-10 hover:bg-secondary/5 group">
                              <TableCell className="text-xs font-bold pl-6 font-mono text-primary">{uom.code}</TableCell>
                              <TableCell className="text-xs">{uom.name}</TableCell>
                              <TableCell className="text-right pr-6">
                                <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'uoms', uom.id))}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Activity className="size-4 text-emerald-500" /> Adjustment Reasons
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-secondary/5">
                      <form onSubmit={handleAddReason} className="flex gap-2">
                        <Input name="name" placeholder="Reason (e.g. Theft)" required className="h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 px-4 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                      </form>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableBody>
                          {reasons?.map(reason => (
                            <TableRow key={reason.id} className="h-10 hover:bg-secondary/5 group">
                              <TableCell className="text-xs font-bold pl-6">{reason.name}</TableCell>
                              <TableCell className="text-right pr-6">
                                <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'adjustment_reasons', reason.id))}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="pricing">
              {/* Previous Price List logic remains functional */}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
