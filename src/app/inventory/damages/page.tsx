'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { 
  Skull, 
  Plus, 
  Search, 
  AlertTriangle, 
  History, 
  Loader2, 
  Package,
  Warehouse,
  FileWarning,
  ShieldCheck,
  ShieldAlert,
  Zap,
  TrendingDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requestStockWriteOff } from "@/lib/inventory/inventory.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { cn } from '@/lib/utils';

export default function DamagesLossPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form Temp State for Governance Preview
  const [selectedProdId, setSelectedProdId] = useState("");
  const [lossQty, setLossQty] = useState(0);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

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

  const movementsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'movements'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [db, selectedInstId]);
  const { data: movements, isLoading } = useCollection(movementsQuery);

  const damageLogs = movements?.filter(m => m.type === 'Damage') || [];

  const lossInsight = useMemo(() => {
    const prod = products?.find(p => p.id === selectedProdId);
    if (!prod || lossQty <= 0) return null;
    const value = lossQty * (prod.costPrice || 0);
    return {
      value,
      requiresApproval: value > 10000
    };
  }, [selectedProdId, lossQty, products]);

  const handleLogDamage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing || !user) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const productId = formData.get('productId') as string;
    const qty = parseFloat(formData.get('quantity') as string);
    const reason = formData.get('reason') as string;

    try {
      const result = await requestStockWriteOff(db, selectedInstId, {
        productId,
        warehouseId: formData.get('warehouseId') as string,
        type: 'Damage',
        quantity: qty,
        reference: reason,
        unitCost: 0 
      }, user.uid);

      logSystemEvent(db, selectedInstId, user, 'INVENTORY', 'Log Damage', `Recorded loss attempt of ${qty} units for product ${productId}.`);
      
      if (lossInsight?.requiresApproval) {
        toast({ 
          variant: "destructive", 
          title: "Governance Guard Active", 
          description: `Loss value of KES ${lossInsight.value.toLocaleString()} exceeds threshold. Queued for approval.` 
        });
      } else {
        toast({ title: "Loss Recorded", description: "Ledger updated for shrinkage." });
      }
      
      setIsCreateOpen(false);
      setSelectedProdId("");
      setLossQty(0);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Logging Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-destructive/20 text-destructive shadow-inner border border-destructive/10">
              <Skull className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Damage & Write-offs</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Inventory Shrinkage & Asset Disposal</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-full md:w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" variant="destructive" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-destructive/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Log Loss
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-[2rem] bg-secondary/5">
            <Skull className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access loss records.</p>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-destructive/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Aggregate Shrinkage</span>
                  <Package className="size-3 text-destructive opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-destructive">{damageLogs.reduce((sum, m) => sum + Math.abs(m.quantity), 0).toLocaleString()} UNITS</div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Total Asset Loss</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Audit Nodes</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-primary">{damageLogs.length} EVENTS</div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Logged Incidents</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><ShieldCheck className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Compliance Hub</span>
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-xl font-black font-headline text-primary">ENFORCED</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Maker-Checker Active</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Pending Sign-off</span>
                  <Zap className="size-3 text-amber-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-amber-500">{damageLogs.filter(m => m.status === 'Pending').length} LOCKS</div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">High-Value Exceptions</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Loss Ledger</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8 text-muted-foreground">Timestamp</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-muted-foreground">Product Hub</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center text-muted-foreground">Governance Stage</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-right text-muted-foreground">Quantity</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase text-muted-foreground">Reason / Context</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Syncing loss records...</TableCell></TableRow>
                    ) : damageLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold opacity-30 italic">No write-offs on file.</TableCell></TableRow>
                    ) : damageLogs.map((m) => (
                      <TableRow key={m.id} className="h-16 hover:bg-destructive/5 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8 text-[10px] font-mono font-black text-muted-foreground uppercase">
                          {m.timestamp?.toDate ? format(m.timestamp.toDate(), 'dd MMM HH:mm') : '...'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{products?.find(p => p.id === m.productId)?.name || '...'}</span>
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Node: {warehouses?.find(w => w.id === m.warehouseId)?.name || '...'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm",
                            m.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 ring-amber-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-500'
                          )}>
                            {m.status === 'Pending' ? 'AWAITING AUTHORIZATION' : 'RECONCILED'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-destructive">
                          {Math.abs(m.quantity)} UNITS
                        </TableCell>
                        <TableCell className="text-right pr-8 text-[10px] italic text-muted-foreground truncate max-w-[250px]">
                          {m.reference}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2rem] overflow-hidden p-0 border-none">
            <form onSubmit={handleLogDamage}>
              <div className="bg-destructive p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Skull className="size-32 rotate-12" /></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner"><FileWarning className="size-5" /></div>
                  <div>
                    <DialogTitle className="text-lg font-black uppercase tracking-widest">Log Physical Loss</DialogTitle>
                    <p className="text-[10px] font-bold uppercase opacity-70">Asset Decommissioning Protocol</p>
                  </div>
                </div>
                
                {lossInsight && (
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md relative z-10 animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-black uppercase opacity-60 mb-1 tracking-widest">Estimated Impact</p>
                        <p className="text-2xl font-black font-headline tracking-tighter">KES {lossInsight.value.toLocaleString()}</p>
                      </div>
                      {lossInsight.requiresApproval && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/20 text-[8px] font-black uppercase tracking-tighter">
                          <Zap className="size-2.5 animate-pulse" /> GOVERNANCE LOCK
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 space-y-6 bg-card">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Target Catalog Item</Label>
                    <Select value={selectedProdId} onValueChange={setSelectedProdId} required>
                      <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-primary"><SelectValue placeholder="Pick Subject Node..." /></SelectTrigger>
                      <SelectContent>
                        {products?.filter(p => p.type === 'Stock').map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase tracking-tight">{p.name} (KES {p.costPrice})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Source Warehouse</Label>
                      <Select name="warehouseId" required>
                        <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5"><SelectValue placeholder="Storage Site" /></SelectTrigger>
                        <SelectContent>
                          {warehouses?.map(w => <SelectItem key={w.id} value={w.id} className="text-[10px] font-black uppercase">{w.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Write-off Quantity</Label>
                      <Input 
                        name="quantity" 
                        type="number" 
                        step="0.01" 
                        value={lossQty} 
                        onChange={(e) => setLossQty(parseFloat(e.target.value) || 0)}
                        required 
                        className="h-11 font-black bg-secondary/5 border-none ring-1 ring-border focus:ring-destructive" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-widest opacity-60">Factual Justification</Label>
                    <Input name="reason" placeholder="e.g. Chemical expiry, breakage in transit" required className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-start text-primary shadow-inner">
                  <ShieldCheck className="size-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Audit Handshake</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">Finalizing this event triggers an automatic Journal reversal: DR Shrinkage Expense, CR Inventory Asset.</p>
                  </div>
                </div>

                <DialogFooter className="pt-4 gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                  <Button 
                    type="submit" 
                    disabled={isProcessing || !selectedProdId || lossQty <= 0} 
                    className={cn(
                      "h-12 px-12 font-black uppercase text-[10px] shadow-2xl gap-3 border-none transition-all active:scale-95",
                      lossInsight?.requiresApproval ? "bg-amber-600 hover:bg-amber-700 shadow-amber-900/40" : "bg-destructive hover:bg-destructive/90 shadow-destructive/40"
                    )}
                  >
                    {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />} 
                    {lossInsight?.requiresApproval ? 'Queue for Approval' : 'Commit Write-off'}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
