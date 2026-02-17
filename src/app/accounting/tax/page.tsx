'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateTaxReturn, updateTaxReturnStatus } from "@/lib/accounting/tax.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function TaxReturnsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [isPreviewOpen, setIsReviewOpen] = useState(false);

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
      toast({ title: "Tax Return Generated", description: "Filing saved as Draft." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateStatus = (id: string, status: any) => {
    if (!selectedInstId) return;
    updateTaxReturnStatus(db, selectedInstId, id, status).then(() => {
      logSystemEvent(db, selectedInstId, user, 'TAX', 'Update Status', `Filing ${id} marked as ${status}.`);
      toast({ title: `Status Updated to ${status}` });
      setIsReviewOpen(false);
    });
  };

  const handleDownloadReport = (ret: any) => {
    // Generate CSV for Regulatory Submission
    const headers = ["Period", "Tax Type", "Gross Sales", "Output VAT", "Input VAT", "Net Payable"];
    const row = [ret.periodName, ret.taxType, ret.grossSales, ret.outputVat, ret.inputVat, ret.netTaxPayable];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + row.join(",");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TaxReturn_${ret.periodName}_${ret.taxType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Report Exported", description: "CSV file ready for submission." });
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
              <h1 className="text-2xl font-headline font-bold text-foreground">Tax & Regulatory</h1>
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
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Current Period Liability</span>
                  <BadgeCent className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold text-accent">{currency} {currentVatLiability.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground mt-1 uppercase font-medium">Estimated VAT Payable</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Compliance Score</span>
                  <ShieldCheck className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">100%</div>
                  <p className="text-[9px] text-emerald-500 mt-1 uppercase font-bold">All Filings Up-to-date</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Next Filing Due</span>
                  <History className="size-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">20th Prox.</div>
                  <p className="text-[9px] text-muted-foreground mt-1 uppercase font-medium">Standard Regulatory Cycle</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
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
                        <span className="font-bold uppercase">Ledger Snapshot</span>
                      </div>
                      <p className="text-[10px] leading-relaxed">
                        The system will aggregate all transactions within this period and create a Draft filing using current ledger balances.
                      </p>
                    </div>
                    <Button type="submit" disabled={isGenerating} className="w-full h-10 font-bold uppercase text-xs gap-2">
                      {isGenerating ? <RefreshCw className="size-3 animate-spin" /> : <Calculator className="size-3" />} Generate Return
                    </Button>
                  </form>
                </CardContent>
              </Card>

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
                      <TableHead className="h-9 text-[10px] uppercase font-bold text-right">Net Liability</TableHead>
                      <TableHead className="h-9 text-[10px] uppercase font-bold text-center">Status</TableHead>
                      <TableHead className="h-9 text-right text-[10px] uppercase font-bold pr-6">Action</TableHead>
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
                        <TableCell className="text-right font-mono font-bold text-xs text-primary">
                          {currency} {(ret.netTaxPayable || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[9px] h-4 uppercase font-bold ${
                            ret.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            ret.status === 'Filed' ? 'bg-primary/10 text-primary border-primary/20' :
                            ret.status === 'Approved' ? 'bg-accent/10 text-accent border-accent/20' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {ret.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {ret.status === 'Draft' ? (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 text-[9px] font-bold uppercase gap-1.5 opacity-0 group-hover:opacity-100"
                                onClick={() => {
                                  setSelectedReturn(ret);
                                  setIsReviewOpen(true);
                                }}
                              >
                                <ChevronRight className="size-3" /> Review
                              </Button>
                            ) : (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="size-7 text-primary" 
                                  onClick={() => handleDownloadReport(ret)}
                                >
                                  <Download className="size-3.5" />
                                </Button>
                                {ret.status === 'Approved' && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="size-7 text-accent"
                                    onClick={() => handleUpdateStatus(ret.id, 'Filed')}
                                  >
                                    <ExternalLink className="size-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
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

        {/* Review Modal */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Review Filing: {selectedReturn?.periodName}</DialogTitle>
              <DialogDescription className="text-xs uppercase font-bold tracking-tight">Compliance Verification</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary/20 rounded-lg border">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Gross Sales (Base)</p>
                  <p className="text-sm font-mono font-bold">{currency} {selectedReturn?.grossSales?.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-[9px] font-bold text-primary uppercase">Output VAT (Due)</p>
                  <p className="text-sm font-mono font-bold">{currency} {selectedReturn?.outputVat?.toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 bg-accent/5 rounded-xl border border-accent/10 relative overflow-hidden">
                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Net Regulatory Payable</p>
                    <p className="text-lg font-bold font-headline mt-1">{currency} {selectedReturn?.netTaxPayable?.toLocaleString()}</p>
                  </div>
                  <Calculator className="size-8 text-accent opacity-20" />
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground leading-relaxed italic border-l-2 pl-3">
                Note: This calculation uses the real-time balance of your mapped VAT Payable account. Ensure all sales are finalized before approval.
              </div>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-2">
              <Button variant="ghost" className="text-xs h-9 font-bold uppercase" onClick={() => setIsReviewOpen(false)}>Discard</Button>
              <Button 
                className="text-xs h-9 font-bold uppercase bg-primary shadow-lg shadow-primary/20" 
                onClick={() => handleUpdateStatus(selectedReturn.id, 'Approved')}
              >
                <CheckCircle2 className="size-3 mr-2" /> Approve for Filing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
