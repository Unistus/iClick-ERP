'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, where, doc, limit } from "firebase/firestore";
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Printer, 
  ChevronRight,
  Settings2,
  RefreshCw,
  Wallet,
  Hourglass,
  ShoppingCart,
  LayoutGrid,
  FileText,
  Activity,
  Zap,
  PackageSearch,
  History,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";

type PurchaseReportType = 'VALUATION' | 'VENDOR_PERF' | 'AGING' | 'PO_STATUS' | 'LEAD_TIME';

interface ReportCategory {
  title: string;
  reports: {
    id: PurchaseReportType;
    title: string;
    description: string;
    icon: any;
  }[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    title: "Expenditure & Debt",
    reports: [
      { id: 'VALUATION', title: "Procurement Valuation", description: "Gross incoming asset value.", icon: Wallet },
      { id: 'AGING', title: "Vendor Aging Audit", description: "Liability maturity analysis.", icon: Hourglass },
    ]
  },
  {
    title: "Operational Velocity",
    reports: [
      { id: 'PO_STATUS', title: "Order Pipeline", description: "Draft vs Received vs Billed status.", icon: LayoutGrid },
      { id: 'VENDOR_PERF', title: "Vendor Loyalty", description: "Top performing supplier entities.", icon: TrendingUp },
    ]
  }
];

export default function PurchasesReportsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [activeReport, setActiveReport] = useState<PurchaseReportType>('VALUATION');
  const [dataTimestamp, setDataTimestamp] = useState<string>("");

  useEffect(() => {
    setDataTimestamp(new Date().toLocaleTimeString());
  }, []);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const poQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'purchase_orders'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: orders, isLoading: ordersLoading } = useCollection(poQuery);

  const vendorInvoicesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'vendor_invoices'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: invoices } = useCollection(vendorInvoicesQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const ValuationSummary = () => {
    const totalOrdered = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const totalInvoiced = invoices?.reduce((sum, i) => sum + (i.total || 0), 0) || 0;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="p-4 pb-2"><p className="text-[10px] font-black uppercase text-primary tracking-widest">Total Committed Spend</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-xl font-bold font-headline">{currency} {totalOrdered.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="p-4 pb-2"><p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Booked Liability</p></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-xl font-bold font-headline">{currency} {totalInvoiced.toLocaleString()}</p></CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b pb-2">Top Spend Categories</h3>
          <div className="p-12 text-center border-2 border-dashed rounded-2xl opacity-20 italic">
            <Activity className="size-8 mx-auto mb-2" />
            <p className="text-[10px] font-bold uppercase">Dynamic categorization pending dataset growth.</p>
          </div>
        </section>
      </div>
    );
  };

  const PipelineReport = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="p-6 rounded-2xl bg-secondary/10 border border-border/50">
          <p className="text-[10px] font-black uppercase opacity-50 mb-1">Draft Orders</p>
          <p className="text-3xl font-black font-headline text-primary">{orders?.filter(o => o.status === 'Draft').length || 0}</p>
        </div>
        <div className="p-6 rounded-2xl bg-secondary/10 border border-border/50">
          <p className="text-[10px] font-black uppercase opacity-50 mb-1">Stock Received</p>
          <p className="text-3xl font-black font-headline text-accent">{orders?.filter(o => o.status === 'Received').length || 0}</p>
        </div>
        <div className="p-6 rounded-2xl bg-secondary/10 border border-border/50">
          <p className="text-[10px] font-black uppercase opacity-50 mb-1">Finalized Bills</p>
          <p className="text-3xl font-black font-headline text-emerald-500">{invoices?.length || 0}</p>
        </div>
      </div>

      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow>
            <TableHead className="text-[10px] uppercase font-black pl-6">PO #</TableHead>
            <TableHead className="text-[10px] uppercase font-black">Supplier</TableHead>
            <TableHead className="text-[10px] uppercase font-black text-center">Status</TableHead>
            <TableHead className="text-[10px] uppercase font-black text-right pr-6">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.slice(0, 10).map(o => (
            <TableRow key={o.id} className="h-12 border-b-border/30 hover:bg-secondary/5">
              <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">{o.poNumber}</TableCell>
              <TableCell className="text-xs font-bold uppercase tracking-tight">{o.supplierName}</TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="text-[8px] h-4 uppercase font-black border-primary/20">{o.status}</Badge>
              </TableCell>
              <TableCell className="text-right pr-6 font-mono text-xs font-black">{currency} {o.total?.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Purchasing Intelligence</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Institutional Expenditure Audits</p>
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
            <PackageSearch className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize procurement analytics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 items-start">
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
                    <Settings2 className="size-3" /> Report Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[8px] uppercase font-black opacity-40">Analysis Basis</span>
                    <Select defaultValue="Accrual">
                      <SelectTrigger className="h-8 text-xs bg-background border-none ring-1 ring-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Accrual" className="text-xs">Accrual Basis</SelectItem>
                        <SelectItem value="Cash" className="text-xs">Cash Basis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full h-9 text-[10px] font-black uppercase gap-2 bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20">
                    <RefreshCw className="size-3" /> Refresh Data
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-9">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card min-h-[750px] flex flex-col overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-secondary/10 px-8 py-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1.5">
                      <Badge variant="outline" className="text-[10px] h-5 bg-background font-black tracking-tighter border-primary/20 text-primary">PROCUREMENT AUDIT</Badge>
                      <h2 className="text-3xl font-headline font-bold text-foreground">
                        {REPORT_CATEGORIES.flatMap(c => c.reports).find(r => r.id === activeReport)?.title}
                      </h2>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5 uppercase tracking-tight">
                          <Clock className="size-3.5 text-primary" />
                          <span>Real-time Ledger Pull</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Authorized Legal Entity</p>
                      <p className="text-sm font-bold text-primary">{institutions?.find(i => i.id === selectedInstId)?.name || '...'}</p>
                    </div>
                  </div>
                </CardHeader>
                
                <ScrollArea className="flex-1 p-8">
                  {ordersLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center space-y-4">
                      <Activity className="size-8 animate-spin text-primary opacity-30" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Aggregating Purchase Sub-ledgers...</p>
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-700">
                      {activeReport === 'VALUATION' && <ValuationSummary />}
                      {activeReport === 'PO_STATUS' && <PipelineReport />}
                      {activeReport !== 'VALUATION' && activeReport !== 'PO_STATUS' && (
                        <div className="h-96 flex flex-col items-center justify-center space-y-4 border-2 border-dashed rounded-3xl opacity-20 italic">
                          <Zap className="size-12" />
                          <div className="text-center">
                            <p className="font-bold uppercase tracking-widest text-xs">Generating Advanced Insights...</p>
                            <p className="text-[10px] mt-1">Dataset complexity requires higher index depth.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-6 bg-secondary/10 border-t border-border/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">
                      Audit Stream Active: {dataTimestamp}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-primary hover:bg-primary/5">Schedule Update</Button>
                    <Button size="sm" className="h-8 text-[9px] font-black uppercase bg-primary px-6 shadow-lg shadow-primary/20">Sign Statement</Button>
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
