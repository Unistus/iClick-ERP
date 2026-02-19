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
import { collection, query, orderBy, doc, updateDoc, where } from "firebase/firestore";
import { format } from "date-fns";
import { Quote, Plus, Search, Filter, History, MoreVertical, Loader2, Send, CheckCircle2, FileText, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createQuotation, updateQuotationStatus } from "@/lib/sales/sales.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function QuotationsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const productsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'products');
  }, [db, selectedInstId]);
  const { data: products } = useCollection(productsRef);

  // GATEKEEPER: Only Approved (Active) customers can receive quotes
  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'customers'), where('status', '==', 'Active'));
  }, [db, selectedInstId]);
  const { data: activeCustomers } = useCollection(customersQuery);

  const quotesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'sales_quotations'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: quotations, isLoading } = useCollection(quotesQuery);

  const handleCreateQuote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !user || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const customerId = formData.get('customerId') as string;
    const customer = activeCustomers?.find(c => c.id === customerId);

    const data = {
      customerId,
      customerName: customer?.name || 'Unknown',
      expiryDate: new Date(formData.get('expiryDate') as string),
      total: parseFloat(formData.get('total') as string),
      status: 'Draft',
      items: [], 
    };

    try {
      await createQuotation(db, selectedInstId, data, user.uid);
      logSystemEvent(db, selectedInstId, user, 'SALES', 'Create Quote', `New draft quote generated for ${data.customerName}.`);
      toast({ title: "Quotation Generated" });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to generate quote" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (quoteId: string, status: 'Sent' | 'Confirmed') => {
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);
    try {
      await updateQuotationStatus(db, selectedInstId, quoteId, status);
      toast({ title: `Quotation Marked as ${status}`, description: status === 'Confirmed' ? "Sales Order created." : "Client notification ready." });
    } catch (err) {
      toast({ variant: "destructive", title: "Transition Failed" });
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
              <Quote className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Price Quotations</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Pre-sales Pipeline Hub</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Quote
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Quote className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage quotations.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search quotes..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 border-primary/20">Authorized Quoting Cycle</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Quote #</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Approved Customer</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right">Amount</TableHead>
                    <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Management</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse">Syncing quotes...</TableCell></TableRow>
                  ) : quotations?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No active quotations.</TableCell></TableRow>
                  ) : quotations?.map((q) => (
                    <TableRow key={q.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary uppercase">{q.quoteNumber}</TableCell>
                      <TableCell className="text-xs font-bold uppercase">{q.customerName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[8px] h-4 uppercase font-bold", 
                          q.status === 'Draft' ? 'bg-secondary text-muted-foreground' : 
                          q.status === 'Sent' ? 'bg-primary/10 text-primary border-primary/20' : 
                          'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        )}>
                          {q.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black">KES {q.total?.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-2">
                          {q.status === 'Draft' && (
                            <Button size="sm" variant="ghost" className="h-7 text-[9px] font-bold uppercase gap-1.5" onClick={() => handleStatusChange(q.id, 'Sent')}>
                              <Send className="size-3" /> Mark Sent
                            </Button>
                          )}
                          {q.status === 'Sent' && (
                            <Button size="sm" variant="ghost" className="h-7 text-[9px] font-bold uppercase gap-1.5 text-emerald-500" onClick={() => handleStatusChange(q.id, 'Confirmed')}>
                              <CheckCircle2 className="size-3" /> Confirm & Order
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100"><MoreVertical className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem className="text-xs gap-2"><FileText className="size-3.5" /> Print Preview</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-2"><Send className="size-3.5" /> Email to Client</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs gap-2 text-destructive"><History className="size-3.5" /> Archive Quote</DropdownMenuItem>
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

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreateQuote}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Quote className="size-5 text-primary" />
                  <DialogTitle>Generate Quotation</DialogTitle>
                </div>
                <CardDescription className="text-xs font-bold text-primary">Compliance: APPROVED CUSTOMERS ONLY</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Verified Customer</Label>
                  <Select name="customerId" required>
                    <SelectTrigger className="h-11 font-bold">
                      <SelectValue placeholder="Search Active Directory..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCustomers?.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[8px] text-muted-foreground italic">Only customers with 'Active' status appear in this selection.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Expiry Date</Label>
                    <Input name="expiryDate" type="date" defaultValue={format(addDays(new Date(), 7), 'yyyy-MM-dd')} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Estimated Total</Label>
                    <Input name="total" type="number" step="0.01" placeholder="0.00" required className="h-10 font-black text-lg" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-11 font-bold uppercase text-xs w-full shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Quote className="size-3 mr-2" />} Save Draft Quote
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
