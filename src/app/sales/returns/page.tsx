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
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import { format } from "date-fns";
import { ArrowLeftRight, Plus, Search, Filter, History, MoreVertical, Loader2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { processSalesReturn } from "@/lib/sales/sales.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { cn } from "@/lib/utils";

export default function SalesReturnsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const returnsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'sales_returns'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: returns, isLoading } = useCollection(returnsQuery);

  const invoicesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'sales_invoices'), where('status', '==', 'Finalized'));
  }, [db, selectedInstId]);
  const { data: activeInvoices } = useCollection(invoicesQuery);

  const handleReturn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const invoiceId = formData.get('invoiceId') as string;
    const reason = formData.get('reason') as string;
    
    const invoice = activeInvoices?.find(i => i.id === invoiceId);
    if (!invoice) return;

    try {
      await processSalesReturn(db, selectedInstId, {
        invoiceId,
        items: invoice.items,
        reason
      });

      logSystemEvent(db, selectedInstId, user, 'SALES', 'Sales Return', `Processed return for invoice ${invoice.invoiceNumber}. Ledger reversed.`);
      toast({ title: "Return Processed", description: "GL reversed and Stock replenished." });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Return Failed" });
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
              <ArrowLeftRight className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Returns & RMAs</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Financial Reversals & Stock Restocking</p>
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
              <Plus className="size-4" /> New Return
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <ArrowLeftRight className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage sales returns.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search returns..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-primary">Ledger Reversal: ENABLED</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Return #</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Original Invoice</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right">Value</TableHead>
                    <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">History</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse">Scanning Return Log...</TableCell></TableRow>
                  ) : returns?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No returns processed.</TableCell></TableRow>
                  ) : returns?.map((r) => (
                    <TableRow key={r.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6 font-mono text-[11px] font-bold text-destructive">{r.returnNumber}</TableCell>
                      <TableCell className="text-xs font-bold">
                        {activeInvoices?.find(i => i.id === r.invoiceId)?.invoiceNumber || '...'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black">KES {r.totalAmount?.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100"><History className="size-3.5" /></Button>
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
            <form onSubmit={handleReturn}>
              <DialogHeader>
                <DialogTitle>Process Sales Return</DialogTitle>
                <CardDescription>Issue a credit reversal and restock inventory.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Select Finalized Invoice</Label>
                  <Select name="invoiceId" required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Search Invoices..." /></SelectTrigger>
                    <SelectContent>
                      {activeInvoices?.map(i => (
                        <SelectItem key={i.id} value={i.id} className="text-xs">{i.invoiceNumber} - {i.customerName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason for Return</Label>
                  <Input name="reason" placeholder="e.g. Damaged goods, Wrong prescription" required />
                </div>
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex gap-3 items-start">
                  <Zap className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    <strong>Automation King:</strong> This will auto-post a reversal journal: DR Revenue, DR Tax, CR Accounts Receivable.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs w-full">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <ArrowLeftRight className="size-3 mr-2" />} Finalize Return
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
