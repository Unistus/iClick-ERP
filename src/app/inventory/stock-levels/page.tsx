'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  SearchCode, 
  Search, 
  Warehouse, 
  Package, 
  Filter, 
  RefreshCw,
  Box,
  LayoutGrid,
  TrendingDown,
  Info,
  ExternalLink
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, where, doc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

export default function StockLevelsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'products'), orderBy('name', 'asc'));
  }, [db, selectedInstId]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const warehousesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'warehouses');
  }, [db, selectedInstId]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const batchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'batches');
  }, [db, selectedInstId]);
  const { data: batches } = useCollection(batchesQuery);

  // Filtering Logic
  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    return true;
  }) || [];

  const getWarehouseStock = (productId: string, warehouseId: string) => {
    const productBatches = batches?.filter(b => b.productId === productId && b.warehouseId === warehouseId) || [];
    return productBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <SearchCode className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Stock Visibility Matrix</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Multi-site Inventory Levels</p>
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

            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase" disabled={!selectedInstId}>
              <RefreshCw className="size-3.5" /> Re-index
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <LayoutGrid className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access its storage matrix.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find SKU or Product..." 
                  className="pl-9 h-9 text-xs bg-card border-none ring-1 ring-border" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-9 px-4 text-[10px] font-bold uppercase bg-primary/5 text-primary border-primary/20">
                  {warehouses?.length || 0} Storage Sites Monitored
                </Badge>
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6 sticky left-0 bg-secondary/20 z-10 w-[250px]">Product / SKU</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center border-x w-[120px]">Global Total</TableHead>
                      {warehouses?.map(w => (
                        <TableHead key={w.id} className="h-10 text-[10px] uppercase font-black text-center min-w-[120px]">
                          {w.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading ? (
                      <TableRow><TableCell colSpan={(warehouses?.length || 0) + 2} className="text-center py-12 animate-pulse">Syncing levels...</TableCell></TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow><TableCell colSpan={(warehouses?.length || 0) + 2} className="text-center py-20 text-muted-foreground">No matching products found.</TableCell></TableRow>
                    ) : filteredProducts.map((p) => (
                      <TableRow key={p.id} className="h-14 hover:bg-secondary/10 transition-colors group">
                        <TableCell className="pl-6 sticky left-0 bg-card group-hover:bg-secondary/10 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase truncate max-w-[200px]">{p.name}</span>
                            <span className="text-[9px] font-mono text-primary font-bold">{p.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center border-x font-mono text-xs font-black bg-primary/5">
                          {p.totalStock?.toLocaleString() || 0}
                        </TableCell>
                        {warehouses?.map(w => {
                          const stock = getWarehouseStock(p.id, w.id);
                          return (
                            <TableCell key={w.id} className="text-center font-mono text-xs">
                              {stock > 0 ? (
                                <span className="font-bold">{stock.toLocaleString()}</span>
                              ) : (
                                <span className="text-muted-foreground/30">0</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5"><Info className="size-24" /></div>
                <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Visibility Logic</CardTitle></CardHeader>
                <CardContent className="text-[11px] leading-relaxed opacity-70">
                  Global Total is calculated as the institutional aggregate. Warehouse-specific levels are derived from active batch LOT balances. Discrepancies between Global Total and Batch Aggregates should be reconciled in <strong>Stock Adjustments</strong>.
                </CardContent>
              </Card>
              <Card className="bg-secondary/10 border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest">Inventory Health</CardTitle></CardHeader>
                <CardContent className="flex items-center gap-4">
                  <div className="size-10 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <TrendingDown className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold">Distribution Balance: Healthy</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Stock is evenly spread across 84% of sites.</p>
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
