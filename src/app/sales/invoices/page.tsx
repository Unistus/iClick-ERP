
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
  ArrowRight
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

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const taxTotal = subtotal * 0.16;
    return { subtotal, taxTotal, total: subtotal + taxTotal };
  };

  const handleSaveDraft = async () => {
    if (!selectedInstId || !user || isProcessing) return;
    setIsProcessing(true);

    const totals = calculateTotals();

    try {
      await createSalesInvoice(db, selectedInstId, {
        customerId: `CUST-${Date.now()}`,
        customerName,
        items,
        ...totals,
        paymentMethod
      }, user.uid);

      logSystemEvent(db, selectedInstId, user, 'SALES', 'Create Invoice', `Draft invoice for ${customerName} saved.`);
      toast({ title: "Draft Invoice Saved" });
      setIsCreateOpen(false);
      setItems([]);
      setCustomerName("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Drafting Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async (invoiceId: string) => {
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);
    try {
      await finalizeInvoice(db, selectedInstId, invoiceId);
      toast({ title: "Invoice Finalized", description: "Journal entries posted to GL." });
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
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Institutional Billing</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Revenue Lifecycle Hub</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Invoice
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Calculator className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage professional billing.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search invoice or customer..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter">Ledger Post Status: REAL-TIME</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Invoice #</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Customer</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right">Amount</TableHead>
                    <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Syncing Sales Ledgers...</TableCell></TableRow>
                  ) : invoices?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No invoices on file.</TableCell></TableRow>
                  ) : invoices?.map((inv) => (
                    <TableRow key={inv.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-xs font-bold uppercase">{inv.customerName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[8px] h-4 uppercase font-bold", 
                          inv.status === 'Draft' ? 'bg-secondary text-muted-foreground' : 'bg-emerald-500/10 text-emerald-500 border-none'
                        )}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black">KES {inv.total?.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          {inv.status === 'Draft' && (
                            <Button size="sm" variant="ghost" className="h-7 text-[9px] font-bold uppercase gap-1.5 text-primary" onClick={() => handleFinalize(inv.id)}>
                              <CheckCircle2 className="size-3" /> Post GL
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100"><MoreVertical className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Issue New Sales Invoice</DialogTitle>
              <CardDescription className="text-xs uppercase font-black tracking-tight">Status: DRAFT PHASE</CardDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Title</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash Sale</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                      <SelectItem value="Credit">Credit Sale (A/R)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden shadow-inner bg-secondary/5">
                <div className="p-3 bg-secondary/20 border-b flex justify-between items-center">
                  <span className="font-black uppercase text-[10px] tracking-widest">Billable Items</span>
                  <Select onValueChange={handleAddItem}>
                    <SelectTrigger className="w-48 h-8 text-[10px]"><SelectValue placeholder="Add Item..." /></SelectTrigger>
                    <SelectContent>
                      {products?.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx} className="h-10 border-none hover:bg-transparent">
                          <TableCell className="text-xs font-bold pl-4">{item.name}</TableCell>
                          <TableCell className="w-20"><Input type="number" defaultValue={1} className="h-7 text-xs" /></TableCell>
                          <TableCell className="text-right font-mono text-xs pr-4">KES {item.price.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-secondary/20 rounded-xl">
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-60">Calculated Total (Inc 16% Tax)</p>
                  <p className="text-2xl font-black text-primary">KES {calculateTotals().total.toLocaleString()}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] uppercase font-bold opacity-40">Sub: KES {calculateTotals().subtotal.toLocaleString()}</p>
                  <p className="text-[9px] uppercase font-bold opacity-40">Tax: KES {calculateTotals().taxTotal.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-10 font-bold uppercase">Cancel</Button>
              <Button disabled={isProcessing || items.length === 0} onClick={handleSaveDraft} className="h-10 px-10 font-bold uppercase text-xs shadow-xl shadow-primary/20 gap-2">
                {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Save as Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
