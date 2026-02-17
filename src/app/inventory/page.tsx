'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Download, 
  ArrowUpDown, 
  Filter,
  Package,
  AlertTriangle,
  RefreshCw,
  MoreHorizontal,
  Box,
  Timer
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { isBefore, addDays } from "date-fns";
import Link from 'next/link';

export default function InventoryPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("SYSTEM");
  const [searchTerm, setSearchTerm] = useState("");

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'products'), orderBy('name', 'asc'));
  }, [db, selectedInstId]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const batchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'batches');
  }, [db, selectedInstId]);
  const { data: batches } = useCollection(batchesQuery);

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Logic: Expiry Alert count
  const criticalThreshold = addDays(new Date(), 30);
  const expiringSoonCount = batches?.filter(b => {
    const expiry = b.expiryDate?.toDate();
    return expiry && isBefore(expiry, criticalThreshold);
  }).length || 0;

  const lowStockCount = products?.filter(p => p.type === 'Stock' && p.totalStock <= (p.reorderLevel || 0)).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-headline font-bold">Stock Vault</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Multi-Tenant Catalog & Real-time Assets</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Link href="/inventory/products">
              <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2 h-9 text-xs uppercase font-bold">
                <Plus className="size-4" /> Add Item
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="size-8 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Box className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Total SKUs</p>
                  <p className="text-lg font-bold">{products?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="size-8 rounded bg-accent/10 text-accent flex items-center justify-center">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Low Re-order</p>
                  <p className="text-lg font-bold text-accent">{lowStockCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50 relative group overflow-hidden">
            <Link href="/inventory/expiry" className="absolute inset-0 z-10" />
            <CardContent className="pt-4 pb-4 relative z-0">
              <div className="flex items-center gap-4">
                <div className={`size-8 rounded flex items-center justify-center ${expiringSoonCount > 0 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-primary/10 text-primary'}`}>
                  <Timer className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Expiry Risk</p>
                  <p className={`text-lg font-bold ${expiringSoonCount > 0 ? 'text-destructive' : ''}`}>{expiringSoonCount} Batches</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="size-8 rounded bg-secondary text-muted-foreground flex items-center justify-center">
                  <RefreshCw className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Sync Status</p>
                  <p className="text-lg font-bold uppercase text-[10px]">Real-time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-none ring-1 ring-border/50 shadow-lg">
          <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4 py-3 border-b border-border/50">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search catalog..." 
                className="pl-9 h-9 bg-secondary/20 border-none text-xs" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 h-8 text-[10px] uppercase font-bold">
                <Filter className="size-3.5" /> Filter
              </Button>
              <Button variant="outline" size="sm" className="gap-2 h-8 text-[10px] uppercase font-bold">
                <Download className="size-3.5" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead className="h-9 text-[10px] uppercase font-bold pl-6">SKU</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Product Name</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold text-center">Type</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold text-right">Total Stock</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold text-right">Re-order</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs animate-pulse">Scanning vault...</TableCell></TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground font-bold uppercase opacity-30 tracking-widest">Catalog Empty</TableCell></TableRow>
                ) : filteredProducts.map((item) => {
                  const isLow = item.type === 'Stock' && item.totalStock <= (item.reorderLevel || 0);
                  return (
                    <TableRow key={item.id} className="hover:bg-secondary/10 h-12 group transition-colors">
                      <TableCell className="font-mono text-[10px] pl-6 font-bold text-primary">{item.sku}</TableCell>
                      <TableCell className="text-xs font-bold">{item.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[8px] h-4 font-bold bg-background/50 border-none ring-1 ring-border">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs font-black ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                        {item.totalStock?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-right text-[10px] font-mono opacity-50">{item.reorderLevel || 0}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {isLow && (
                            <Badge variant="destructive" className="text-[8px] h-4 font-black animate-pulse uppercase">LOW</Badge>
                          )}
                          <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
