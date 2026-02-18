'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  FileText,
  PieChart,
  DollarSign,
  BookOpen,
  Filter,
  Download,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function GeneralLedgerPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  // 1. Data Fetching: Permitted Institutions (Access Control)
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const entriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'journal_entries'), 
      orderBy('date', 'desc'),
      limit(50)
    );
  }, [db, selectedInstId]);

  const { data: entries, isLoading } = useCollection(entriesQuery);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <BookOpen className="size-5" />
            </div>
            <h1 className="text-2xl font-headline font-bold">General Ledger</h1>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[200px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder={instLoading ? "Syncing Access..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="gap-2 h-9 text-xs">
              <Download className="size-3.5" /> Export
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <BookOpen className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access its real-time financial stream.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Monthly Sales</span>
                  <DollarSign className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">KES 2.4M</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Expenses</span>
                  <ArrowDownLeft className="size-3 text-destructive" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">KES 1.1M</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Net Profit</span>
                  <History className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold text-emerald-500">KES 1.3M</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Tax Reserve</span>
                  <FileText className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">KES 384k</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card">
              <CardHeader className="py-3 px-6 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">Double-Entry Journal</CardTitle>
                  <CardDescription className="text-[10px]">Recent financial movements across all accounts.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" className="size-8"><Filter className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-8"><Calendar className="size-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Timestamp</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Reference</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Description</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Debit</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Credit</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs">Streaming audit trail...</TableCell></TableRow>
                    ) : !entries || entries.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">No financial activity recorded yet.</TableCell></TableRow>
                    ) : entries.map((entry) => {
                      const totalDebit = entry.items?.reduce((sum: number, i: any) => i.type === 'Debit' ? sum + i.amount : sum, 0) || 0;
                      const totalCredit = entry.items?.reduce((sum: number, i: any) => i.type === 'Credit' ? sum + i.amount : sum, 0) || 0;

                      return (
                        <TableRow key={entry.id} className="h-14 hover:bg-secondary/10 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold">{entry.date ? format(entry.date.toDate(), 'dd MMM yyyy') : 'Pending'}</span>
                              <span className="text-[9px] text-muted-foreground font-mono">{entry.date ? format(entry.date.toDate(), 'HH:mm:ss') : ''}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-[10px] font-bold text-primary">{entry.reference}</TableCell>
                          <TableCell className="text-xs">{entry.description}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-[11px] text-emerald-500">
                            {totalDebit > 0 ? totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-[11px] text-destructive">
                            {totalCredit > 0 ? totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-500 font-bold">POSTED</Badge>
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
