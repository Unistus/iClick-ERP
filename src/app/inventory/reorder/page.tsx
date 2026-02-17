'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { ShoppingCart, Search, RefreshCw, AlertTriangle, ArrowRight, PackageSearch, BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function ReorderLevelsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'products'), orderBy('name', 'asc'));
  }, [db, selectedInstId]);
  const { data: products, isLoading } = useCollection(productsQuery);

  // Filter for items below threshold
  const criticalProducts = products?.filter(p => p.type === 'Stock' && p.totalStock <= (p.reorderLevel || 0)) || [];
  const filteredProducts = criticalProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-amber-500/20 text-amber-500">
              <BellRing className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Reorder Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Threshold & Safety Stock Monitoring</p>
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

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId}>
              <ShoppingCart className="size-4" /> Bulk PO
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <PackageSearch className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to view safety stock alerts.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-destructive">Critical Stock-outs</span>
                  <AlertTriangle className="size-3 text-destructive" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-destructive">{criticalProducts.filter(p => p.totalStock <= 0).length} ITEMS</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-amber-500">Below Reorder Point</span>
                  <BellRing className="size-3 text-amber-500" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-amber-500">{criticalProducts.length} ITEMS</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Avg Safety Buffer</span>
                  <RefreshCw className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">STABLE</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search alerts..." 
                    className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase bg-background">Urgent Procurement Required</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Catalog Item</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">On Hand</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Safety Level</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black w-[250px]">Stock Pulse</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse">Scanning safety thresholds...</TableCell></TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">All stock levels are within safety parameters.</TableCell></TableRow>
                    ) : filteredProducts.map((p) => {
                      const pct = p.reorderLevel > 0 ? (p.totalStock / p.reorderLevel) * 100 : 0;
                      return (
                        <TableRow key={p.id} className="h-16 hover:bg-secondary/5 transition-colors group border-b-border/30">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase">{p.name}</span>
                              <span className="text-[9px] font-mono text-primary uppercase">SKU: {p.sku}</span>
                            </div>
                          </TableCell>
                          <TableCell className={`text-xs font-black ${p.totalStock <= 0 ? 'text-destructive' : 'text-amber-500'}`}>
                            {p.totalStock?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground">
                            {p.reorderLevel?.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5 px-4">
                              <div className="flex justify-between text-[9px] font-bold uppercase">
                                <span className="opacity-50">Buffer Usage</span>
                                <span className={p.totalStock <= 0 ? 'text-destructive' : 'text-amber-500'}>{pct.toFixed(0)}%</span>
                              </div>
                              <Progress value={Math.min(pct, 100)} className={`h-1 ${p.totalStock <= 0 ? '[&>div]:bg-destructive' : '[&>div]:bg-amber-500'}`} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button size="sm" variant="ghost" className="h-8 text-[10px] font-bold uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              Create PO <ArrowRight className="size-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
