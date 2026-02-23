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
  UserCircle,
  Truck,
  ArrowRightLeft,
  ArrowRight,
  Activity
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
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { useRouter } from 'next/navigation';

export default function SalesOrdersPage() {
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [orderItems, setOrderItems] = useState<SalesItem[]>([]);

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching
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
      logSystemEvent(db, selectedInstId, user, 'SALES', 'Confirm Order', `Order ${orderId} confirmed and converted to draft invoice.`);
      toast({ title: "Order Confirmed", description: "Converted to draft invoice in the billing hub." });
    } catch (err) {
      toast({ variant: "destructive", title: "Confirmation Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrders = orders?.filter(o => 
    o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner border border-primary/10">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Sales Orders</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Operational Fulfillment Pipeline</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Validating..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
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
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/30 transition-all">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Pipeline</span>
                  <ShoppingCart className="size-3 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-primary">{filteredOrders.length} NODES</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-accent tracking-widest">Confirmed Queue</span>
                  <CheckCircle2 className="size-3 text-accent opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-accent">{filteredOrders.filter(o => o.status === 'Confirmed').length} OPEN</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Zap className="size-24 text-primary" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Commitment Value</span>
                  <div className="size-2.5 rounded-full bg-primary animate-pulse" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-xl font-black font-headline text-primary">KES {(filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0) || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Fulfillment Yield</span>
                  <Activity className="size-3 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-emerald-500">94.2%</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search order # or identity..." 
                    className="pl-9 h-10 text-[10px] bg-secondary/20 border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/5 border-emerald-500/20 px-3 h-7">Authorized Dispatch Queue</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-12 text-[9px] font-black uppercase pl-8">Order Identifier</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase">Recipient Member</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-center">Cycle Phase</TableHead>
                      <TableHead className="h-12 text-[9px] font-black uppercase text-right">Commitment Value</TableHead>
                      <TableHead className="h-12 text-right pr-8 text-[9px] font-black uppercase">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Scanning Pipeline Hub...</TableCell></TableRow>
                    ) : filteredOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No movement detected in the pipeline.</TableCell></TableRow>
                    ) : filteredOrders.map((o) => (
                      <TableRow key={o.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-8">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] font-black text-primary uppercase">{o.orderNumber}</span>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Ref: {o.id.slice(0, 8)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-black uppercase tracking-tight text-foreground/90">{o.customerName}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-[8px] h-5 px-3 font-black uppercase border-none ring-1 shadow-sm", 
                            o.status === 'Draft' ? 'bg-secondary text-muted-foreground ring-border' : 
                            o.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 
                            'bg-primary/10 text-primary ring-primary/20'
                          )}>
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-primary uppercase">
                          KES {o.total?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-2">
                            {o.status === 'Draft' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                disabled={isProcessing}
                                className="h-9 px-4 text-[9px] font-black uppercase gap-2 text-primary hover:bg-primary/10 transition-all group-hover:scale-105 shadow-inner" 
                                onClick={() => handleConfirm(o.id)}
                              >
                                {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Confirm & Invoice
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm"><MoreVertical className="size-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 shadow-2xl ring-1 ring-border">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground">Logistics Command</DropdownMenuLabel>
                                <DropdownMenuItem className="text-xs gap-3 font-bold" onClick={() => router.push('/delivery/dispatch')}>
                                  <Truck className="size-3.5 text-primary" /> Initialize Dispatch Note
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-3 font-bold">
                                  <FileText className="size-3.5 text-accent" /> Export Packing Slip
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs gap-3 font-bold">
                                  <History className="size-3.5 text-primary" /> Lifecycle Audit Trail
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs gap-3 font-bold text-destructive">
                                  <Trash2 className="size-3.5" /> Terminate Order Node
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
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border rounded-[2.5rem] overflow-hidden border-none p-0">
            <form onSubmit={handleCreateOrder}>
              <div className="bg-primary p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><ShoppingCart className="size-32 rotate-12" /></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner"><ClipboardCheck className="size-5" /></div>
                  <div>
                    <DialogTitle className="text-lg font-black uppercase tracking-widest text-white">Initialize Order Cycle</DialogTitle>
                    <p className="text-[10px] font-bold uppercase opacity-70">Supply Chain Node v4.2</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8 space-y-6 bg-card">
                <div className="grid gap-4 text-xs">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[9px] tracking-[0.2em] opacity-60 text-primary">Target Recipient Member</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} required>
                      <SelectTrigger className="h-11 font-black uppercase border-none ring-1 ring-border bg-secondary/5 focus:ring-primary">
                        <SelectValue placeholder="Search Active Directory..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCustomers?.map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-[10px] font-black uppercase tracking-tight">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border rounded-2xl overflow-hidden shadow-inner bg-secondary/5 ring-1 ring-border">
                    <div className="p-3 bg-secondary/20 border-b flex justify-between items-center">
                      <span className="font-black uppercase text-[9px] tracking-widest text-primary">Item Specification Hub</span>
                      <Select onValueChange={handleAddItem}>
                        <SelectTrigger className="w-40 h-8 border-none ring-1 ring-border bg-background text-[9px] font-bold uppercase">
                          <SelectValue placeholder="Add Catalog SKU..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map(p => <SelectItem key={p.id} value={p.id} className="text-xs uppercase font-bold">{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableBody>
                          {orderItems.length === 0 ? (
                            <TableRow><TableCell className="text-center py-8 text-[9px] text-muted-foreground uppercase font-black opacity-30 italic tracking-widest">Queue is empty</TableCell></TableRow>
                          ) : orderItems.map((item, idx) => (
                            <TableRow key={idx} className="h-12 border-none hover:bg-transparent">
                              <TableCell className="text-[10px] font-black uppercase pl-4">{item.name}</TableCell>
                              <TableCell className="w-20"><Input type="number" defaultValue={1} className="h-7 text-[10px] font-black text-center bg-background border-none ring-1 ring-border" /></TableCell>
                              <TableCell className="text-right font-mono text-[10px] font-black pr-4 text-primary">KES {item.price.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex justify-between items-end p-5 bg-primary/5 rounded-3xl border border-primary/10 shadow-inner">
                    <div>
                      <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-1 opacity-60">Estimated Cycle Total</p>
                      <p className="text-2xl font-black font-headline tracking-tighter">KES {calculateTotal().toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-background flex flex-col items-center gap-1 shadow-sm border border-border/50">
                      <span className="text-[8px] font-black uppercase opacity-40">Tax Portion</span>
                      <span className="text-[10px] font-black font-mono">KES {(calculateTotal() * 0.16).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2 gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-12 font-black uppercase text-[10px] tracking-widest">Discard</Button>
                  <Button 
                    type="submit" 
                    disabled={isProcessing || orderItems.length === 0 || !selectedCustomerId} 
                    className="h-12 px-12 font-black uppercase text-[10px] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20 transition-all active:scale-95 flex-1"
                  >
                    {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />} Commit To Pipeline
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}