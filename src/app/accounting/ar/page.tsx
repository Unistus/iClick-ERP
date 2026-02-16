
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
import { format, isAfter } from "date-fns";
import { Plus, Receipt, Search, Filter, ArrowUpRight, Clock, CheckCircle2, AlertCircle, Wallet, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createReceivableInvoice, recordInvoicePayment } from "@/lib/accounting/receivable.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function AccountsReceivablePage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const invoicesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'invoices'), orderBy('date', 'desc'), limit(50));
  }, [db, selectedInstId]);
  const { data: invoices, isLoading } = useCollection(invoicesQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const coaRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'coa'), where('isActive', '==', true));
  }, [db, selectedInstId]);
  const { data: accounts } = useCollection(coaRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // Aggregates
  const totalReceivable = invoices?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;
  const overdueReceivable = invoices?.filter(inv => inv.status !== 'Paid' && isAfter(new Date(), inv.dueDate.toDate())).reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

  const handleCreateInvoice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      customerName: formData.get('customerName') as string,
      customerId: `CUST-${Date.now()}`,
      date: new Date(formData.get('date') as string),
      dueDate: new Date(formData.get('dueDate') as string),
      amount: parseFloat(formData.get('amount') as string),
      taxAmount: parseFloat(formData.get('taxAmount') as string) || 0,
    };

    setIsCreateOpen(false); // Snap Close

    createReceivableInvoice(db, selectedInstId, data).then(() => {
      logSystemEvent(db, selectedInstId, user, 'ACCOUNTING', 'Create Invoice', `New credit sale invoice issued.`);
      toast({ title: "Invoice Created" });
    }).catch(err => {
      toast({ variant: "destructive", title: "Invoicing Failed", description: err.message });
    }).finally(() => setIsProcessing(false));
  };

  const handleRecordPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !selectedInvoice || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const paymentAccountId = formData.get('paymentAccountId') as string;

    setIsPaymentOpen(false); // Snap Close

    recordInvoicePayment(db, selectedInstId, selectedInvoice.id, amount, paymentAccountId).then(() => {
      logSystemEvent(db, selectedInstId, user, 'ACCOUNTING', 'Record Payment', `Payment received for invoice ${selectedInvoice.invoiceNumber}.`);
      toast({ title: "Payment Recorded" });
    }).catch(err => {
      toast({ variant: "destructive", title: "Payment Failed", description: err.message });
    }).finally(() => setIsProcessing(false));
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Receipt className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Accounts Receivable</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Customer Credit & Billing</p>
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
              <Plus className="size-4" /> New Invoice
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Calculator className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage credit cycles.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Receivables</span>
                  <Wallet className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{currency} {totalReceivable.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-destructive">Overdue Balance</span>
                  <AlertCircle className="size-3 text-destructive" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold text-destructive">{currency} {overdueReceivable.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-500">Collected (MTD)</span>
                  <CheckCircle2 className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold text-emerald-500">{currency} 0</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card">
              <CardHeader className="py-3 px-6 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search invoices..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" className="size-8"><Filter className="size-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Invoice #</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Customer</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Issued / Due</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Amount</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Balance</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs uppercase font-bold animate-pulse opacity-50">Syncing receivables...</TableCell></TableRow>
                    ) : !invoices || invoices.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground uppercase font-bold">No receivables on file.</TableCell></TableRow>
                    ) : invoices.map((inv) => (
                      <TableRow key={inv.id} className="h-14 hover:bg-secondary/5 transition-colors group">
                        <TableCell className="pl-6 font-mono text-[10px] font-bold text-primary">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-xs font-bold">{inv.customerName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-medium">{format(inv.date.toDate(), 'dd MMM yy')}</span>
                            <span className={`text-[9px] font-bold ${isAfter(new Date(), inv.dueDate.toDate()) && inv.status !== 'Paid' ? 'text-destructive' : 'text-muted-foreground opacity-50'}`}>
                              Due {format(inv.dueDate.toDate(), 'dd MMM yy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-[11px]">
                          {currency} {inv.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-[11px] text-primary">
                          {currency} {inv.balance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-3">
                            <Badge variant="outline" className={`text-[9px] h-4 uppercase font-bold ${
                              inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              inv.status === 'Overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                              'bg-primary/5 text-primary border-primary/20'
                            }`}>
                              {inv.status}
                            </Badge>
                            {inv.balance > 0 && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 text-[9px] font-bold uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setIsPaymentOpen(true);
                                }}
                              >
                                <ArrowUpRight className="size-3" /> Pay
                              </Button>
                            )}
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

        {/* Record Payment Dialog */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="max-w-sm">
            <form onSubmit={handleRecordPayment}>
              <DialogHeader>
                <DialogTitle>Record Collection</DialogTitle>
                <CardDescription>Apply payment to {selectedInvoice?.invoiceNumber}</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Outstanding Balance</p>
                  <p className="text-xl font-bold font-mono text-primary">{currency} {selectedInvoice?.balance?.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label>Payment Amount ({currency})</Label>
                  <Input name="amount" type="number" step="0.01" defaultValue={selectedInvoice?.balance} required className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>Deposit Account</Label>
                  <Select name="paymentAccountId" required>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Bank/Cash Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.filter(a => a.subtype === 'Cash & Bank' || a.subtype === 'M-Pesa Clearing').map(acc => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">[{acc.code}] {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-9 font-bold uppercase text-xs">Confirm Receipt</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Issue Invoice Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreateInvoice}>
              <DialogHeader>
                <DialogTitle>Issue New Invoice</DialogTitle>
                <CardDescription>Generate a credit sale and auto-post to ledger.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input name="customerName" placeholder="e.g. Acme Corp" required className="h-9 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invoice Date</Label>
                    <Input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required className="h-9 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input name="dueDate" type="date" required className="h-9 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Amount ({currency})</Label>
                    <Input name="amount" type="number" step="0.01" placeholder="0.00" required className="h-9 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>VAT Portion ({currency})</Label>
                    <Input name="taxAmount" type="number" step="0.01" placeholder="0.00" className="h-9 text-xs" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-9 font-bold uppercase text-xs">Issue Invoice</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
