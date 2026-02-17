'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { 
  Scale, 
  RefreshCw, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  PieChart,
  ArrowRightLeft,
  Info,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculateInventoryValuation, type ProductValuation, type ValuationMethod } from "@/lib/inventory/valuation.service";
import { toast } from "@/hooks/use-toast";

export default function InventoryValuationPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [method, setMethod] = useState<ValuationMethod>('WeightedAverage');
  const [valuations, setValuations] = useState<ProductValuation[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const runValuation = async () => {
    if (!selectedInstId) return;
    setIsCalculating(true);
    try {
      const results = await calculateInventoryValuation(db, selectedInstId, method);
      setValuations(results);
      toast({ title: "Valuation Complete", description: `Computed using ${method} logic.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Calculation Error" });
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (selectedInstId) runValuation();
  }, [selectedInstId, method]);

  const totalAssetBase = valuations.reduce((sum, v) => sum + v.totalValue, 0);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Scale className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Asset Valuation</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Inventory Financial Integrity</p>
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

            <Button size="sm" variant="outline" className="gap-2 h-9 text-xs font-bold uppercase" onClick={runValuation} disabled={!selectedInstId || isCalculating}>
              {isCalculating ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Recalculate
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Calculator className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access inventory asset books.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Asset Value</span>
                  <PieChart className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{currency} {totalAssetBase.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground mt-1 uppercase font-medium">Balance Sheet Position</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Active Valuation Logic</span>
                  <Scale className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{method}</div>
                  <p className="text-[9px] text-muted-foreground mt-1 uppercase font-medium">Current Methodology</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Item Count</span>
                  <Badge variant="outline" className="text-[9px] h-4 font-bold">{valuations.length} SKUs</Badge>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">Consolidated</div>
                  <p className="text-[9px] text-muted-foreground mt-1 uppercase font-medium">Unique Stock Nodes</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex gap-1 p-1 bg-secondary/20 rounded-lg w-fit">
                {(['FIFO', 'LIFO', 'WeightedAverage'] as ValuationMethod[]).map((m) => (
                  <Button 
                    key={m} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 px-4 text-[10px] font-bold uppercase tracking-wider ${method === m ? 'bg-background shadow-sm text-primary' : 'opacity-50'}`}
                    onClick={() => setMethod(m)}
                  >
                    {m === 'WeightedAverage' ? 'Weighted Avg' : m}
                  </Button>
                ))}
              </div>

              <div className="p-3 bg-secondary/10 border rounded-lg flex items-start gap-3 max-w-md">
                <Info className="size-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-tight italic">
                  {method === 'FIFO' && "FIFO: Oldest stock costs are applied first. Best for periods of rising prices."}
                  {method === 'LIFO' && "LIFO: Newest stock costs are applied first. Minimizes tax liability in inflation."}
                  {method === 'WeightedAverage' && "Weighted Average: Smooths out price fluctuations across all batches."}
                </p>
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Catalog Item</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Qty on Hand</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Computed Unit Cost</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Total Asset Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCalculating ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs uppercase font-bold animate-pulse">Running {method} Engine...</TableCell></TableRow>
                  ) : valuations.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold opacity-30">No active stock to value.</TableCell></TableRow>
                  ) : valuations.map((v) => (
                    <TableRow key={v.productId} className="h-14 hover:bg-secondary/5 transition-colors border-b-border/30">
                      <TableCell className="pl-6 text-xs font-bold">{v.productName}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{v.totalQuantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs opacity-60">{currency} {v.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-black pr-6 text-primary">{currency} {v.totalValue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/5 h-14 border-t-2 border-primary/20">
                    <TableCell colSpan={3} className="pl-6 text-xs font-black uppercase tracking-widest">Consolidated Portfolio Value</TableCell>
                    <TableCell className="text-right pr-6 font-mono text-lg font-black text-primary underline decoration-double">
                      {currency} {totalAssetBase.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}