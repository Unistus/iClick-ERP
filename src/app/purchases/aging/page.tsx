'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Hourglass, Wallet, AlertCircle, Calendar, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

export default function SupplierAgingPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const billsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'payables'),
      where('status', '!=', 'Paid'),
      orderBy('dueDate', 'asc')
    );
  }, [db, selectedInstId]);
  
  const { data: bills, isLoading } = useCollection(billsQuery);

  const calculateAging = () => {
    const buckets = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      'over90': 0
    };

    bills?.forEach(bill => {
      const daysOverdue = differenceInDays(new Date(), bill.dueDate.toDate());
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
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Vendor Maturity Analysis</p>
            </div>
          </div>
          
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
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Hourglass className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to analyze supplier debt maturity.</p>
          </div>
        ) : (
          <div className="space-y-6">
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
                    <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest mb-1">{g.label}</p>
                    <p className={cn("text-lg font-bold font-mono", g.color)}>KES {g.val.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Filter by vendor or bill..." 
                    className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase">Debt Maturity Stream</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Vendor</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Bill #</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Due Date</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Maturity Status</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Synthesizing Maturity Matrix...</TableCell></TableRow>
                    ) : filteredBills.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No outstanding liabilities.</TableCell></TableRow>
                    ) : filteredBills.map((b) => {
                      const days = differenceInDays(new Date(), b.dueDate.toDate());
                      return (
                        <TableRow key={b.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6 font-bold text-xs uppercase">{b.vendorName}</TableCell>
                          <TableCell className="font-mono text-[10px] text-primary font-bold">{b.billNumber}</TableCell>
                          <TableCell className="text-[10px] font-mono">{format(b.dueDate.toDate(), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={cn("text-[9px] h-4 font-black", days > 0 ? "text-destructive border-destructive/20 bg-destructive/5" : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5")}>
                              {days > 0 ? `${days} DAYS OVERDUE` : "CURRENT / UPCOMING"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6 font-mono text-xs font-black text-primary">
                            KES {b.balance?.toLocaleString()}
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
