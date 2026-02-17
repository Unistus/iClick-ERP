
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where, limit } from "firebase/firestore";
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
  PieChart,
  LayoutGrid,
  FileText,
  Activity,
  Zap,
  PackageSearch
} from "lucide-react";
import { cn } from "@/lib/utils";

type PurchaseReportType = 'VALUATION' | 'VENDOR_PERF' | 'AGING' | 'PO_STATUS' | 'LEAD_TIME';

const REPORT_CATEGORIES = [
  {
    title: "Expenditure & Debt",
    reports: [
      { id: 'VALUATION', title: "Procurement Valuation", description: "Gross incoming asset value.", icon: Wallet },
      { id: 'AGING', title: "Vendor Aging", description: "Liability maturity audit.", icon: Hourglass },
    ]
  },
  {
    title: "Operational Efficiency",
    reports: [
      { id: 'PO_STATUS', title: "Order Pipeline", description: "Draft vs Received vs Billed orders.", icon: LayoutGrid },
      { id: 'VENDOR_PERF', title: "Vendor Velocity", description: "Top performing supplier entities.", icon: TrendingUp },
    ]
  }
];

export default function PurchasesReportsPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [activeReport, setActiveReport] = useState<PurchaseReportType>('VALUATION');

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Procurement Intelligence</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Supply Chain Audits & Data Analytics</p>
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
                        onClick={() => setActiveReport(report.id as PurchaseReportType)}
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
                <CardHeader className="border-b border-border/50 bg-secondary/10 px-8 py-6 text-center italic opacity-30">
                  <Activity className="size-12 mx-auto mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Procurement Audit Engine v1.0</p>
                  <p className="text-[10px] mt-1">Aggregating Purchase Orders and GRN Sub-ledgers...</p>
                </CardHeader>
                <CardContent className="flex-1 p-8 flex items-center justify-center">
                   <div className="text-center space-y-4 max-w-sm">
                      <Zap className="size-8 text-primary mx-auto opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Dataset to Preview</p>
                      <p className="text-[10px] leading-relaxed text-muted-foreground/50">
                        Institutional procurement reports factor in both actual PO unit costs and landed warehouse valuations.
                      </p>
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
