
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
import { collection, query, orderBy, doc, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { 
  Box, 
  Plus, 
  Search, 
  Tag, 
  MoreHorizontal,
  History,
  Loader2,
  Trash2,
  Edit2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

export default function ProductsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'products'), orderBy('name', 'asc'));
  }, [db, selectedInstId]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const categoriesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'categories');
  }, [db, selectedInstId]);
  const { data: categories } = useCollection(categoriesRef);

  const uomsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'uoms');
  }, [db, selectedInstId]);
  const { data: uoms } = useCollection(uomsRef);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      type: formData.get('type') as string,
      categoryId: formData.get('categoryId') as string,
      uomId: formData.get('uomId') as string,
      basePrice: parseFloat(formData.get('basePrice') as string),
      costPrice: parseFloat(formData.get('costPrice') as string),
      reorderLevel: parseFloat(formData.get('reorderLevel') as string) || 0,
      trackExpiry: formData.get('trackExpiry') === 'on',
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'institutions', selectedInstId, 'products');

    if (editingProduct) {
      updateDocumentNonBlocking(doc(colRef, editingProduct.id), data);
      toast({ title: "Product Updated" });
    } else {
      addDocumentNonBlocking(colRef, { ...data, totalStock: 0, createdAt: serverTimestamp() });
      toast({ title: "Product Created" });
    }

    setIsCreateOpen(false);
    setEditingProduct(null);
    setIsProcessing(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Box className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Catalog Registry</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Stock Items & Service Assets</p>
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
              <Plus className="size-4" /> New Item
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Tag className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access the catalog.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search by name or SKU..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                  <Box className="size-3 text-primary" /> Stock
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                  <Tag className="size-3 text-accent" /> Service
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Item / SKU</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-center">Category</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Selling</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">On Hand</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs uppercase font-bold animate-pulse opacity-50">Polling inventory...</TableCell></TableRow>
                  ) : !products || products.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground font-bold">Catalog is empty.</TableCell></TableRow>
                  ) : products.map((p) => {
                    const isLow = p.totalStock <= p.reorderLevel && p.type === 'Stock';
                    const categoryName = categories?.find(c => c.id === p.categoryId)?.name || 'Uncategorized';
                    const uomCode = uoms?.find(u => u.id === p.uomId)?.code || 'PCS';
                    return (
                      <TableRow key={p.id} className="h-14 hover:bg-secondary/5 group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{p.name}</span>
                            <span className="text-[9px] font-mono text-primary uppercase">{p.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[8px] h-4 uppercase font-bold border-primary/20 text-primary">
                            {categoryName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">
                          {p.basePrice?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-xs font-bold ${isLow ? 'text-destructive' : ''}`}>{p.totalStock?.toLocaleString() || 0}</span>
                            <span className="text-[8px] text-muted-foreground uppercase">{uomCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {isLow && (
                              <Badge variant="destructive" className="text-[8px] h-4 animate-pulse">RE-ORDER</Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => {
                                  setEditingProduct(p);
                                  setIsCreateOpen(true);
                                }}>
                                  <Edit2 className="size-3.5" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2">
                                  <History className="size-3.5" /> Stock Movement
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs gap-2 text-destructive">
                                  <Trash2 className="size-3.5" /> Archive Item
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Update' : 'Register'} Catalog Item</DialogTitle>
                <CardDescription>Link this item to institutional categories and measure units.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product Name</Label>
                    <Input name="name" defaultValue={editingProduct?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label>SKU / Barcode</Label>
                    <Input name="sku" defaultValue={editingProduct?.sku} required className="font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Institutional Category</Label>
                    <Select name="categoryId" defaultValue={editingProduct?.categoryId}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map(cat => <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Standard UoM</Label>
                    <Select name="uomId" defaultValue={editingProduct?.uomId}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="e.g. PCS" /></SelectTrigger>
                      <SelectContent>
                        {uoms?.map(uom => <SelectItem key={uom.id} value={uom.id} className="text-xs">{uom.name} ({uom.code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Item Type</Label>
                    <Select name="type" defaultValue={editingProduct?.type || "Stock"}>
                      <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stock" className="text-xs">Stock Item</SelectItem>
                        <SelectItem value="Service" className="text-xs">Service</SelectItem>
                        <SelectItem value="Bundle" className="text-xs">Bundle / Combo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Cost</Label>
                    <Input name="costPrice" type="number" step="0.01" defaultValue={editingProduct?.costPrice} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Base Selling Price</Label>
                    <Input name="basePrice" type="number" step="0.01" defaultValue={editingProduct?.basePrice} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                  <div className="space-y-2">
                    <Label>Re-order Point</Label>
                    <Input name="reorderLevel" type="number" defaultValue={editingProduct?.reorderLevel} placeholder="Min Qty" />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded bg-secondary/10 mt-4">
                    <Label className="text-[10px] uppercase font-bold">Track Expiry?</Label>
                    <input type="checkbox" name="trackExpiry" defaultChecked={editingProduct?.trackExpiry} className="size-4" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="gap-2 px-8 font-bold uppercase text-xs">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Box className="size-3" />} Commit Item
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
