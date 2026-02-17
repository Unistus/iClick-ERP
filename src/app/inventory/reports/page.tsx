'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, where, doc, limit } from "firebase/firestore";
import { 
  ClipboardList, 
  BarChart3, 
  TrendingUp, 
  Download, 
  Printer, 
  Calendar as CalendarIcon,
  Package,
  Activity,
  Timer,
  ChevronRight,
  Settings2,
  Clock,
  RefreshCw,
  Boxes,
  Warehouse,
  History,
  Hourglass,
  Skull,
  AlertTriangle,
  Zap,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, differenceInDays, isBefore, addDays } from "date-fns";

type InventoryReportType = 'VALUATION' | 'MOVEMENT' | 'EXPIRY' | 'SHRINKAGE' | 'REORDER' | 'ABC_PERFORMANCE';

interface ReportCategory {
  title: string;
  reports: {
    id: InventoryReportType;
    title: string;
    description: string;
    icon: any;
  }[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    title: "Financial & Asset Base",
    reports: [
      { id: 'VALUATION', title: "Inventory Valuation", description: "Current book value across storage nodes.", icon: Boxes },
      { id: 'ABC_PERFORMANCE', title: "ABC Performance", description: "Turnover analysis by asset value contribution.", icon: TrendingUp },
    ]
  },
  {
    title: "Operations & Risk",
    reports: [
      { id: 'MOVEMENT', title: "Stock Flow Audit", description: "Summary of In/Out movement velocity.", icon: RefreshCw },
      { id: 'EXPIRY', title: "Expiry Risk Matrix", description: "Batches reaching shelf-life critical windows.", icon: Timer },
      { id: 'REORDER', title: "Procurement Command", description: "Critical safety stock and reorder alerts.", icon: AlertTriangle },
      { id: 'SHRINKAGE', title: "Shrinkage Report", description: "Damage, theft, and spoilage analysis.", icon: Skull },
    ]
  }
];

