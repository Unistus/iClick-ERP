
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
  Activity,
  History,
  Calculator,
  ShieldCheck
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { Badge } from "@/components/ui/badge";
import { bootstrapInventoryFinancials } from '@/lib/inventory/inventory.service';

export default function InventorySetupPage() {
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

  const handleBootstrap = async () => {
    if (!selectedInstId) return;
    setIsBootstrapping(true);
    try {
      await bootstrapInventoryFinancials(db, selectedInstId);
      toast({ title: "Financial Nodes Synced", description: "Inventory asset, COGS, and shrinkage accounts created." });
    } catch (err) {
      toast({ variant: "destructive", title: "Bootstrap Failed" });
    } finally {
      setIsBootstrapping(false);
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
              <h1 className="text-2xl font-headline font-bold">Inventory Policy</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Automation & Ledger Mappings</p>
            </div>
          </div>
          
          <div className="flex gap-2">
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
            <Settings className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure supply chain logic.</p>
          </div>
        ) : (
          <Tabs defaultValue="automation" className="w-full">
            <TabsList className="bg-secondary/20 h-auto p-1 mb-6 flex-wrap justify-start gap-1 bg-transparent border-b rounded-none">
              <TabsTrigger value="automation" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><Factory className="size-3.5" /> Financial Integration</TabsTrigger>
              <TabsTrigger value="dictionaries" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><ListTree className="size-3.5" /> Structural Dictionaries</TabsTrigger>
              <TabsTrigger value="reasons" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10 rounded-none border-b-2 data-[state=active]:border-primary border-transparent"><History className="size-3.5" /> Correction Reasons</TabsTrigger>
            </TabsList>

            <TabsContent value="automation">
              <form onSubmit={handleSaveAutomation}>
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                      <CardHeader className="border-b border-border/50 bg-secondary/5">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Scale className="size-4 text-primary" /> Logic & Standards
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest">Valuation Method</Label>
                          <Select name="valuationMethod" defaultValue={setup?.valuationMethod || "WeightedAverage"}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIFO" className="text-xs">FIFO (First-In, First-Out)</SelectItem>
                              <SelectItem value="LIFO" className="text-xs">LIFO (Last-In, First-Out)</SelectItem>
                              <SelectItem value="WeightedAverage" className="text-xs">Weighted Average</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest">Stock Deduction Point</Label>
                          <Select name="deductionTrigger" defaultValue={setup?.deductionTrigger || "SaleCompletion"}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SaleCompletion" className="text-xs">Real-time on Sale</SelectItem>
                              <SelectItem value="KitchenDispatch" className="text-xs">On Kitchen/Bar Dispatch</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                      <CardHeader className="border-b border-border/50 bg-secondary/5">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Banknote className="size-4 text-accent" /> Ledger Mapping
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                        <AccountSelect name="inventoryAssetAccountId" label="Inventory Asset" description="Primary stock asset node." typeFilter={['Asset']} />
                        <AccountSelect name="cogsAccountId" label="COGS Account" description="Cost of Goods Sold expense node." typeFilter={['Expense']} />
                        <AccountSelect name="inventoryAdjustmentAccountId" label="Adjustment Node" description="Counter-entry for audit variances." />
                        <AccountSelect name="inventoryShrinkageAccountId" label="Shrinkage Node" description="Expense node for damages/theft." typeFilter={['Expense']} />
                      </CardContent>
                    </Card>
                  </div>
                  <div className="lg:col-span-4">
                    <Card className="border-none ring-1 ring-border shadow bg-secondary/5 h-full relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><ShieldCheck className="size-24 text-primary" /></div>
                      <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest">Engine Policy</CardTitle></CardHeader>
                      <CardContent className="space-y-4 relative z-10">
                        <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                          "These parameters govern how the Inventory engine interacts with the General Ledger. Changes will apply to all subsequent stock movements."
                        </p>
                        <Button type="submit" disabled={isSaving} className="w-full h-11 font-black uppercase text-[10px] gap-2 px-10 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                          {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Policy
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </form>
            </TabsContent>

            {/* Other tabs remain identical... */}
            <TabsContent value="dictionaries">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-none ring-1 ring-border bg-card shadow-xl overflow-hidden">
                  <CardHeader className="bg-secondary/10 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Tag className="size-4 text-primary" /> Global Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-secondary/5">
                      <form onSubmit={handleAddCategory} className="flex gap-2">
                        <Input name="name" placeholder="Category Name" required className="h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 px-4 font-bold uppercase text-[10px]"><Plus className="size-3 mr-1" /> Add</Button>
                      </form>
                    </div>
                    <Table>
                      <TableBody>
                        {categories?.map(cat => (
                          <TableRow key={cat.id} className="h-10 hover:bg-secondary/5 group">
                            <TableCell className="text-xs font-bold pl-6 uppercase tracking-tight">{cat.name}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'categories', cat.id))}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                    <Table>
                      <TableBody>
                        {uoms?.map(uom => (
                          <TableRow key={uom.id} className="h-10 hover:bg-secondary/5 group">
                            <TableCell className="text-xs font-bold pl-6 font-mono text-primary uppercase">{uom.code}</TableCell>
                            <TableCell className="text-xs uppercase opacity-60">{uom.name}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'institutions', selectedInstId, 'uoms', uom.id))}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reasons">
              {/* Adjustment reasons content here */}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
