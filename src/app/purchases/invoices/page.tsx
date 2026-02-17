
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import { createVendorInvoice } from "@/lib/purchases/purchases.service";
import { FileText, Plus, Search, Filter, History, MoreVertical, Loader2, Landmark, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function SupplierInvoicesPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const suppliersRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'suppliers');
  }, [db, selectedInstId]);
  const { data: suppliers } = useCollection(suppliersRef);

  const coaRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'coa');
  }, [db, selectedInstId]);
  const { data: accounts } = useCollection(coaRef);

  const invoicesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'vendor_invoices'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: invoices, isLoading } = useCollection(invoicesQuery);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const supplierId = formData.get('supplierId') as string;
    const supplier = suppliers?.find(s => s.id === supplierId);

    const data = {
      supplierId,
      supplierName: supplier?.name || 'Vendor',
      total: parseFloat(formData.get('total') as string),
      allocationAccountId: formData.get('allocationAccountId') as string,
      status: 'Finalized',
    };

    try {
      await createVendorInvoice(db, selectedInstId, data);
      toast({ title: "Invoice Finalized", description: "Liability posted to Accounts Payable." });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Invoicing Failed" });
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
              <h1 className="text-2xl font-headline font-bold text-foreground">Vendor Invoices</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Payable Liabilities Hub</p>
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
              <Plus className="size-4" /> Book Invoice
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <FileText className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage vendor liabilities.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search invoice #..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase text-primary">Ledger Post Status: REAL-TIME</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Invoice #</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Vendor</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right pr-6">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Syncing AP Ledger...</TableCell></TableRow>
                  ) : invoices?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No booked invoices.</TableCell></TableRow>
                  ) : invoices?.map((inv) => (
                    <TableRow key={inv.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-xs font-bold uppercase tracking-tight">{inv.supplierName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 border-none uppercase font-black">
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">KES {inv.total?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Book Vendor Invoice</DialogTitle>
                <CardDescription className="text-xs uppercase font-black tracking-tight">Finalized Journal Entry</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Source Vendor</Label>
                  <Select name="supplierId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select Supplier..." /></SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Total Amount (Inc. VAT)</Label>
                  <Input name="total" type="number" step="0.01" placeholder="0.00" required className="h-10 font-black text-lg" />
                </div>
                <div className="space-y-2">
                  <Label>COA Allocation Node</Label>
                  <Select name="allocationAccountId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Expense/Asset Category..." /></SelectTrigger>
                    <SelectContent>
                      {accounts?.filter(a => a.type === 'Asset' || a.type === 'Expense').map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>[{acc.code}] {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex gap-3 items-start">
                  <Zap className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    <strong>Automation King:</strong> Submitting this will auto-post a journal: DR Allocation, CR Accounts Payable.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs w-full">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <FileText className="size-3 mr-2" />} Finalize & Post
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