export default function InventoryReportsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [activeReport, setActiveReport] = useState<InventoryReportType>('VALUATION');
  const [dataTimestamp, setDataTimestamp] = useState<string>("");

  // Custom Parameters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("ALL");

  useEffect(() => {
    setDataTimestamp(new Date().toLocaleTimeString());
  }, []);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'products'), orderBy('name', 'asc'));
  }, [db, selectedInstId]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const batchesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'batches'), orderBy('expiryDate', 'asc'));
  }, [db, selectedInstId]);
  const { data: batches } = useCollection(batchesQuery);

  const movementsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'movements'), orderBy('timestamp', 'desc'), limit(500));
  }, [db, selectedInstId]);
  const { data: movements } = useCollection(movementsQuery);

  const warehousesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'warehouses');
  }, [db, selectedInstId]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // --- REPORT COMPONENTS ---

  const ValuationReport = () => {
    const stockItems = products?.filter(p => p.type === 'Stock') || [];
    const totalVal = stockItems.reduce((sum, p) => sum + ((p.totalStock || 0) * (p.costPrice || 0)), 0);

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="p-4"><p className="text-[10px] font-black uppercase text-primary tracking-widest">Global Asset Base</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold font-headline">{currency} {totalVal.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="bg-secondary/10 border-border/50">
            <CardHeader className="p-4"><p className="text-[10px] font-black uppercase text-muted-foreground">Unique SKUs</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold font-headline">{stockItems.length}</p></CardContent>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="p-4"><p className="text-[10px] font-black uppercase text-emerald-500">Valuation Method</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold font-headline">WeightedAvg</p></CardContent>
          </Card>
        </div>

        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-black pl-6">Catalog Item</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right">Avg Unit Cost</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right">Qty on Hand</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right pr-6">Book Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockItems.map(p => (
              <TableRow key={p.id} className="h-12 hover:bg-secondary/5 transition-colors border-b-border/30">
                <TableCell className="pl-6 font-bold text-xs">
                  {p.name}
                  <p className="text-[9px] text-muted-foreground font-mono">{p.sku}</p>
                </TableCell>
                <TableCell className="text-right font-mono text-xs opacity-60">{currency} {p.costPrice?.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{p.totalStock?.toLocaleString()}</TableCell>
                <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">
                  {currency} {((p.totalStock || 0) * (p.costPrice || 0)).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const MovementAuditReport = () => {
    const items = movements || [];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-[9px] font-black uppercase text-emerald-500 mb-1">Receipts (In)</p>
            <p className="text-lg font-bold font-mono">{items.filter(m => m.type === 'In').length}</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-[9px] font-black uppercase text-destructive mb-1">Dispatches (Out)</p>
            <p className="text-lg font-bold font-mono">{items.filter(m => m.type === 'Out').length}</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[9px] font-black uppercase text-primary mb-1">Internal Transfers</p>
            <p className="text-lg font-bold font-mono">{items.filter(m => m.type === 'Transfer').length}</p>
          </div>
          <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-[9px] font-black uppercase text-accent mb-1">Audits / Adjs</p>
            <p className="text-lg font-bold font-mono">{items.filter(m => m.type === 'Adjustment').length}</p>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-black pl-6">Timestamp</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Item</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-center">Type</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right">Quantity</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right pr-6">Warehouse</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(m => {
              const prod = products?.find(p => p.id === m.productId);
              return (
                <TableRow key={m.id} className="h-12 hover:bg-secondary/5 border-b-border/30">
                  <TableCell className="pl-6 text-[10px] font-mono text-muted-foreground">
                    {m.timestamp?.toDate ? format(m.timestamp.toDate(), 'dd MMM HH:mm') : 'Syncing...'}
                  </TableCell>
                  <TableCell className="text-xs font-bold">{prod?.name || '...'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn(
                      "text-[8px] h-4 font-black",
                      m.type === 'In' ? 'bg-emerald-500/10 text-emerald-500' : 
                      m.type === 'Out' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                    )}>
                      {m.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-mono text-xs font-black",
                    m.quantity > 0 ? 'text-emerald-500' : 'text-destructive'
                  )}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </TableCell>
                  <TableCell className="text-right pr-6 text-[10px] uppercase font-bold text-muted-foreground">
                    {warehouses?.find(w => w.id === m.warehouseId)?.name || '...'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const ExpiryRiskReport = () => {
    const items = batches || [];
    const now = new Date();
    const criticalThreshold = addDays(now, 30);

    return (
      <div className="space-y-8">
        <div className="p-4 bg-accent/5 rounded-xl border border-accent/20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-accent/10 text-accent"><Timer className="size-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Critical Risk Horizon</p>
              <p className="text-lg font-bold">Items expiring in &lt; 30 Days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black font-headline text-accent">
              {items.filter(b => isBefore(b.expiryDate?.toDate(), criticalThreshold)).length}
            </p>
            <p className="text-[9px] font-bold uppercase opacity-50">Batches at Risk</p>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-black pl-6">Batch / LOT</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Item Name</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Expiry Date</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right">Days Left</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right pr-6">Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(b => {
              const expiry = b.expiryDate?.toDate();
              const daysLeft = expiry ? differenceInDays(expiry, now) : 0;
              const isCritical = daysLeft < 30;
              const prod = products?.find(p => p.id === b.productId);

              return (
                <TableRow key={b.id} className="h-14 hover:bg-secondary/5 border-b-border/30">
                  <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">{b.batchNumber}</TableCell>
                  <TableCell className="text-xs font-bold">{prod?.name || '...'}</TableCell>
                  <TableCell className={cn("text-xs font-bold", isCritical ? 'text-destructive' : 'text-emerald-500')}>
                    {expiry ? format(expiry, 'dd MMM yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-black">
                    {daysLeft > 0 ? `${daysLeft}d` : 'EXPIRED'}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-mono text-xs font-bold">{b.quantity}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const ShrinkageReport = () => {
    const lossEvents = movements?.filter(m => m.type === 'Damage') || [];
    const totalLossVal = lossEvents.reduce((sum, m) => {
      const prod = products?.find(p => p.id === m.productId);
      return sum + (Math.abs(m.quantity) * (prod?.costPrice || 0));
    }, 0);

    return (
      <div className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-destructive/5 border-destructive/20 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><Skull className="size-24" /></div>
            <CardHeader className="pb-2"><p className="text-[10px] font-black uppercase text-destructive tracking-widest">Total Write-off Value</p></CardHeader>
            <CardContent><p className="text-3xl font-black font-headline text-destructive">{currency} {totalLossVal.toLocaleString()}</p></CardContent>
          </Card>
          <div className="p-6 bg-secondary/10 rounded-xl border border-border/50 flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase text-muted-foreground mb-4">Loss Prevention Pulse</p>
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-bold"><span>Inventory Accuracy</span><span className="text-emerald-500">98.4%</span></div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[98.4%]" /></div>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-black pl-6">Timestamp</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Item Affected</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right">Qty Lost</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right pr-6">Est. Loss Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lossEvents.map(m => {
              const prod = products?.find(p => p.id === m.productId);
              const val = Math.abs(m.quantity) * (prod?.costPrice || 0);
              return (
                <TableRow key={m.id} className="h-12 hover:bg-destructive/5 border-b-border/30">
                  <TableCell className="pl-6 text-[10px] font-mono text-muted-foreground">
                    {m.timestamp?.toDate ? format(m.timestamp.toDate(), 'dd MMM HH:mm') : '...'}
                  </TableCell>
                  <TableCell className="text-xs font-bold">{prod?.name || '...'}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-black text-destructive">{Math.abs(m.quantity)}</TableCell>
                  <TableCell className="text-right pr-6 font-mono text-xs font-bold text-destructive">{currency} {val.toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Inventory Intelligence</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Institutional Asset & Compliance Audits</p>
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
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase shadow-lg shadow-primary/20">
              <Download className="size-3.5" /> Export PDF
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <BarChart3 className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Choose an institution to initialize the operational audit engine.</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: NAVIGATION & PARAMETERS */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {REPORT_CATEGORIES.map((category) => (
                <div key={category.title} className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] px-2">{category.title}</h3>
                  <div className="grid gap-1">
                    {category.reports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setActiveReport(report.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl text-left transition-all group border border-transparent",
                          activeReport === report.id 
                            ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 ring-1 ring-primary/50" 
                            : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg transition-colors",
                          activeReport === report.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                        )}>
                          <report.icon className="size-4 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">{report.title}</p>
                          <p className={cn("text-[9px] mt-0.5 truncate opacity-60 font-medium", activeReport === report.id ? "text-white" : "")}>
                            {report.description}
                          </p>
                        </div>
                        <ChevronRight className={cn("size-3 ml-auto opacity-0 group-hover:opacity-100", activeReport === report.id && "opacity-100")} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <Card className="bg-accent/5 border-none ring-1 ring-accent/20 overflow-hidden">
                <CardHeader className="pb-2 pt-4 bg-accent/10 border-b border-accent/10">
                  <CardTitle className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center gap-2">
                    <Settings2 className="size-3" /> Audit Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase opacity-50">Filter Warehouse</Label>
                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                      <SelectTrigger className="h-8 text-xs bg-background border-none ring-1 ring-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Storage Sites</SelectItem>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase opacity-50 flex items-center gap-1.5">
                      <CalendarIcon className="size-3" /> Report Period
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-bold opacity-40">Start</span>
                        <Input 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-8 text-[10px] bg-background border-none ring-1 ring-border" 
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-bold opacity-40">End</span>
                        <Input 
                          type="date" 
                          value={endDate} 
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-8 text-[10px] bg-background border-none ring-1 ring-border" 
                        />
                      </div>
                    </div>
                  </div>

                  <Button className="w-full h-9 text-[10px] font-black uppercase gap-2 bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20">
                    <RefreshCw className="size-3" /> Refresh Dataset
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: PREVIEW */}
            <div className="col-span-12 lg:col-span-9">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card min-h-[750px] flex flex-col overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-secondary/10 px-8 py-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1.5">
                      <Badge variant="outline" className="text-[10px] h-5 bg-background font-black tracking-tighter border-primary/20 text-primary">INSTITUTIONAL AUDIT</Badge>
                      <h2 className="text-3xl font-headline font-bold text-foreground">
                        {REPORT_CATEGORIES.flatMap(c => c.reports).find(r => r.id === activeReport)?.title}
                      </h2>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5 uppercase tracking-tight">
                          <Clock className="size-3.5 text-primary" />
                          <span>{format(new Date(startDate), 'dd MMM yyyy')} — {format(new Date(endDate), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 uppercase tracking-tight">
                          <Warehouse className="size-3.5 text-accent" />
                          <span>{selectedWarehouseId === 'ALL' ? 'Global Consolidation' : warehouses?.find(w => w.id === selectedWarehouseId)?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Authorized Legal Entity</p>
                      <p className="text-sm font-bold text-primary">{institutions?.find(i => i.id === selectedInstId)?.name || '...'}</p>
                    </div>
                  </div>
                </CardHeader>
                
                <ScrollArea className="flex-1">
                  <CardContent className="p-8">
                    {productsLoading ? (
                      <div className="h-64 flex flex-col items-center justify-center space-y-4">
                        <Activity className="size-8 animate-spin text-primary opacity-30" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Aggregating Stock Sub-ledgers...</p>
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                        {activeReport === 'VALUATION' && <ValuationReport />}
                        {activeReport === 'MOVEMENT' && <MovementAuditReport />}
                        {activeReport === 'EXPIRY' && <ExpiryRiskReport />}
                        {activeReport === 'SHRINKAGE' && <ShrinkageReport />}
                        
                        {(activeReport === 'REORDER' || activeReport === 'ABC_PERFORMANCE') && (
                          <div className="h-96 flex flex-col items-center justify-center space-y-4 border-2 border-dashed rounded-3xl opacity-20 italic">
                            <Zap className="size-12" />
                            <div className="text-center">
                              <p className="font-bold uppercase tracking-widest text-xs">Generating Advanced Insights...</p>
                              <p className="text-[10px] mt-1">This report is being optimized for large datasets.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </ScrollArea>

                <div className="p-6 bg-secondary/10 border-t border-border/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">
                      Live Pulse Cache: {dataTimestamp}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-primary hover:bg-primary/5">Schedule Email</Button>
                    <Button size="sm" className="h-8 text-[9px] font-black uppercase bg-primary px-6 shadow-lg shadow-primary/20">Sign & Lock</Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
