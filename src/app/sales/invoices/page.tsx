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
  ShieldCheck,
  AlertTriangle,
  Printer,
  Truck,
  Send,
  Trash2,
  ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createSalesInvoice, finalizeInvoice, type SalesItem } from "@/lib/sales/sales.service";
import { recordInvoicePayment } from "@/lib/accounting/receivable.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { cn } from '@/lib/utils';
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';

export default function SalesInvoicesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Form State for new invoice
  const [items, setItems] = useState<SalesItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<'Credit' | 'Cash' | 'Bank'>('Cash');
  const [issueGiftCard, setIssueGiftCard] = useState(false);
  const [giftCardAmount, setGiftCardAmount] = useState(0);
  const [manualDiscount, setManualDiscount] = useState<number>(0);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'customers'), where('status', '==', 'Active'));
  }, [db, selectedInstId]);
  const { data: activeCustomers } = useCollection(customersQuery);

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

  const coaRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'coa'), where('isActive', '==', true));
  }, [db, selectedInstId]);
  const { data: accounts } = useCollection(coaRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: globalSettings } = useDoc(settingsRef);

  const currency = globalSettings?.general?.currencySymbol || "KES";

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const taxTotal = subtotal * 0.16;
    const grossTotal = subtotal + taxTotal;
    const finalTotal = Math.max(0, grossTotal - manualDiscount);
    const discountPercent = grossTotal > 0 ? (manualDiscount / grossTotal) * 100 : 0;
    return { subtotal, taxTotal, grossTotal, total: finalTotal, discountPercent };
  }, [items, manualDiscount]);

  const requiresApproval = totals.discountPercent > 5;

  const handleAddItem = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;
    setItems(prev => [...prev, { productId: product.id, name: product.name, qty: 1, price: product.basePrice || 0, total: product.basePrice || 0, taxAmount: (product.basePrice || 0) * 0.16 }]);
  };

  const handleSaveDraft = async () => {
    if (!selectedInstId || !user || isProcessing) return;
    setIsProcessing(true);
    const customer = activeCustomers?.find(c => c.id === selectedCustomerId);
    try {
      await createSalesInvoice(db, selectedInstId, {
        customerId: selectedCustomerId,
        customerName: customer?.name || 'Unknown',
        items,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        paymentMethod,
        issueGiftCard,
        giftCardAmount: issueGiftCard ? giftCardAmount : 0,
        manualDiscount
      }, user.uid);
      toast({ title: requiresApproval ? "Queued for Approval" : "Invoice Recorded" });
      setIsCreateOpen(false);
      setItems([]);
      setSelectedCustomerId("");
    } catch (err) {
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
      toast({ title: "Ledger Synced", description: "Double-entry journal posted successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Finalization Failed", description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !selectedInvoice || isProcessing) return;
    setIsProcessing(true);
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const accountId = formData.get('paymentAccountId') as string;
    try {
      await recordInvoicePayment(db, selectedInstId, selectedInvoice.id, amount, accountId);
      toast({ title: "Collection Recorded" });
      setIsPaymentOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Payment Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-primary/20 text-primary shadow-inner border border-primary/10"><FileText className="size-5" /></div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Billing Center</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Revenue Lifecycle & AR Hub</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm"><SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} /></SelectTrigger>
              <SelectContent>{institutions?.map(i => <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-xl bg-primary" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}><Plus className="size-4" /> Issue Bill</Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[2.5rem] bg-secondary/5"><Calculator className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" /><p className="text-sm font-medium text-muted-foreground">Select an institution to access verified sales billing.</p></div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Sales Ledger</CardTitle>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Find invoice or identity..." className="pl-9 h-9 text-[10px] bg-secondary/20 border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" />
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Invoice Hub</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase">Recipient Member</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-center">Audit Stage</TableHead>
                    <TableHead className="h-12 text-[9px] font-black uppercase text-right">Settlement</TableHead>
                    <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Command</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black">Scanning Ledger Matrix...</TableCell></TableRow>
                  ) : invoices?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No historical movements detected.</TableCell></TableRow>
                  ) : invoices?.map((inv) => (
                    <TableRow key={inv.id} className="h-20 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-8">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-black text-primary uppercase">{inv.invoiceNumber}</span>
                          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">{format(inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(), 'dd MMM yy HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-black uppercase tracking-tight text-foreground/90">{inv.customerName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm", 
                          inv.status === 'Finalized' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                          inv.status === 'Pending Approval' ? 'bg-amber-500/10 text-amber-500 ring-amber-500/20 animate-pulse' : 
                          'bg-secondary text-muted-foreground ring-border'
                        )}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-xs font-black text-primary uppercase">{currency} {inv.total?.toLocaleString()}</span>
                          <Badge variant="outline" className="text-[7px] h-3.5 px-1 bg-background/50 border-none font-bold uppercase mt-1">{inv.paymentMethod}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-2">
                          {inv.status === 'Draft' && (
                            <Button size="sm" variant="ghost" className="h-9 px-4 text-[9px] font-black uppercase gap-2 text-primary hover:bg-primary/10 shadow-inner" onClick={() => handleFinalize(inv.id)}>
                              <CheckCircle2 className="size-3.5" /> Post Ledger
                            </Button>
                          )}
                          {inv.status === 'Finalized' && !inv.isPaid && (
                            <Button size="sm" variant="ghost" className="h-9 px-4 text-[9px] font-black uppercase gap-2 text-emerald-500 hover:bg-emerald-500/10" onClick={() => { setSelectedInvoice(inv); setIsPaymentOpen(true); }}>
                              <Wallet className="size-3.5" /> Collect
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><MoreVertical className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 shadow-2xl ring-1 ring-border">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground">Billing Command</DropdownMenuLabel>
                              <DropdownMenuItem className="text-xs gap-3 font-bold" onClick={() => router.push('/delivery/dispatch')}>
                                <Truck className="size-3.5 text-primary" /> Initialize Dispatch Note
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-3 font-bold">
                                <Printer className="size-3.5 text-accent" /> Print Official Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-3 font-bold">
                                <Send className="size-3.5 text-emerald-500" /> Share via Email/SMS
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs gap-3 font-bold">
                                <History className="size-3.5" /> View Audit Timeline
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs gap-3 font-bold text-destructive">
                                <Trash2 className="size-3.5" /> Void Identity Node
                              </DropdownMenuItem>
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
        )}

        {/* PAYMENT DIALOG */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2.5rem] overflow-hidden p-0 border-none">
            <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote className="size-32 rotate-12" /></div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner"><Wallet className="size-5" /></div>
                <div>
                  <DialogTitle className="text-lg font-black uppercase tracking-widest text-white">Record Collection</DialogTitle>
                  <p className="text-[10px] font-bold uppercase opacity-70">Settlement for {selectedInvoice?.invoiceNumber}</p>
                </div>
              </div>
              <div className="text-center relative z-10">
                <p className="text-[9px] font-black uppercase opacity-60 tracking-[0.4em] mb-2">Net Outstanding Balance</p>
                <p className="text-5xl font-black font-headline tracking-tighter">{currency} {selectedInvoice?.balance?.toLocaleString()}</p>
              </div>
            </div>
            <form onSubmit={handleRecordPayment} className="p-8 space-y-6 bg-card">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[10px] tracking-widest opacity-60 text-primary">Receiving Ledger Node</Label>
                  <Select name="paymentAccountId" required>
                    <SelectTrigger className="h-12 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-emerald-500"><SelectValue placeholder="Pick Bank/Cash Hub..." /></SelectTrigger>
                    <SelectContent>
                      {accounts?.filter(a => a.subtype === 'Cash & Bank' || a.subtype === 'M-Pesa Clearing').map(acc => (
                        <SelectItem key={acc.id} value={acc.id} className="text-[10px] font-black uppercase tracking-tight">[{acc.code}] {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Payment Amount</Label>
                  <Input name="amount" type="number" step="0.01" defaultValue={selectedInvoice?.balance} required className="h-12 font-black text-xl bg-secondary/5 border-none ring-1 ring-border focus:ring-emerald-500" />
                </div>
              </div>
              <DialogFooter className="pt-2 gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsPaymentOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Abort</Button>
                <Button type="submit" disabled={isProcessing} className="h-12 px-12 font-black uppercase text-[10px] shadow-2xl shadow-emerald-900/40 bg-emerald-600 hover:bg-emerald-700 gap-3 border-none ring-2 ring-emerald-500/20 transition-all active:scale-95 flex-1">
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Confirm Settlement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* CREATE DIALOG */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-4xl overflow-y-auto max-h-[95vh] shadow-2xl ring-1 ring-border rounded-[2rem] p-0 border-none">
            <form onSubmit={(e) => { e.preventDefault(); handleSaveDraft(); }}>
              <div className="bg-primary p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><FileText className="size-32 rotate-12" /></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner"><Calculator className="size-5" /></div>
                  <div>
                    <DialogTitle className="text-xl font-headline font-bold">Initialize Billing Cycle</DialogTitle>
                    <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Revenue Recognition Protocol v4.2</p>
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-8 bg-card">
                <div className="grid lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Identity Node</Label>
                        <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} required>
                          <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-primary"><SelectValue placeholder="Pick Member..." /></SelectTrigger>
                          <SelectContent>{activeCustomers?.map(c => <SelectItem key={c.id} value={c.id} className="text-[10px] font-black uppercase">{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase font-black text-[9px] tracking-widest opacity-60 text-primary">Settlement Phase</Label>
                        <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                          <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash" className="font-bold uppercase text-[10px]">Physical Cash</SelectItem>
                            <SelectItem value="Bank" className="font-bold uppercase text-[10px]">Bank / M-Pesa</SelectItem>
                            <SelectItem value="Credit" className="font-bold uppercase text-[10px]">Credit Terms (A/R)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="border rounded-2xl overflow-hidden shadow-inner bg-secondary/5 ring-1 ring-border">
                      <div className="p-4 bg-secondary/20 border-b flex justify-between items-center"><span className="font-black uppercase text-[10px] tracking-widest text-primary">Billable Lines Matrix</span><Select onValueChange={handleAddItem}><SelectTrigger className="w-64 h-10 border-none ring-1 ring-border bg-background text-[10px] font-black uppercase"><SelectValue placeholder="Add Catalog SKU..." /></SelectTrigger><SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase">{p.name}</SelectItem>)}</SelectContent></Select></div>
                      <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        <Table><TableBody>{items.length === 0 ? <TableRow><TableCell className="text-center py-16 text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-30 italic">No lines defined.</TableCell></TableRow> : items.map((item, idx) => (
                          <TableRow key={idx} className="h-14 border-b-border/30 hover:bg-transparent group transition-colors">
                            <TableCell className="pl-6"><p className="text-xs font-black uppercase text-foreground/90">{item.name}</p></TableCell>
                            <TableCell className="w-24"><Input type="number" defaultValue={1} className="h-9 text-xs font-black text-center bg-background border-none ring-1 ring-border" /></TableCell>
                            <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">KES {item.price.toLocaleString()}</TableCell>
                          </TableRow>))}</TableBody></Table>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-4 space-y-6">
                    <div className="p-6 rounded-3xl bg-secondary/5 border border-border/50 shadow-inner space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase opacity-50"><span>Base Value</span><span>KES {totals.grossTotal.toLocaleString()}</span></div>
                        <div className="flex justify-between text-[10px] font-black uppercase text-primary"><span>Manual Adjustment</span><span className="font-black">-{manualDiscount.toLocaleString()}</span></div>
                        <div className="pt-4 border-t border-border/50 flex justify-between items-end">
                          <span className="text-[11px] font-black uppercase tracking-widest text-primary pb-1">Final Total</span>
                          <div className="text-right"><p className="text-3xl font-black font-headline text-foreground tracking-tighter leading-none">{totals.total.toLocaleString()}</p><span className="text-[8px] font-mono font-bold opacity-40 uppercase">{currency} NET</span></div>
                        </div>
                      </div>
                      {requiresApproval && <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3 items-start animate-pulse"><ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" /><div className="space-y-1"><p className="text-[9px] font-black uppercase text-amber-600">Audit Required</p><p className="text-[10px] leading-tight text-muted-foreground italic">Discount exceeds institutional tolerance.</p></div></div>}
                      <Button onClick={handleSaveDraft} disabled={isProcessing || items.length === 0 || !selectedCustomerId} className={cn("w-full h-14 font-black uppercase text-xs shadow-2xl gap-3 rounded-2xl transition-all active:scale-95 border-none ring-2", requiresApproval ? "bg-amber-600 hover:bg-amber-700 ring-amber-500/20" : "bg-primary hover:bg-primary/90 ring-primary/20 shadow-primary/40")}>{isProcessing ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />} {requiresApproval ? "Queue for Audit" : "Authorize Cycle"}</Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
