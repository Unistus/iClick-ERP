'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Boxes, Plus, Search, Package, Box, ArrowRight, Trash2, Settings2 } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BundlesCombosPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const bundlesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'products'), where('type', '==', 'Bundle'));
  }, [db, selectedInstId]);
  const { data: bundles, isLoading } = useCollection(bundlesQuery);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Boxes className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Bundles & Combos</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Bill of Materials (BOM) Hub</p>
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
              <Plus className="size-4" /> New Bundle
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Boxes className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage product kits.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search bundles..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase">{bundles?.length || 0} Registered Kits</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Bundle Identity</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Base SKU</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Price</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Management</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Syncing assembly lines...</TableCell></TableRow>
                    ) : !bundles || bundles.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No product bundles configured.</TableCell></TableRow>
                    ) : bundles.map((b) => (
                      <TableRow key={b.id} className="h-14 hover:bg-secondary/5 transition-colors border-b-border/30">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                              <Boxes className="size-4" />
                            </div>
                            <span className="text-xs font-bold uppercase">{b.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono font-bold text-muted-foreground">{b.sku}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-black">KES {b.basePrice?.toLocaleString()}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" className="size-8 text-primary"><Settings2 className="size-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="size-8 text-destructive"><Trash2 className="size-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow bg-secondary/5">
                <CardHeader><CardTitle className="text-xs font-black uppercase tracking-[0.2em]">BOM Intelligence</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[11px] leading-relaxed opacity-70">
                    Product Bundles allow you to sell a collection of items under a single parent SKU. The system will automatically calculate the maximum sellable bundles based on the lowest common denominator of component stock levels.
                  </p>
                  <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex items-start gap-3">
                    <Box className="size-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase text-primary">Real-time Kit Assembly</p>
                      <p className="text-[10px] leading-snug">Stock is deducted from component SKUs at the time of sale completion.</p>
                    </div>
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
