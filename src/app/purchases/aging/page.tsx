
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc } from "firebase/firestore";
import { Hourglass, Search, Filter, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

export default function SupplierAgingPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dataTimestamp, setDataTimestamp] = useState<string>("");

  useEffect(() => {
    setDataTimestamp(new Date().toLocaleTimeString());
  }, []);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const billsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    // Querying payables that are not fully settled
    return query(
      collection(db, 'institutions', selectedInstId, 'payables'),
      where('status', '!=', 'Paid'),
      orderBy('dueDate', 'asc')
    );
  }, [db, selectedInstId]);
  
  const { data: bills, isLoading } = useCollection(billsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const calculateAging = () => {
    const buckets = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      'over90': 0
    };

    if (!bills) return buckets;

    const now = new Date();

    bills.forEach(bill => {
      // Robust date handling for various Firestore/JS formats
      let dueDate: Date;
      if (bill.dueDate?.toDate) {
        dueDate = bill.dueDate.toDate();
      } else if (bill.dueDate instanceof Date) {
        dueDate = bill.dueDate;
      } else {
        dueDate = new Date(bill.dueDate);
      }

      const daysOverdue = differenceInDays(now, dueDate);
      const amount = bill.balance || 0;

      if (daysOverdue <= 0) buckets.current += amount;
      else if (daysOverdue <= 30) buckets['1-30'] += amount;
      else if (daysOverdue <= 60) buckets['31-60'] += amount;
      else if (daysOverdue <= 90) buckets['61-90'] += amount;
      else buckets.over90 += amount;
    });

    return buckets;
  };

  const buckets = calculateAging();

  const filteredBills = bills?.filter(b => 
    b.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.billNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Hourglass className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Supplier Aging</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Debt Maturity Analysis</p>
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
            <Button variant="outline" size="icon" className="size-9" disabled={!selectedInstId} onClick={() => setDataTimestamp(new Date().toLocaleTimeString())}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Hourglass className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to analyze supplier debt maturity and credit terms.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Aging Buckets */}
            <div className="grid gap-4 md:grid-cols-5">
              {[
                { label: "Current", val: buckets.current, color: "text-emerald-500", bg: "bg-emerald-500/5" },
                { label: "1 - 30 Days", val: buckets['1-30'], color: "text-primary", bg: "bg-primary/5" },
                { label: "31 - 60 Days", val: buckets['31-60'], color: "text-amber-500", bg: "bg-amber-500/5" },
                { label: "61 - 90 Days", val: buckets['61-90'], color: "text-orange-500", bg: "bg-orange-500/5" },
                { label: "Over 90 Days", val: buckets.over90, color: "text-destructive", bg: "bg-destructive/5" },
              ].map(g => (
                <Card key={g.label} className={cn("border-none ring-1 ring-border shadow-sm", g.bg)}>
                  <CardContent className="pt-4">
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">{g.label}</p>
                    <p className={cn("text-lg font-bold font-mono", g.color)}>{currency} {g.val.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* List Control Bar */}
            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search vendor or bill reference..." 
                    className="pl-9 h-8 text-[10px] bg-secondary/20 border-none focus-visible:ring-primary" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/20 bg-primary/5 px-3 h-6">
                    {isLoading ? "Syncing..." : `${filteredBills.length} Outstanding Bills`}
                  </Badge>
                  <Button variant="ghost" size="icon" className="size-8"><Filter className="size-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Vendor Name</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Bill Reference</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Due Date</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Aging Status</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Liability Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase tracking-widest opacity-50">Compiling Maturity Matrix...</TableCell></TableRow>
                    ) : filteredBills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20">
                          <AlertCircle className="size-10 mx-auto text-muted-foreground opacity-10 mb-2" />
                          <p className="text-xs text-muted-foreground uppercase font-black tracking-tighter">No outstanding liabilities found.</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredBills.map((b) => {
                      const dueDate = b.dueDate?.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
                      const days = differenceInDays(new Date(), dueDate);
                      const isOverdue = days > 0;

                      return (
                        <TableRow key={b.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6 font-bold text-xs uppercase tracking-tight">{b.vendorName}</TableCell>
                          <TableCell className="font-mono text-[10px] text-primary font-bold">{b.billNumber}</TableCell>
                          <TableCell className="text-[10px] font-mono font-medium">{format(dueDate, 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "text-[9px] h-5 font-black uppercase border-none ring-1 px-2.5", 
                              isOverdue ? "text-destructive ring-destructive/20 bg-destructive/5" : "text-emerald-500 ring-emerald-500/20 bg-emerald-500/5"
                            )}>
                              {isOverdue ? `${days} DAYS OVERDUE` : "CURRENT"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6 font-mono text-sm font-black text-primary">
                            {currency} {b.balance?.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><Hourglass className="size-24" /></div>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Operational Risk Audit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] leading-relaxed italic text-muted-foreground relative z-10">
                    Institutional debt maturity is calculated in real-time from the General Ledger. Ensure all <strong>Purchase Returns</strong> are finalized to maintain accurate aging buckets.
                  </p>
                </CardContent>
              </Card>
              <div className="p-6 bg-secondary/10 rounded-2xl border flex flex-col justify-center gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground opacity-50">
                  <RefreshCw className="size-3" /> Last Engine Sync
                </div>
                <p className="text-xs font-mono font-bold">{dataTimestamp}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
