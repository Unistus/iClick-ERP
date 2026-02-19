'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { updateCustomerWallet } from "@/lib/crm/crm.service";
import { 
  Wallet, 
  Plus, 
  Search, 
  ArrowRightLeft, 
  History, 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  ShieldAlert,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  Landmark,
  BadgeCent,
  Activity,
  User,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function CustomerWalletPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // UI CLEANUP HOOK: Prevents system freeze by deferring resets until after dialog closure
  useEffect(() => {
    if (!isTopupOpen) {
      setSelectedCustomerId("");
      setIsProcessing(false);
    }
  }, [isTopupOpen]);

  // 1. Data Fetching: Permitted Institutions
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 2. Data Fetching: Institutional Settings (Currency)
  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);
  const currency = settings?.general?.currencySymbol || "KES";

  // 3. Data Fetching: Customers & Balances
  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'customers'), orderBy('walletBalance', 'desc'));
  }, [db, selectedInstId]);
  const { data: customers, isLoading: customersLoading } = useCollection(customersQuery);

  // 4. Data Fetching: Wallet Transaction Stream
  const walletLogsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'wallets'), orderBy('timestamp', 'desc'), limit(50));
  }, [db, selectedInstId]);
  const { data: walletLogs, isLoading: logsLoading } = useCollection(walletLogsQuery);

  const handleTopup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !selectedCustomerId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const reference = formData.get('reference') as string;

    // SNAP CLOSE to avoid freeze
    setIsTopupOpen(false);

    updateCustomerWallet(db, selectedInstId, selectedCustomerId, amount, reference);
    toast({ title: "Top-up Initiated", description: "Institutional sub-ledger is being updated." });
  };

  const filteredCustomers = customers?.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Aggregates
  const totalStoredValue = customers?.reduce((sum, c) => sum + (c.walletBalance || 0), 0) || 0;
  const totalCreditExposure = customers?.reduce((sum, c) => sum + (c.creditLimit || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500 shadow-inner border border-emerald-500/10">
              <Wallet className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Stored Value Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Client Sub-ledger & Liquidity Command</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-10 px-6 text-xs font-bold uppercase shadow-lg shadow-emerald-900/20 bg-emerald-600 hover:bg-emerald-700" disabled={!selectedInstId} onClick={() => setIsTopupOpen(true)}>
              <Plus className="size-4" /> Credit Funds
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <div className="size-20 rounded-full bg-emerald-500/5 flex items-center justify-center mb-4">
              <Landmark className="size-10 text-muted-foreground opacity-20 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-muted-foreground text-center px-6">
              Select an institution to manage client finance, prepaid wallets, and credit horizons.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-md overflow-hidden group hover:ring-emerald-500/30 transition-all">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Liabilities</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">{currency} {totalStoredValue.toLocaleString()}</div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Prepaid Balances</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-md overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Trust Exposure</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{currency} {totalCreditExposure.toLocaleString()}</div>
                  <div className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Global Credit Ceiling</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-md overflow-hidden">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-accent tracking-widest">Velocity</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-accent">{walletLogs?.length || 0} EVENTS</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Transaction Intensity</p>
                </CardContent>
              </Card>

              <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 shadow-md relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingUp className="size-24 text-emerald-500" /></div>
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Sub-ledger Pulse</span>
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <div className="text-2xl font-black font-headline">ACTIVE</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Encrypted Edge Sync</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Wallet Balances Table */}
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Client Ledger Matrix</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold opacity-60 text-primary">Prepaid storage and credit trust monitoring</CardDescription>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Search client identity..." 
                      className="pl-9 h-9 text-[10px] bg-secondary/20 border-none ring-1 ring-border/20 font-bold uppercase tracking-tight" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Reward Member</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase text-center">Status</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase text-right">Available Credit</TableHead>
                        <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Vault Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customersLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse font-black uppercase tracking-widest opacity-50">Polling Balances...</TableCell></TableRow>
                      ) : filteredCustomers.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No financial profiles matching criteria.</TableCell></TableRow>
                      ) : filteredCustomers.map((c) => (
                        <TableRow key={c.id} className="h-16 hover:bg-emerald-500/5 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{c.name}</span>
                              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">ID: {c.id.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[8px] h-4 uppercase font-black bg-emerald-500/10 text-emerald-500 border-none ring-1 ring-emerald-500/20">
                              ACTIVE HUB
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-black opacity-50 uppercase">
                            {currency} {c.creditLimit?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right pr-6 font-mono text-sm font-black text-emerald-500">
                            {currency} {(c.walletBalance || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Audit Trail & Logic */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-secondary/5 h-full flex flex-col">
                  <CardHeader className="bg-primary/5 border-b border-border/10 pb-3">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <History className="size-4 text-primary" /> Transaction Stream
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    <div className="divide-y divide-border/10 h-[450px] overflow-y-auto custom-scrollbar">
                      {logsLoading ? (
                        <div className="p-12 text-center text-xs animate-pulse opacity-50 uppercase font-black">Syncing Stream...</div>
                      ) : walletLogs?.length === 0 ? (
                        <div className="p-12 text-center text-[10px] text-muted-foreground uppercase font-black opacity-30 italic">No recent movement in institutional sub-ledgers.</div>
                      ) : walletLogs?.map((log) => (
                        <div key={log.id} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-tighter truncate">
                              {customers?.find(c => c.id === log.customerId)?.name || 'Account Deleted'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[8px] text-muted-foreground font-mono uppercase">REF: {log.reference?.slice(0, 12)}</span>
                              <span className="text-[8px] text-muted-foreground opacity-40">•</span>
                              <span className="text-[8px] text-muted-foreground font-bold">{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm') : '...'}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn("text-[11px] font-black font-mono tracking-tighter", log.amount > 0 ? "text-emerald-500" : "text-destructive")}>
                              {log.amount > 0 ? '+' : ''}{log.amount.toLocaleString()}
                            </p>
                            <Badge variant="outline" className="text-[7px] h-3.5 px-1 uppercase font-bold border-none bg-background/50">
                              {log.type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <div className="p-4 bg-secondary/20 border-t border-border/50 shrink-0">
                    <Button variant="outline" className="w-full justify-between h-10 text-[9px] font-black uppercase bg-background border-none ring-1 ring-border group">
                      <span>Full Audit Log</span>
                      <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </div>
                </Card>

                <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden group shadow-md">
                  <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:rotate-0 transition-transform"><ShieldAlert className="size-24 text-primary" /></div>
                  <div className="flex flex-col gap-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" />
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">Financial Control Policy</p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                      "Wallet funds are recorded as institutional liabilities. They remain available for redemption in the **POS** and **Sales** modules until the balance is depleted or the account is terminated."
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Credit Funds Dialog */}
        <Dialog open={isTopupOpen} onOpenChange={setIsTopupOpen}>
          <DialogContent className="max-w-md shadow-2xl ring-1 ring-border">
            <form onSubmit={handleTopup}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="size-5 text-emerald-500" />
                  <DialogTitle className="text-lg font-bold uppercase">Adjust Stored Value</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight text-primary">Manual Institutional Sub-ledger Credit</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-6 text-xs">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-widest opacity-60">Target Reward Member</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} required>
                    <SelectTrigger className="h-11 border-none ring-1 ring-border bg-secondary/5 font-black uppercase">
                      <SelectValue placeholder="Search Client Identity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase">
                          {c.name} ({currency} {c.walletBalance?.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Deposit Amount ({currency})</Label>
                    <Input name="amount" type="number" step="0.01" placeholder="0.00" required className="h-12 font-black text-2xl bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 focus-visible:ring-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-bold tracking-widest opacity-60">Audit Reference</Label>
                    <Input name="reference" placeholder="e.g. M-PESA REF" required className="h-12 bg-secondary/10 border-none ring-1 ring-border font-mono uppercase" />
                  </div>
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-4 items-start text-emerald-600 shadow-inner">
                  <ArrowUpRight className="size-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Institutional Notice</p>
                    <p className="text-[11px] leading-relaxed italic font-medium">
                      Finalizing this transaction will instantly credit the member's wallet. Stored value is independent of loyalty points and constitutes a refundable liability.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setIsTopupOpen(false)} className="text-xs h-11 font-black uppercase tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing || !selectedCustomerId} className="h-11 px-10 font-black uppercase text-xs shadow-2xl shadow-emerald-900/40 bg-emerald-600 hover:bg-emerald-700 gap-2">
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Commit Transaction
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
