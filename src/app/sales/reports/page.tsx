
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
  BarChart3, 
  TrendingUp, 
  Download, 
  Printer, 
  Calendar as CalendarIcon,
  ChevronRight,
  Settings2,
  Clock,
  RefreshCw,
  Wallet,
  Building2,
  Hourglass,
  Tag,
  Zap,
  Users,
  ShoppingCart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";

type SalesReportType = 'REVENUE' | 'PRODUCT_PERF' | 'CUSTOMER_AGING' | 'COMMISSIONS';

const REPORT_CATEGORIES = [
  {
    title: "Financial Performance",
    reports: [
      { id: 'REVENUE', title: "Revenue Breakdown", description: "Daily & Monthly gross sales summary.", icon: Wallet },
      { id: 'COMMISSIONS', title: "Commission Audit", description: "Calculated staff incentives by closed deals.", icon: Users },
    ]
  },
  {
    title: "Market Intelligence",
    reports: [
      { id: 'PRODUCT_PERF', title: "Product Velocity", description: "Sales volume by individual catalog item.", icon: TrendingUp },
      { id: 'CUSTOMER_AGING', title: "A/R Aging", description: "Credit sales maturity analysis.", icon: Hourglass },
    ]
  }
];

export default function SalesReportsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [activeReport, setActiveReport] = useState<SalesReportType>('REVENUE');
  const [dataTimestamp, setDataTimestamp] = useState<string>("");

  useEffect(() => {
    setDataTimestamp(new Date().toLocaleTimeString());
  }, []);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const invoicesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'sales_invoices'), orderBy('createdAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: invoices, isLoading: salesLoading } = useCollection(invoicesQuery);

  const RevenueReport = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4"><p className="text-[10px] font-black uppercase text-primary tracking-widest">Gross Billing</p></CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold font-headline">KES {invoices?.reduce((sum, i) => sum + i.total, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-4"><p className="text-[10px] font-black uppercase text-emerald-500">Collected</p></CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold font-headline">KES {invoices?.filter(i => i.isPaid).reduce((sum, i) => sum + i.total, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="p-4"><p className="text-[10px] font-black uppercase text-destructive">Outstanding</p></CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold font-headline">KES {invoices?.filter(i => !i.isPaid).reduce((sum, i) => sum + i.balance, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow>
            <TableHead className="text-[10px] uppercase font-black pl-6">Reference</TableHead>
            <TableHead className="text-[10px] uppercase font-black">Customer</TableHead>
            <TableHead className="text-[10px] uppercase font-black text-right">Net</TableHead>
            <TableHead className="text-[10px] uppercase font-black text-right pr-6">Total (Inc Tax)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices?.map(i => (
            <TableRow key={i.id} className="h-12 hover:bg-secondary/5 transition-colors border-b-border/30">
              <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">{i.invoiceNumber}</TableCell>
              <TableCell className="text-xs font-bold uppercase">{i.customerName}</TableCell>
              <TableCell className="text-right font-mono text-xs opacity-60">KES {i.subtotal?.toLocaleString()}</TableCell>
              <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">KES {i.total?.toLocaleString()}</TableCell>
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
              <h1 className="text-2xl font-headline font-bold">Sales Intelligence</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Revenue Audits & Performance Metrics</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={selectedInstId} 
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold rounded-md px-3"
            >
              <option value="">Select Institution</option>
              {institutions?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase shadow-lg shadow-primary/20">
              <Download className="size-3.5" /> Export PDF
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <ShoppingCart className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize the sales audit engine.</p>
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
                        onClick={() => setActiveReport(report.id as SalesReportType)}
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
            </div>

            <div className="col-span-12 lg:col-span-9">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card min-h-[750px] flex flex-col overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-secondary/10 px-8 py-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1.5">
                      <Badge variant="outline" className="text-[10px] h-5 bg-background font-black tracking-tighter border-primary/20 text-primary">INSTITUTIONAL REVENUE</Badge>
                      <h2 className="text-3xl font-headline font-bold text-foreground">
                        {REPORT_CATEGORIES.flatMap(c => c.reports).find(r => r.id === activeReport)?.title}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Authorized Entity</p>
                      <p className="text-sm font-bold text-primary">{institutions?.find(i => i.id === selectedInstId)?.name || '...'}</p>
                    </div>
                  </div>
                </CardHeader>
                
                <ScrollArea className="flex-1 p-8">
                  {salesLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center space-y-4">
                      <RefreshCw className="size-8 animate-spin text-primary opacity-30" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Polling Transaction Hub...</p>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                      {activeReport === 'REVENUE' && <RevenueReport />}
                      {activeReport !== 'REVENUE' && (
                        <div className="h-96 flex flex-col items-center justify-center space-y-4 border-2 border-dashed rounded-3xl opacity-20 italic">
                          <Zap className="size-12" />
                          <p className="font-bold uppercase tracking-widest text-xs">Computing Intelligence Data...</p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-6 bg-secondary/10 border-t border-border/50 flex items-center justify-between shrink-0">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">
                    Live Ledger Snapshot: {dataTimestamp}
                  </p>
                  <Button size="sm" className="h-8 text-[9px] font-black uppercase bg-primary px-6 shadow-lg shadow-primary/20">Sign Statement</Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
