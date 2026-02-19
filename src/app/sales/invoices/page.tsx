
'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { format } from "date-fns";
import { 
  FileText, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Wallet, 
  CreditCard, 
  Loader2,
  Tag,
  Hash,
  Calculator,
  Zap,
  History,
  MoreVertical,
  ArrowRight,
  Gift,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createSalesInvoice, finalizeInvoice, type SalesItem } from "@/lib/sales/sales.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { cn } from '@/lib/utils';

export default function SalesInvoicesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [items, setItems] = useState<SalesItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'Credit' | 'Cash' | 'Bank'>('Cash');
  const [issueGiftCard, setIssueGiftCard] = useState(false);
  const [giftCardAmount, setGiftCardAmount] = useState(0);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const invoicesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'sales_invoices'), orderBy('createdAt', 'desc'), limit(50));
  }, [db, selectedInstId]);
  const { data: invoices, isLoading } = useCollection(invoicesQuery);

  const productsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'products');
  }, [db, selectedInstId]);
  const { data: products } = useCollection(productsRef);

  // CRM Incentives Logic
  const crmSetupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'crm');
  }, [db, selectedInstId]);
  const { data: crmSetup } = useDoc(crmSetupRef);

  const promosRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'promo_codes');
  }, [db, selectedInstId]);
  const { data: promos } = useCollection(promosRef);

  const handleAddItem = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    setItems(prev => [...prev, {
      productId: product.id,
      name: product.name,
      qty: 1,
      price: product.basePrice || 0,
      total: product.basePrice || 0,
      taxAmount: (product.basePrice || 0) * 0.16 
    }]);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const taxTotal = subtotal * 0.16;
    return { subtotal, taxTotal, total: subtotal + taxTotal };
  }, [items]);

  // TIERED QUALIFICATION LOGIC
  const qualifiedPromo = useMemo(() => {
    if (!crmSetup?.autoAssignPromo || !crmSetup?.incentiveRules || crmSetup.incentiveRules.length === 0) return null;
    
    // Sort rules by threshold descending to find the HIGHEST qualifying one
    const sortedRules = [...crmSetup.incentiveRules].sort((a, b) => b.threshold - a.threshold);
    
    const winningRule = sortedRules.find(rule => totals.total >= rule.threshold);
    
    if (winningRule) {
      return promos?.find(p => p.id === winningRule.promoId);
    }
    return null;
  }, [totals.total, crmSetup, promos]);

  const handleSaveDraft = async () => {
    if (!selectedInstId || !user || isProcessing) return;
    setIsProcessing(true);

    try {
      await createSalesInvoice(db, selectedInstId, {
        customerId: `CUST-${Date.now()}`,
        customerName,
        items,
        ...totals,
        paymentMethod,
        issueGiftCard,
        giftCardAmount: issueGiftCard ? giftCardAmount : 0,
        appliedPromoId: qualifiedPromo?.id
      }, user.uid);

      logSystemEvent(db, selectedInstId, user, 'SALES', 'Create Invoice', `Invoice for ${customerName} initiated. Tiered Promo: ${qualifiedPromo?.code || 'None'}`);
      toast({ title: "Invoice Record Created" });
      setIsCreateOpen(false);
      setItems([]);
      setCustomerName("");
      setIssueGiftCard(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Invoicing Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async (invoiceId: string) => {
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);
    try {
      await finalizeInvoice(db, selectedInstId, invoiceId);
      toast({ title: "Invoice Finalized", description: "Ledger updated and status locked." });
    } catch (err) {
      toast({ variant: "destructive", title: "Finalization Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary shadow-inner border border-primary/10">
              <FileText className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Institutional Billing</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Revenue Lifecycle Hub</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Validating..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Invoice
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Calculator className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground max-w-sm text-center">Select an institution to manage professional billing and autonomous rewards.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search invoice or customer..." className="pl-9 h-9 text-[10px] bg-secondary/20 border-none rounded-full" />
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 border-primary/20 px-3 h-7">
                    Audit Status: REAL-TIME
                  </Badge>
                  <Button variant="ghost" size="icon" className="size-9"><History className="size-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Invoice #</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Customer Entity</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Lifecycle</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Settlement</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Management</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-black uppercase tracking-widest opacity-50">Syncing sales ledgers...</TableCell></TableRow>
                    ) : invoices?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black opacity-30 italic">No invoices detected in this period.</TableCell></TableRow>
                    ) : invoices?.map((inv) => (
                      <TableRow key={inv.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] font-black text-primary uppercase">{inv.invoiceNumber}</span>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">{format(inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(), 'dd MMM yy HH:mm')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-black uppercase tracking-tight text-foreground/90">{inv.customerName}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-[8px] h-5 px-2 uppercase font-black border-none ring-1", 
                            inv.status === 'Draft' ? 'bg-secondary text-muted-foreground ring-border' : 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20'
                          )}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-xs font-black text-primary">KES {inv.total?.toLocaleString()}</span>
                            <span className="text-[8px] font-bold uppercase opacity-40">{inv.paymentMethod} Cycle</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            {inv.status === 'Draft' && (
                              <Button size="sm" variant="ghost" className="h-8 text-[10px] font-black uppercase gap-1.5 text-primary hover:bg-primary/10 transition-all" onClick={() => handleFinalize(inv.id)}>
                                <CheckCircle2 className="size-3.5" /> Post GL
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-9 opacity-0 group-hover:opacity-100 transition-all"><MoreVertical className="size-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Invoice Ops</DropdownMenuLabel>
                                <DropdownMenuItem className="text-xs gap-2"><ArrowRight className="size-3.5" /> View Details</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2"><History className="size-3.5" /> Audit Trail</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs gap-2 text-destructive"><Zap className="size-3.5" /> Force Void</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
          <DialogContent className="max-w-4xl overflow-y-auto max-h-[95vh] shadow-2xl ring-1 ring-border">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><FileText className="size-5" /></div>
                <DialogTitle className="text-xl font-headline font-bold">Register Sales Transaction</DialogTitle>
              </div>
              <CardDescription className="text-xs uppercase font-black tracking-tight text-primary">Institutional Invoicing v4.4</CardDescription>
            </DialogHeader>
            
            <div className="grid gap-8 py-6 text-xs lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Customer Identity</Label>
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Search or Type Client Name..." className="h-11 font-black bg-secondary/5" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Settlement Method</Label>
                    <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                      <SelectTrigger className="h-11 font-bold uppercase"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash" className="font-bold uppercase text-[10px]">Physical Cash</SelectItem>
                        <SelectItem value="Bank" className="font-bold uppercase text-[10px]">Direct Bank / M-Pesa</SelectItem>
                        <SelectItem value="Credit" className="font-bold uppercase text-[10px]">Credit Terms (A/R)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border rounded-2xl overflow-hidden shadow-inner bg-secondary/5 ring-1 ring-border">
                  <div className="p-4 bg-secondary/20 border-b flex justify-between items-center">
                    <span className="font-black uppercase text-[10px] tracking-[0.2em] text-primary">Line Specification</span>
                    <Select onValueChange={handleAddItem}>
                      <SelectTrigger className="w-64 h-10 border-none ring-1 ring-border bg-background text-[10px] font-bold uppercase">
                        <SelectValue placeholder="Add Catalog SKU..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map(p => <SelectItem key={p.id} value={p.id} className="text-xs font-bold uppercase">{p.name} (KES {p.basePrice?.toLocaleString()})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <Table>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow><TableCell className="text-center py-16 text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-30 italic">No billable lines detected.</TableCell></TableRow>
                        ) : items.map((item, idx) => (
                          <TableRow key={idx} className="h-14 border-b-border/30 hover:bg-transparent">
                            <TableCell className="pl-6">
                              <p className="text-xs font-black uppercase text-foreground/90">{item.name}</p>
                              <p className="text-[9px] font-mono text-muted-foreground">ID: {item.productId.slice(0, 8)}</p>
                            </TableCell>
                            <TableCell className="w-24">
                              <Input type="number" defaultValue={1} className="h-9 text-xs font-black text-center bg-background" />
                            </TableCell>
                            <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">
                              KES {item.price.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                {qualifiedPromo && (
                  <Card className="bg-primary/10 border-none ring-1 ring-primary/30 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
                    <CardHeader className="py-3 bg-primary/20 border-b border-primary/20">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary animate-pulse" />
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Tiered Reward Triggered</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl font-black font-headline text-primary">{qualifiedPromo.code}</span>
                        <Badge variant="secondary" className="text-[8px] bg-primary text-white border-none font-black">{qualifiedPromo.value}% OFF</Badge>
                      </div>
                      <p className="text-[10px] leading-relaxed text-muted-foreground font-medium italic">
                        "High-volume threshold breached. Maximum applicable discount tier assigned automatically."
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-none ring-1 ring-border bg-secondary/5 overflow-hidden">
                  <CardHeader className="py-3 bg-secondary/10 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Gift className="size-3.5 text-accent" /> Gift Asset
                      </span>
                      <Switch checked={issueGiftCard} onCheckedChange={setIssueGiftCard} />
                    </div>
                  </CardHeader>
                  {issueGiftCard && (
                    <CardContent className="pt-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold opacity-60">Initial Load Value</Label>
                        <Input 
                          type="number" 
                          value={giftCardAmount} 
                          onChange={(e) => setGiftCardAmount(parseFloat(e.target.value) || 0)}
                          className="h-9 font-black font-mono bg-background" 
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Card className="border-none ring-1 ring-primary/20 bg-primary/5 overflow-hidden shadow-2xl">
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase opacity-50">
                        <span>Net Valuation</span>
                        <span>KES {totals.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase opacity-50">
                        <span>Tax Index (16%)</span>
                        <span>KES {totals.taxTotal.toLocaleString()}</span>
                      </div>
                      <div className="pt-3 border-t border-primary/20 flex justify-between items-end">
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary pb-1">Final Settlement</span>
                        <div className="text-right">
                          <p className="text-3xl font-black font-headline text-foreground leading-none">
                            {totals.total.toLocaleString()}
                          </p>
                          <span className="text-[10px] font-mono font-bold opacity-40 uppercase">KES Total</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        disabled={isProcessing || items.length === 0} 
                        onClick={handleSaveDraft} 
                        className="w-full h-12 font-black uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3"
                      >
                        {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-5" />} 
                        Commit & Initialize Cycle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
