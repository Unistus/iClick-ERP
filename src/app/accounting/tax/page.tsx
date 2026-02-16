
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { format } from "date-fns";
import { 
  FileText, 
  Download, 
  Plus, 
  Search, 
  Calculator, 
  ShieldCheck, 
  History, 
  ArrowUpRight,
  RefreshCw,
  Landmark,
  BadgeCent,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateTaxReturn } from "@/lib/accounting/tax.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function TaxReturnsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const returnsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'tax_returns'), orderBy('createdAt', 'desc'), limit(50));
  }, [db, selectedInstId]);
  const { data: returns, isLoading } = useCollection(returnsQuery);

  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), where('status', '==', 'Open'));
  }, [db, selectedInstId]);
  const { data: activePeriods } = useCollection(periodsQuery);

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'accounting');
  }, [db, selectedInstId]);
  const { data: setup } = useDoc(setupRef);

  const vatAccountRef = useMemoFirebase(() => {
    if (!selectedInstId || !setup?.vatPayableAccountId) return null;
    return doc(db, 'institutions', selectedInstId, 'coa', setup.vatPayableAccountId);
  }, [db, selectedInstId, setup]);
  const { data: vatAccount } = useDoc(vatAccountRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // Calculations
  const currentVatLiability = vatAccount?.balance || 0;

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !user || isGenerating) return;
    setIsGenerating(true);

    const formData = new FormData(e.currentTarget);
    const periodId = formData.get('periodId') as string;
    const periodName = activePeriods?.find(p => p.id === periodId)?.name || "Current Period";

    try {
      await generateTaxReturn(db, selectedInstId, {
        periodId,
        periodName,
        taxType: 'VAT'
      }, user.uid);

      logSystemEvent(db, selectedInstId, user, 'TAX', 'Generate Return', `Filing generated for period ${periodName}.`);
      toast({ title: "Tax Return Generated", description: "Report is available in the filing history." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Calculator className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Tax & Regulatory</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Returns & Compliance Filings</p>
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
            <Button size="sm" variant="outline" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId}>
              <Download className="size-4" /> Export Ledger
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <BadgeCent className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access tax analytics.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Pulse */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Current Period Liability</span>
                  <BadgeCent className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-accent">{currency} {currentVatLiability.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground mt-1 uppercase font-medium">Estimated VAT Payable</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Compliance Score</span>
                  <ShieldCheck className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">100%</div>
                  <p className="text-[9px] text-emerald-500 mt-1 uppercase font-bold">All Filings Up-to-date</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Next Filing Due</span>
                  <History className="size-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">20th Prox.</div>
                  <p className="text-[9px] text-muted-foreground mt-1 uppercase font-medium">Standard KRA Cycle</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Generation Form */}
              <Card className="lg:col-span-1 border-none ring-1 ring-border shadow-xl bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">Generate Filing</CardTitle>
                  <CardDescription className="text-[10px]">Prepare a tax report for regulatory submission.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGenerate} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold opacity-60">Tax Component</label>
                      <Select name="taxType" defaultValue="VAT">
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VAT" className="text-xs">Value Added Tax (VAT)</SelectItem>
                          <SelectItem value="Withholding" className="text-xs">Withholding Tax (WHT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold opacity-60">Target Fiscal Period</label>
                      <Select name="periodId" required>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Period" /></SelectTrigger>
                        <SelectContent>
                          {activePeriods?.map(p => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-3 bg-secondary/20 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                        <AlertCircle className="size-3 text-primary" />
                        <span className="font-bold uppercase">Automated Capture</span>
                      </div>
                      <p className="text-[10px] leading-relaxed">
                        The system will aggregate all transactions within this period and populate the return using mapped tax accounts.
                      </p>
                    </div>
                    <Button type="submit" disabled={isGenerating} className="w-full h-10 font-bold uppercase text-xs gap-2">
                      {isGenerating ? <RefreshCw className="size-3 animate-spin" /> : <Calculator className="size-3" />} Calculate Return
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* History Table */}
              <Card className="lg:col-span-2 border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/20 py-3 px-6 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em]">Filing Registry</CardTitle>
                    <div className="relative w-48">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                      <input className="w-full bg-background/50 border-none ring-1 ring-border rounded h-7 pl-8 text-[10px]" placeholder="Find period..." />
                    </div>
                  </div>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-secondary/10">
                    <TableRow>
                      <TableHead className="h-9 text-[10px] uppercase font-bold pl-6">Period</TableHead>
                      <TableHead className="h-9 text-[10px] uppercase font-bold">Gross Sales</TableHead>
                      <TableHead className="h-9 text-[10px] uppercase font-bold">Input/Output</TableHead>
                      <TableHead className="h-9 text-[10px] uppercase font-bold text-right">Liability</TableHead>
                      <TableHead className="h-9 text-[10px] uppercase font-bold text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs uppercase font-bold animate-pulse opacity-50">Syncing registry...</TableCell></TableRow>
                    ) : !returns || returns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20">
                          <FileText className="size-10 mx-auto text-muted-foreground opacity-10 mb-3" />
                          <p className="text-xs text-muted-foreground font-bold uppercase">No filed returns found.</p>
                        </TableCell>
                      </TableRow>
                    ) : returns.map((ret) => (
                      <TableRow key={ret.id} className="h-14 hover:bg-secondary/5 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{ret.periodName}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-widest">{ret.taxType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] font-mono font-medium">
                          {currency} {(ret.grossSales || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-[9px] font-bold">
                            <span className="text-emerald-500">OUT: {currency} {(ret.outputVat || 0).toLocaleString()}</span>
                            <span className="text-destructive">IN: {currency} {(ret.inputVat || 0).toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs text-primary">
                          {currency} {(ret.netTaxPayable || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-3">
                            <Badge variant="outline" className={`text-[9px] h-4 uppercase font-bold ${
                              ret.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              ret.status === 'Filed' ? 'bg-primary/10 text-primary border-primary/20' :
                              'bg-secondary text-muted-foreground'
                            }`}>
                              {ret.status}
                            </Badge>
                            <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100"><Download className="size-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
