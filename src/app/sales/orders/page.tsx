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
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import { format } from "date-fns";
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Filter, 
  History, 
  MoreVertical, 
  Loader2, 
  Package, 
  CheckCircle2, 
  Zap,
  Trash2,
  ShoppingCart,
  FileText,
  UserCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createSalesOrder, confirmSalesOrder, type SalesItem } from "@/lib/sales/sales.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function SalesOrdersPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [orderItems, setOrderItems] = useState<SalesItem[]>([]);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  // GATEKEEPER: Only Approved (Active) customers can receive orders
  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'customers'), where('status', '==', 'Active'));
  }, [db, selectedInstId]);
  const { data: activeCustomers } = useCollection(customersQuery);

  const ordersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'sales_orders'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: orders, isLoading } = useCollection(ordersQuery);

  const productsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'products');
  }, [db, selectedInstId]);
  const { data: products } = useCollection(productsRef);

  const handleAddItem = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    setOrderItems(prev => [...prev, {
      productId: product.id,
      name: product.name,
      qty: 1,
      price: product.basePrice || 0,
      total: product.basePrice || 0,
      taxAmount: (product.basePrice || 0) * 0.16 
    }]);
  };

  const calculateTotal = () => {
    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
    const taxTotal = subtotal * 0.16;
    return subtotal + taxTotal;
  };

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !user || isProcessing) return;
    setIsProcessing(true);

    const customer = activeCustomers?.find(c => c.id === selectedCustomerId);
    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
    const taxTotal = subtotal * 0.16;

    const data = {
      customerId: selectedCustomerId,
      customerName: customer?.name || 'Unknown',
      items: orderItems,
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
      status: 'Draft',
    };

    try {
      await createSalesOrder(db, selectedInstId, data, user.uid);
      logSystemEvent(db, selectedInstId, user, 'SALES', 'Create Order', `Draft Sales Order created for ${data.customerName}.`);
      toast({ title: "Order Initialized" });
      setIsCreateOpen(false);
      setOrderItems([]);
      setSelectedCustomerId("");
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
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Draft Orders</span>
                  <ShoppingCart className="size-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{orders?.filter(o => o.status === 'Draft').length || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-accent">Confirmed</span>
                  <CheckCircle2 className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{orders?.filter(o => o.status === 'Confirmed').length || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Pipeline Value</span>
                  <Zap className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold text-primary">KES {(orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search orders..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/5 border-emerald-500/20">Approved Customers Only</Badge>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-all"><MoreVertical className="size-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="text-xs gap-2"><FileText className="size-3.5" /> View Details</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2"><History className="size-3.5" /> Order History</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs gap-2 text-destructive"><Trash2 className="size-3.5" /> Cancel Order</DropdownMenuItem>
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
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
            <form onSubmit={handleCreateOrder}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="size-5 text-primary" />
                  <DialogTitle>New Sales Order</DialogTitle>
                </div>
                <CardDescription className="text-[10px] uppercase font-black text-primary">Compliance Status: ENFORCED</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Verified Customer Account</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} required>
                    <SelectTrigger className="h-11 font-bold uppercase">
                      <SelectValue placeholder="Search Approved Members..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCustomers?.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-xl overflow-hidden shadow-inner bg-secondary/5">
                  <div className="p-3 bg-secondary/20 border-b flex justify-between items-center">
                    <span className="font-black uppercase text-[10px] tracking-widest">Order Specification</span>
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
                        {orderItems.length === 0 ? (
                          <TableRow><TableCell className="text-center py-8 text-muted-foreground opacity-50 uppercase font-bold">No items added.</TableCell></TableRow>
                        ) : orderItems.map((item, idx) => (
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
                    <p className="text-[10px] uppercase font-bold opacity-60">Estimated Total Value</p>
                    <p className="text-2xl font-black text-primary">KES {calculateTotal().toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                    <p className="text-[9px] text-emerald-600 leading-tight italic uppercase font-bold">
                      Institutional Guard: Only Active customers permitted.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-10 font-bold uppercase tracking-widest">Discard</Button>
                <Button 
                  type="submit" 
                  disabled={isProcessing || orderItems.length === 0 || !selectedCustomerId} 
                  className="h-10 px-10 font-bold uppercase text-xs shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 gap-2"
                >
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <ClipboardCheck className="size-3 mr-2" />} Initialize Order Cycle
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
