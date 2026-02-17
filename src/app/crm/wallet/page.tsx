
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
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
  TrendingUp,
  Landmark
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function CustomerWalletPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'customers'), orderBy('walletBalance', 'desc'));
  }, [db, selectedInstId]);
  const { data: customers, isLoading } = useCollection(customersQuery);

  const walletLogsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'wallets'), orderBy('timestamp', 'desc'), limit(50));
  }, [db, selectedInstId]);
  const { data: walletLogs } = useCollection(walletLogsQuery);

  const handleTopup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !selectedCustomerId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const reference = formData.get('reference') as string;

    try {
      await updateCustomerWallet(db, selectedInstId, selectedCustomerId, amount, reference);
      toast({ title: "Funds Credited", description: "Customer wallet balanced updated." });
      setIsTopupOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Transaction Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-500 shadow-inner">
              <Wallet className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Wallet & Credit</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Client Sub-ledger & Liabilities</p>
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

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId} onClick={() => setIsTopupOpen(true)}>
              <Plus className="size-4" /> Credit Funds
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Landmark className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage client finance.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
            {/* Wallet Balances Table */}
            <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Client Ledger Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Client Name</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Wallet Status</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Available Credit</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Wallet Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Polling Balances...</TableCell></TableRow>
                    ) : customers?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No financial profiles registered.</TableCell></TableRow>
                    ) : customers?.map((c) => (
                      <TableRow key={c.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6 font-bold text-xs uppercase tracking-tight">{c.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[8px] h-4 uppercase font-black bg-emerald-500/10 text-emerald-500 border-none">ACTIVE HUB</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black opacity-50 uppercase">KES {c.creditLimit?.toLocaleString()}</TableCell>
                        <TableCell className="text-right pr-6 font-mono text-sm font-black text-emerald-500">
                          KES {(c.walletBalance || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Audit Trail & Logic */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow bg-secondary/5 h-fit">
                <CardHeader className="bg-primary/5 border-b border-border/10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Transaction Stream</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/10 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {walletLogs?.length === 0 ? (
                      <div className="p-8 text-center text-[10px] text-muted-foreground uppercase font-bold opacity-30">No recent movement.</div>
                    ) : walletLogs?.map((log) => (
                      <div key={log.id} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-tight">{customers?.find(c => c.id === log.customerId)?.name || '...'}</p>
                          <p className="text-[8px] text-muted-foreground font-mono mt-0.5">{log.reference}</p>
                        </div>
                        <p className={cn("text-[11px] font-black font-mono", log.amount > 0 ? "text-emerald-500" : "text-destructive")}>
                          {log.amount > 0 ? '+' : ''}{log.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><ShieldAlert className="size-24 text-primary" /></div>
                <div className="flex flex-col gap-3 relative z-10">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                    <TrendingUp className="size-3" /> Financial Control
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Wallet funds are recorded as institutional liabilities until redeemed via Sales or POS modules."
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        <Dialog open={isTopupOpen} onOpenChange={setIsTopupOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleTopup}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="size-5 text-emerald-500" />
                  <DialogTitle>Adjust Stored Value</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight">Manual Sub-ledger Credit</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Target Customer</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} required>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Search Client Identity..." /></SelectTrigger>
                    <SelectContent>
                      {customers?.map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Transaction Amount</Label>
                    <Input name="amount" type="number" step="0.01" placeholder="0.00" required className="h-10 font-black text-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference / Source</Label>
                    <Input name="reference" placeholder="e.g. Bank Deposit" required className="h-10" />
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex gap-3 items-start text-emerald-600">
                  <ArrowUpRight className="size-4 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed italic font-medium">
                    This will instantly credit the customer's wallet. It is independent of the Loyalty Points system.
                  </p>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsTopupOpen(false)} className="text-xs h-10 font-bold uppercase">Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 px-10 font-bold uppercase text-xs shadow-xl shadow-emerald-900/20 bg-emerald-600 hover:bg-emerald-700">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <CheckCircle2 className="size-3 mr-2" />} Commit Transaction
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
