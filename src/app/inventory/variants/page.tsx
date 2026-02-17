'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tags, Plus, Search, Sliders, Hash, Edit2, LayoutGrid, AlertCircle } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VariantsManagementPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'products'), orderBy('name', 'asc'));
  }, [db, selectedInstId]);
  const { data: products, isLoading } = useCollection(productsQuery);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Tags className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Product Variants</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Multi-attribute Catalog Management</p>
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

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId}>
              <Plus className="size-4" /> Add Attributes
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Sliders className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure item variations.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Filter by parent product..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase">Attribute Matrix</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Parent Product</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Active Variations</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-12 text-xs animate-pulse uppercase font-bold">Indexing matrix...</TableCell></TableRow>
                    ) : products?.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">Catalog empty.</TableCell></TableRow>
                    ) : products?.slice(0, 10).map((p) => (
                      <TableRow key={p.id} className="h-14 hover:bg-secondary/10 transition-colors group border-b-border/30">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase">{p.name}</span>
                            <span className="text-[9px] font-mono text-muted-foreground">SKU: {p.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary" className="text-[8px] h-4 font-bold bg-primary/10 text-primary border-none">STANDARD</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100">
                            <Edit2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                    <LayoutGrid className="size-3" /> Attribute Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[11px] leading-relaxed opacity-70">
                    Variants enable you to manage items with shared parent data but unique attributes.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold">Pharmacy: Dosage (50mg vs 100mg)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold">Retail: Size (Small, Medium, XL)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold">Bar: Vol (330ml vs 500ml)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none ring-1 ring-border shadow-sm">
                <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest">Global Attributes</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-3 border rounded bg-secondary/10 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Color</span>
                    <Badge variant="outline" className="text-[8px]">8 Values</Badge>
                  </div>
                  <div className="p-3 border rounded bg-secondary/10 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Size</span>
                    <Badge variant="outline" className="text-[8px]">12 Values</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
