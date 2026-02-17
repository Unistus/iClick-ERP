
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, doc, serverTimestamp, setDoc } from "firebase/firestore";
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
  Edit2,
  Hash,
  Sparkles,
  Calendar,
  Layers,
  Filter,
  LayoutGrid,
  Info,
  Clock,
  Barcode,
  Boxes,
  Timer
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
import { getNextSequence } from "@/lib/sequence-service";

export default function ProductsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCategorizeOpen, setIsCategorizeOpen] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    let sku = formData.get('sku') as string;
    let productId = formData.get('productId') as string;

    // AUTOMATION KING: Auto-Sequence
    try {
      if (!sku && !editingProduct) sku = await getNextSequence(db, selectedInstId, 'product_sku');
      if (!productId && !editingProduct) {
        const seqId = type === 'Stock' ? 'product_id' : 'service_id';
        productId = await getNextSequence(db, selectedInstId, seqId);
      }
    } catch (err) { console.warn("Fallback sequencing active."); }

    const data = {
      name: formData.get('name') as string,
      sku: sku || `SKU-${Date.now()}`,
      productId: productId || `ID-${Date.now()}`,
      type: type,
      categoryId: formData.get('categoryId') as string,
      uomId: formData.get('uomId') as string,
      basePrice: parseFloat(formData.get('basePrice') as string),
      costPrice: parseFloat(formData.get('costPrice') as string),
      reorderLevel: parseFloat(formData.get('reorderLevel') as string) || 0,
      shelfLifeDays: parseInt(formData.get('shelfLife') as string) || 0,
      trackExpiry: formData.get('trackExpiry') === 'on',
      trackSerials: formData.get('trackSerials') === 'on',
      hasVariants: formData.get('hasVariants') === 'on',
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'institutions', selectedInstId, 'products');

    if (editingProduct) {
      updateDocumentNonBlocking(doc(colRef, editingProduct.id), data);
      toast({ title: "Catalog Updated" });
    } else {
      addDocumentNonBlocking(colRef, { ...data, totalStock: 0, createdAt: serverTimestamp() });
      toast({ title: "Item Registered", description: `Assigned SKU: ${data.sku}` });
    }

    setIsCreateOpen(false);
    setEditingProduct(null);
    setIsProcessing(false);
  };

  const handleDynamicCategorize = (productId: string, catId: string) => {
    const ref = doc(db, 'institutions', selectedInstId, 'products', productId);
    setDoc(ref, { categoryId: catId, updatedAt: serverTimestamp() }, { merge: true });
    setIsCategorizeOpen(false);
    toast({ title: "Category Linked" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Boxes className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Catalog & Stock Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Institutional Asset Registry</p>
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

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId} onClick={() => {
              setEditingProduct(null);
              setIsCreateOpen(true);
            }}>
              <Plus className="size-4" /> New Item
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <LayoutGrid className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access its master registry.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search name, sku or identifier..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-[9px] h-5 bg-primary/5 border-primary/20 text-primary font-black uppercase">
                  {products?.length || 0} Catalogued Assets
                </Badge>
                <Button size="icon" variant="ghost" className="size-8"><Filter className="size-3.5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Identifier / SKU</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Catalog Name</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Category</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right">Cost</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right">Selling</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Stock Pulse</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right pr-6">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-12 text-xs uppercase font-bold animate-pulse opacity-50 tracking-widest">Scanning Catalog...</TableCell></TableRow>
                  ) : products?.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No assets found in institutional vault.</TableCell></TableRow>
                  ) : products?.map((p) => {
                    const category = categories?.find(c => c.id === p.categoryId);
                    const isUncategorized = !p.categoryId || p.categoryId === "none";
                    const isLow = p.type === 'Stock' && p.totalStock <= (p.reorderLevel || 0);

                    return (
                      <TableRow key={p.id} className="h-16 hover:bg-secondary/10 transition-colors group border-b-border/30">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-mono text-primary font-black uppercase tracking-tighter">ID: {p.productId}</span>
                            <span className="text-[10px] font-mono font-bold tracking-tight">{p.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-black uppercase tracking-tight text-foreground/90">{p.name}</TableCell>
                        <TableCell className="text-center">
                          {isUncategorized ? (
                            <button 
                              onClick={() => { setEditingProduct(p); setIsCategorizeOpen(true); }}
                              className="text-[9px] font-black text-accent uppercase underline decoration-dotted hover:text-accent/80 transition-colors"
                            >
                              UNCATEGORIZED
                            </button>
                          ) : (
                            <Badge variant="outline" className="text-[8px] h-4 uppercase font-bold border-primary/20 text-primary">
                              {category?.name || '...'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs opacity-50">{p.costPrice?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-primary">{p.basePrice?.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-[11px] font-black ${isLow ? 'text-destructive' : 'text-emerald-500'}`}>
                              {p.totalStock?.toLocaleString() || 0}
                            </span>
                            <div className="flex items-center gap-1">
                              {p.trackExpiry && <Timer className="size-2 text-accent" />}
                              {p.trackSerials && <Barcode className="size-2 text-primary" />}
                              {p.hasVariants && <Layers className="size-2 text-primary" />}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asset Control</DropdownMenuLabel>
                              <DropdownMenuItem className="text-xs gap-2" onClick={() => { setEditingProduct(p); setIsCreateOpen(true); }}>
                                <Edit2 className="size-3.5 text-primary" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-2"><History className="size-3.5" /> Movement Log</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs gap-2 text-destructive"><Trash2 className="size-3.5" /> Archive Item</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Dynamic Categorization Dialog */}
        <Dialog open={isCategorizeOpen} onOpenChange={setIsCategorizeOpen}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-wider">Quick Categorize</DialogTitle>
              <DialogDescription className="text-xs">Linking {editingProduct?.name} to structure.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              {categories?.map(cat => (
                <Button 
                  key={cat.id} 
                  variant="outline" 
                  className="justify-start text-xs h-9 uppercase font-bold"
                  onClick={() => handleDynamicCategorize(editingProduct.id, cat.id)}
                >
                  <Tag className="size-3 mr-2 opacity-50" /> {cat.name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Master Registry Form */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Box className="size-5 text-primary" />
                  <DialogTitle>{editingProduct ? 'Modify' : 'Register'} Institutional Asset</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight">Catalog Intelligence v2.0</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-6 text-xs">
                {/* section 1: Identity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-6">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="uppercase font-bold tracking-widest text-muted-foreground">Product Title</Label>
                    <Input name="name" defaultValue={editingProduct?.name} required placeholder="e.g. Paracetamol 500mg Tablet" className="h-10 text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest text-muted-foreground">Item Type</Label>
                    <Select name="type" defaultValue={editingProduct?.type || "Stock"}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stock">Stock Item</SelectItem>
                        <SelectItem value="Service">Labor/Service</SelectItem>
                        <SelectItem value="Bundle">Bundle Kit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* section 2: Automation Hub */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/5 p-4 rounded-xl ring-1 ring-border">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 uppercase font-bold tracking-widest text-primary">
                      <Hash className="size-3" /> Asset ID
                    </Label>
                    <Input name="productId" defaultValue={editingProduct?.productId} placeholder="Leave empty for auto-seq" className="font-mono bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 uppercase font-bold tracking-widest text-accent">
                      <Sparkles className="size-3" /> SKU / Barcode
                    </Label>
                    <Input name="sku" defaultValue={editingProduct?.sku} placeholder="Leave empty for auto-seq" className="font-mono bg-background" />
                  </div>
                </div>

                {/* section 3: Financials & Measurement */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest text-muted-foreground">Category</Label>
                    <Select name="categoryId" defaultValue={editingProduct?.categoryId || "none"}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Uncategorized</SelectItem>
                        {categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest text-muted-foreground">UoM</Label>
                    <Select name="uomId" defaultValue={editingProduct?.uomId}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {uoms?.map(uom => <SelectItem key={uom.id} value={uom.id}>{uom.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest text-primary">Base Price</Label>
                    <Input name="basePrice" type="number" step="0.01" defaultValue={editingProduct?.basePrice} required className="h-9 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest text-muted-foreground">Unit Cost</Label>
                    <Input name="costPrice" type="number" step="0.01" defaultValue={editingProduct?.costPrice} required className="h-9 opacity-60" />
                  </div>
                </div>

                {/* section 4: Predictive & Advanced Tracking */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl bg-accent/5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2 uppercase font-black tracking-tighter">
                          <Timer className="size-3.5 text-accent" /> Expiry Controls
                        </Label>
                        <p className="text-[10px] text-muted-foreground">Predict batch lifecycles automatically.</p>
                      </div>
                      <Switch name="trackExpiry" defaultChecked={editingProduct?.trackExpiry} />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[9px] font-bold opacity-60">Standard Shelf Life (Days)</Label>
                      <Input name="shelfLife" type="number" defaultValue={editingProduct?.shelfLifeDays || 0} placeholder="e.g. 365" className="h-8 bg-background" />
                    </div>
                  </div>

                  <div className="space-y-4 border-l pl-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2 uppercase font-black tracking-tighter">
                          <Barcode className="size-3.5 text-primary" /> Serialized
                        </Label>
                        <p className="text-[10px] text-muted-foreground">Track unique identifiers per unit.</p>
                      </div>
                      <Switch name="trackSerials" defaultChecked={editingProduct?.trackSerials} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2 uppercase font-black tracking-tighter">
                          <Layers className="size-3.5 text-primary" /> Variations
                        </Label>
                        <p className="text-[10px] text-muted-foreground">Enable size, dosage, or color attributes.</p>
                      </div>
                      <Switch name="hasVariants" defaultChecked={editingProduct?.hasVariants} />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex items-start gap-3">
                  <Info className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    <strong>Automation King:</strong> Leaving the ID or SKU fields empty will trigger the sequence generator based on your <strong>Admin &gt; Doc Numbering</strong> settings.
                  </p>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-10 font-bold uppercase">Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 px-10 font-bold uppercase text-xs shadow-xl shadow-primary/20 gap-2">
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Commit Asset
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
