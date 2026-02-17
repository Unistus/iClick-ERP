'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { format, isBefore, addDays, isAfter, differenceInDays } from "date-fns";
import { 
  Timer, 
  Plus, 
  Search, 
  AlertTriangle, 
  History, 
  CheckCircle2, 
  Skull, 
  Package,
  Activity,
  ArrowUpRight,
  TrendingDown,
  Filter,
  RefreshCw,
  MoreVertical,
  Zap,
  BrainCircuit,
  Loader2,
  XCircle,
  ArrowRightLeft,
  Sparkles,
  Hash,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { registerInventoryBatch } from "@/lib/inventory/inventory.service";
import { aiInventoryLiquidation, type AiInventoryLiquidationOutput } from "@/ai/flows/ai-inventory-liquidation-flow";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { getNextSequence } from "@/lib/sequence-service";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function ExpiryControlPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Expired' | 'Critical' | 'Warning'>('All');

  // New Batch Form State for Predictive Expiry
  const [targetProductId, setTargetProductId] = useState<string>("");
  const [predictedExpiry, setPredictedExpiry] = useState<string>("");

  // AI Suggestion State
  const [aiResult, setAiResult] = useState<AiInventoryLiquidationOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedBatchForAi, setSelectedBatchForAi] = useState<any>(null);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const batchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'batches'), orderBy('expiryDate', 'asc'));
  }, [db, selectedInstId]);
  const { data: batches, isLoading } = useCollection(batchesQuery);

  const productsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'products');
  }, [db, selectedInstId]);
  const { data: products } = useCollection(productsRef);

  const warehousesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'warehouses');
  }, [db, selectedInstId]);
  const { data: warehouses } = useCollection(warehousesRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const now = new Date();
  const criticalThreshold = addDays(now, 30);
  const warningThreshold = addDays(now, 90);

  const filteredBatches = batches?.filter(b => {
    const expiry = b.expiryDate?.toDate();
    if (!expiry) return true;
    if (filter === 'Expired') return isBefore(expiry, now);
    if (filter === 'Critical') return isBefore(expiry, criticalThreshold) && isAfter(expiry, now);
    if (filter === 'Warning') return isBefore(expiry, warningThreshold) && isAfter(expiry, criticalThreshold);
    return true;
  }) || [];

  const handleProductChange = (productId: string) => {
    setTargetProductId(productId);
    const product = products?.find(p => p.id === productId);
    if (product?.shelfLifeDays) {
      const expiry = addDays(new Date(), product.shelfLifeDays);
      setPredictedExpiry(format(expiry, 'yyyy-MM-dd'));
    } else {
      setPredictedExpiry("");
    }
  };

  const handleTriggerAi = async (batch: any) => {
    setSelectedBatchForAi(batch);
    const prod = products?.find(p => p.id === batch.productId);
    if (!prod) return;

    setIsAiLoading(true);
    try {
      const res = await aiInventoryLiquidation({
        productName: prod.name,
        batchNumber: batch.batchNumber,
        quantityAtRisk: batch.quantity,
        daysToExpiry: differenceInDays(batch.expiryDate.toDate(), now),
        costPrice: prod.costPrice || 0,
        currentSellingPrice: prod.basePrice || 0,
      });
      setAiResult(res);
    } catch (e) {
      toast({ variant: "destructive", title: "AI Strategist Offline" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRegisterBatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    let batchNumber = formData.get('batchNumber') as string;

    // AUTOMATION KING: Auto-numbering for batches
    if (!batchNumber) {
      try {
        batchNumber = await getNextSequence(db, selectedInstId, 'batch_lot_number');
      } catch (err) {
        batchNumber = `LOT-${Date.now()}`;
      }
    }

    const data = {
      productId: targetProductId,
      warehouseId: formData.get('warehouseId') as string,
      batchNumber: batchNumber,
      expiryDate: new Date(formData.get('expiryDate') as string),
      quantity: parseFloat(formData.get('quantity') as string),
    };

    setIsCreateOpen(false);

    registerInventoryBatch(db, selectedInstId, data).then(() => {
      logSystemEvent(db, selectedInstId, user, 'INVENTORY', 'New Batch', `Batch ${data.batchNumber} registered.`);
      toast({ title: "Batch Logged", description: `Assigned LOT: ${data.batchNumber}` });
    }).catch(err => {
      toast({ variant: "destructive", title: "Registration Failed", description: err.message });
    }).finally(() => {
      setIsProcessing(false);
      setTargetProductId("");
      setPredictedExpiry("");
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Timer className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Expiry Control</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Regulatory Compliance Hub</p>
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
              <Plus className="size-4" /> New Batch
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Skull className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to monitor batch lifecycles.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1 tracking-wider">Total Batches</p>
                  <div className="text-lg font-bold">{batches?.length || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-destructive uppercase mb-1 tracking-wider">Expired</p>
                  <div className="text-lg font-bold text-destructive">{batches?.filter(b => isBefore(b.expiryDate?.toDate(), now)).length || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-amber-500 uppercase mb-1 tracking-wider">Critical (&lt;30D)</p>
                  <div className="text-lg font-bold text-amber-500">{batches?.filter(b => isBefore(b.expiryDate?.toDate(), criticalThreshold) && isAfter(b.expiryDate?.toDate(), now)).length || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm overflow-hidden">
                <CardContent className="pt-4">
                  <p className="text-[9px] font-bold text-primary uppercase mb-1 tracking-wider">Risk Exposure</p>
                  <div className="text-lg font-bold text-primary">Live Monitoring</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex gap-1 p-1 bg-secondary/20 rounded-lg w-fit">
                {(['All', 'Expired', 'Critical', 'Warning'] as const).map((s) => (
                  <Button 
                    key={s} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 px-4 text-[10px] font-bold uppercase tracking-wider ${filter === s ? 'bg-background shadow-sm text-primary' : 'opacity-50'}`}
                    onClick={() => setFilter(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Product / Batch</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold">Expiry Date</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Quantity</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Remediation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs uppercase font-bold animate-pulse">Syncing...</TableCell></TableRow>
                  ) : filteredBatches.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">Clean Slate.</TableCell></TableRow>
                  ) : filteredBatches.map((b) => {
                    const prod = products?.find(p => p.id === b.productId);
                    const expiry = b.expiryDate?.toDate();
                    const isExpired = isBefore(expiry, now);
                    const isCritical = isBefore(expiry, criticalThreshold) && !isExpired;

                    return (
                      <TableRow key={b.id} className="h-16 hover:bg-secondary/10 transition-colors group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{prod?.name || '...'}</span>
                            <span className="text-[9px] font-mono text-primary font-bold uppercase">LOT: {b.batchNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={`text-[11px] font-bold ${isExpired ? 'text-destructive' : isCritical ? 'text-amber-500' : ''}`}>
                              {expiry ? format(expiry, 'dd MMM yyyy') : 'N/A'}
                            </span>
                            <span className="text-[9px] text-muted-foreground uppercase font-medium">
                              {expiry ? (isExpired ? 'Expired' : `${differenceInDays(expiry, now)} Days Left`) : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{b.quantity?.toLocaleString()}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {isCritical && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-[9px] font-bold uppercase gap-1.5 border-primary/20 hover:bg-primary/10 text-primary"
                                onClick={() => handleTriggerAi(b)}
                              >
                                <BrainCircuit className="size-3" /> AI Liquidation
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8"><MoreVertical className="size-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="text-xs gap-2"><Skull className="size-3.5 text-destructive" /> Log Loss</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2"><ArrowRightLeft className="size-3.5 text-accent" /> Store Transfer</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* AI Suggestion Dialog */}
        <Dialog open={!!selectedBatchForAi} onOpenChange={(open) => !open && setSelectedBatchForAi(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded bg-primary/10 text-primary">
                  <BrainCircuit className="size-4" />
                </div>
                <DialogTitle className="text-sm font-bold uppercase tracking-wider">AI Remediation Plan</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Analyzing LOT: {selectedBatchForAi?.batchNumber} for {products?.find(p => p.id === selectedBatchForAi?.productId)?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {isAiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="size-8 animate-spin text-primary opacity-20" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground animate-pulse">Calculating Markdown Curve...</p>
                </div>
              ) : aiResult ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="p-4 bg-accent/5 rounded-xl border border-accent/10 relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <p className="text-[9px] font-bold text-accent uppercase tracking-[0.2em]">Target Markdown</p>
                        <p className="text-xl font-black font-headline mt-1">{aiResult.recommendedMarkdownPct}% OFF</p>
                      </div>
                      <Badge variant="outline" className={`h-5 text-[9px] font-black uppercase ${
                        aiResult.urgencyLevel === 'Critical' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-primary/10 text-primary'
                      }`}>
                        {aiResult.urgencyLevel} RISK
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="size-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Zap className="size-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Action King Recommendation</p>
                        <p className="text-sm font-bold leading-tight">{aiResult.suggestedAction}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <p className="text-[11px] leading-relaxed italic text-muted-foreground">
                        "{aiResult.strategicReason}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-2 border rounded bg-background/50">
                        <p className="text-[8px] font-bold uppercase opacity-50">Est. Recovery</p>
                        <p className="text-xs font-mono font-bold text-emerald-500">{currency} {aiResult.estimatedRecoveryValue.toLocaleString()}</p>
                      </div>
                      <div className="p-2 border rounded bg-background/50">
                        <p className="text-[8px] font-bold uppercase opacity-50">Units Remaining</p>
                        <p className="text-xs font-mono font-bold">{selectedBatchForAi.quantity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter className="grid grid-cols-2 gap-2">
              <Button variant="ghost" className="text-xs h-9 font-bold uppercase" onClick={() => setSelectedBatchForAi(null)}>Dismiss</Button>
              <Button disabled={!aiResult} className="text-xs h-9 font-bold uppercase bg-primary shadow-lg shadow-primary/20">
                Execute Flash Sale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Batch Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleRegisterBatch}>
              <DialogHeader>
                <DialogTitle>Log Batch Arrival</DialogTitle>
                <DialogDescription className="text-xs uppercase font-bold tracking-tight">Institutional Stock Receipt</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Target Product</Label>
                  <Select name="productId" onValueChange={handleProductChange} required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select Item" /></SelectTrigger>
                    <SelectContent>
                      {products?.filter(p => p.type === 'Stock').map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Hash className="size-3 text-primary" /> Batch / LOT #</Label>
                    <Input name="batchNumber" placeholder="Auto-generated" className="font-mono bg-secondary/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Calendar className="size-3 text-accent" /> Expiry Date</Label>
                    <Input name="expiryDate" type="date" defaultValue={predictedExpiry} required className="font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity Received</Label>
                    <Input name="quantity" type="number" step="0.01" required className="h-10 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Warehouse</Label>
                    <Select name="warehouseId" required>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Site" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex items-start gap-3">
                  <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <strong>Predictive Hub:</strong> Selecting a product will automatically set the expiry date based on its standard shelf life. Leaving LOT number blank will use the sequence from <strong>Admin &gt; Document Numbering</strong> settings.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs px-8">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Plus className="size-3 mr-2" />} Commit Batch
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
