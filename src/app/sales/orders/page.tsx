
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { ClipboardCheck, Plus, Search, Filter, History, MoreVertical, Loader2, Package, CheckCircle2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createSalesOrder, confirmSalesOrder } from "@/lib/sales/sales.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { cn } from '@/lib/utils';

export default function SalesOrdersPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const ordersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'sales_orders'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: orders, isLoading } = useCollection(ordersQuery);

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !user || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      customerName: formData.get('customerName') as string,
      total: parseFloat(formData.get('total') as string),
      status: 'Draft',
      items: [], 
    };

    try {
      await createSalesOrder(db, selectedInstId, data, user.uid);
      logSystemEvent(db, selectedInstId, user, 'SALES', 'Create Order', `Draft Sales Order confirmed for ${data.customerName}.`);
      toast({ title: "Order Initialized" });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to create order" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async (orderId: string) => {
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);
    try {
      await confirmSalesOrder(db, selectedInstId, orderId);
      toast({ title: "Order Confirmed", description: "Ready for fulfillment and billing." });
    } catch (err) {
      toast({ variant: "destructive", title: "Confirmation Failed" });
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
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Sales Orders</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Operational Fulfillment Pipeline</p>
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
              <Plus className="size-4" /> New Order
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <ClipboardCheck className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage orders.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search orders..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">Workflow Stage: FULFILLMENT</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Order #</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Customer</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right">Amount</TableHead>
                    <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse">Syncing pipeline...</TableCell></TableRow>
                  ) : orders?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No orders in pipeline.</TableCell></TableRow>
                  ) : orders?.map((o) => (
                    <TableRow key={o.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">{o.orderNumber}</TableCell>
                      <TableCell className="text-xs font-bold uppercase">{o.customerName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[8px] h-4 uppercase font-bold", 
                          o.status === 'Draft' ? 'bg-secondary text-muted-foreground' : 'bg-accent/10 text-accent border-accent/20'
                        )}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black">KES {o.total?.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          {o.status === 'Draft' && (
                            <Button size="sm" variant="ghost" className="h-7 text-[9px] font-bold uppercase gap-1.5 text-accent" onClick={() => handleConfirm(o.id)}>
                              <CheckCircle2 className="size-3" /> Confirm
                            </Button>
                          )}
                          {o.status === 'Confirmed' && (
                            <Button size="sm" variant="ghost" className="h-7 text-[9px] font-bold uppercase gap-1.5 text-primary">
                              <Zap className="size-3" /> Create Invoice
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
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreateOrder}>
              <DialogHeader>
                <DialogTitle>Confirm Sales Order</DialogTitle>
                <CardDescription>Lock in a customer order for fulfillment and invoicing.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Customer Identity</Label>
                  <Input name="customerName" required />
                </div>
                <div className="space-y-2">
                  <Label>Total Value</Label>
                  <Input name="total" type="number" step="0.01" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs w-full shadow-xl shadow-accent/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <ClipboardCheck className="size-3 mr-2" />} Save Draft Order
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
