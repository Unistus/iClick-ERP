
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
  MoreVertical
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createSalesInvoice, type SalesItem } from "@/lib/sales/sales.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

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
      taxAmount: (product.basePrice || 0) * 0.16 // MVP Default VAT
    }]);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const taxTotal = subtotal * 0.16;
    return { subtotal, taxTotal, total: subtotal + taxTotal };
  };

  const handleFinalize = async () => {
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

      logSystemEvent(db, selectedInstId, user, 'SALES', 'Create Invoice', `Finalized invoice for ${customerName} totalling ${totals.total}.`);
      toast({ title: "Invoice Finalized", description: "Journal Entries auto-posted to Ledger." });
      setIsCreateOpen(false);
      setItems([]);
      setCustomerName("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Invoicing Failed", description: err.message });
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
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Back-office Sales & Invoicing Hub</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={selectedInstId} 
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold rounded-md px-3"
            >
              <option value="">Select Institution</option>
              {institutions?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Issue Invoice
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
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter">Real-time GL Integration: ACTIVE</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Invoice #</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Customer</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Status</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right">Amount</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right pr-6">Management</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Syncing Sales Ledgers...</TableCell></TableRow>
                  ) : invoices?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No invoices on file.</TableCell></TableRow>
                  ) : invoices?.map((inv) => (
                    <TableRow key={inv.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30">
                      <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-xs font-bold uppercase">{inv.customerName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 border-none uppercase font-black">
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black">KES {inv.total?.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="size-8"><History className="size-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Issue Invoice Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Issue New Sales Invoice</DialogTitle>
              <CardDescription className="text-xs uppercase font-black tracking-tight">Financial Automation Engine v2.0</CardDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Title</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Health Ministry" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash (Auto-Cleared)</SelectItem>
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

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase text-primary mb-2">Automation Preview</p>
                  <div className="space-y-1 text-[9px] text-muted-foreground italic font-medium leading-relaxed">
                    <p>• Post DR to {paymentMethod === 'Credit' ? 'Accounts Receivable' : 'Cash Hub'}</p>
                    <p>• Post CR to Sales Revenue Sub-ledger</p>
                    <p>• Calculate 16% VAT Liability Automatically</p>
                  </div>
                </div>
                <div className="bg-secondary/20 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold opacity-60"><span>Subtotal</span><span>KES {calculateTotals().subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[10px] uppercase font-bold opacity-60"><span>Tax (16%)</span><span>KES {calculateTotals().taxTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-lg font-black border-t border-border/50 pt-2 text-primary"><span>TOTAL</span><span>KES {calculateTotals().total.toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-10 font-bold uppercase">Discard</Button>
              <Button disabled={isProcessing || items.length === 0} onClick={handleFinalize} className="h-10 px-10 font-bold uppercase text-xs shadow-xl shadow-primary/20 gap-2">
                {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Finalize & Post to GL
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
