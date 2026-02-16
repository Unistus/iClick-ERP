
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { format } from "date-fns";
import { 
  Building, 
  Plus, 
  Search, 
  TrendingDown, 
  Trash2, 
  RefreshCcw, 
  History, 
  ArrowUpRight,
  Monitor,
  Truck,
  Armchair,
  Home,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { registerFixedAsset, runDepreciation } from "@/lib/accounting/asset.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

const CATEGORY_ICONS: Record<string, any> = {
  Furniture: Armchair,
  Equipment: Monitor,
  Vehicles: Truck,
  Buildings: Home,
  Land: Building,
  Computers: Monitor,
};

export default function FixedAssetsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const assetsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'assets'), orderBy('updatedAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: assets, isLoading } = useCollection(assetsQuery);

  const coaQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'coa'), where('type', '==', 'Asset'), where('isActive', '==', true));
  }, [db, selectedInstId]);
  const { data: accounts } = useCollection(coaQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const totalAssetValue = assets?.reduce((sum, a) => sum + (a.currentValue || 0), 0) || 0;
  const totalDepreciation = assets?.reduce((sum, a) => sum + (a.accumulatedDepreciation || 0), 0) || 0;

  const handleCreateAsset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      category: formData.get('category') as string,
      purchaseDate: new Date(formData.get('purchaseDate') as string),
      purchasePrice: parseFloat(formData.get('purchasePrice') as string),
      salvageValue: parseFloat(formData.get('salvageValue') as string) || 0,
      usefulLifeYears: parseInt(formData.get('usefulLife') as string),
      depreciationMethod: formData.get('depreciationMethod') as any,
      assetAccountId: formData.get('assetAccountId') as string,
    };

    setIsCreateOpen(false);

    registerFixedAsset(db, selectedInstId, data).then(() => {
      logSystemEvent(db, selectedInstId, user, 'ACCOUNTING', 'Register Asset', `New asset '${data.name}' added to registry.`);
      toast({ title: "Asset Registered" });
    }).catch(err => {
      toast({ variant: "destructive", title: "Registration Failed", description: err.message });
    }).finally(() => setIsProcessing(false));
  };

  const handleRunDepreciation = (assetId: string, assetName: string) => {
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    runDepreciation(db, selectedInstId, assetId).then(() => {
      logSystemEvent(db, selectedInstId, user, 'ACCOUNTING', 'Run Depreciation', `Periodic depreciation posted for ${assetName}.`);
      toast({ title: "Depreciation Posted" });
    }).catch(err => {
      toast({ variant: "destructive", title: "Calculation Failed", description: err.message });
    }).finally(() => setIsProcessing(false));
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Building className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Fixed Assets</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Capital Asset Lifecycle</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Add Asset
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Building className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage capital assets.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Book Value</span>
                  <Building className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{currency} {totalAssetValue.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-accent">Accumulated Depreciation</span>
                  <TrendingDown className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold text-accent">{currency} {totalDepreciation.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Asset Count</span>
                  <Badge variant="outline" className="text-[9px] h-4 font-bold">{assets?.length || 0} ITEMS</Badge>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{assets?.filter(a => a.status === 'Active').length || 0} Active</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card">
              <CardHeader className="py-3 px-6 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search registry..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Button size="icon" variant="ghost" className="size-8"><RefreshCcw className="size-3.5" /></Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Asset / Code</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Purchase Date</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Cost</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Depreciation</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Book Value</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Lifecycle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs animate-pulse">Synchronizing registry...</TableCell></TableRow>
                    ) : !assets || assets.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground font-bold">No assets registered.</TableCell></TableRow>
                    ) : assets.map((asset) => {
                      const Icon = CATEGORY_ICONS[asset.category] || Building;
                      return (
                        <TableRow key={asset.id} className="h-14 hover:bg-secondary/5 transition-colors group border-b-border/30">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <Icon className="size-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">{asset.name}</span>
                                <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">{asset.code}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] font-medium">
                            {format(asset.purchaseDate.toDate(), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-[11px]">
                            {currency} {asset.purchasePrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-[11px] text-accent">
                            {currency} {asset.accumulatedDepreciation.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-[11px] text-primary">
                            {currency} {asset.currentValue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              {asset.status === 'Active' && asset.currentValue > asset.salvageValue && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 text-[9px] font-bold uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRunDepreciation(asset.id, asset.name)}
                                  disabled={isProcessing}
                                >
                                  <TrendingDown className="size-3" /> Depreciate
                                </Button>
                              )}
                              <Badge variant="outline" className="text-[9px] h-4 font-bold uppercase bg-background border-none ring-1 ring-border">
                                {asset.status}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Asset Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleCreateAsset}>
              <DialogHeader>
                <DialogTitle>Register Fixed Asset</DialogTitle>
                <CardDescription>Add physical capital to the institutional ledger.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset Name</Label>
                    <Input name="name" placeholder="e.g. Generator 50KVA" required className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Internal Reference Code</Label>
                    <Input name="code" placeholder="AST-001" required className="h-9 font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset Category</Label>
                    <Select name="category" required>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(CATEGORY_ICONS).map(cat => <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Acquisition Date</Label>
                    <Input name="purchaseDate" type="date" required className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cost ({currency})</Label>
                    <Input name="purchasePrice" type="number" step="0.01" required className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Salvage Value</Label>
                    <Input name="salvageValue" type="number" step="0.01" defaultValue="0" className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Useful Life (Yrs)</Label>
                    <Input name="usefulLife" type="number" min="1" required className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Depreciation Method</Label>
                    <Select name="depreciationMethod" defaultValue="Straight Line">
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Straight Line" className="text-xs">Straight Line</SelectItem>
                        <SelectItem value="Reducing Balance" className="text-xs">Reducing Balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ledger Node</Label>
                    <Select name="assetAccountId" required>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Account" /></SelectTrigger>
                      <SelectContent>
                        {accounts?.filter(a => a.subtype === 'Fixed Assets' || a.subtype === 'Current Assets').map(acc => (
                          <SelectItem key={acc.id} value={acc.id} className="text-xs">[{acc.code}] {acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="gap-2 h-10 font-bold uppercase text-xs px-8">
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Building className="size-4" />} Capitalize Asset
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
