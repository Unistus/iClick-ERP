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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { 
  Landmark, 
  ArrowRightLeft, 
  RefreshCw, 
  Wallet, 
  Smartphone, 
  Banknote,
  AlertCircle,
  History,
  PlusCircle,
  MoreHorizontal,
  FileText,
  TrendingUp,
  Settings2,
  Trash2,
  Loader2,
  Search
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { postJournalEntry } from "@/lib/accounting/journal.service";
import { registerFinancialAccount } from "@/lib/accounting/banking.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function BankingPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const coaQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'coa'), 
      where('isActive', '==', true),
      where('type', '==', 'Asset')
    );
  }, [db, selectedInstId]);
  const { data: accounts, isLoading } = useCollection(coaQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'accounting');
  }, [db, selectedInstId]);
  const { data: accountingSetup } = useDoc(setupRef);

  const currenciesRef = useMemoFirebase(() => collection(db, 'currencies'), [db]);
  const { data: currencies } = useCollection(currenciesRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // Filter Cash/Bank accounts for liquidity tracking
  const bankAccounts = accounts?.filter(a => 
    a.subtype === 'Cash & Bank' || 
    a.subtype === 'M-Pesa Clearing' || 
    a.subtype === 'Petty Cash'
  ) || [];
  
  // Aggregates
  const totalCash = bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const bankLiquidity = bankAccounts.filter(a => a.subtype === 'Cash & Bank').reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const clearingBalances = bankAccounts.filter(a => a.subtype === 'M-Pesa Clearing').reduce((sum, acc) => sum + (acc.balance || 0), 0);

  const handleTransfer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const fromId = formData.get('fromAccountId') as string;
    const toId = formData.get('toAccountId') as string;
    const ref = formData.get('reference') as string;

    if (fromId === toId) {
      toast({ variant: "destructive", title: "Invalid Transfer", description: "Source and target accounts must be different." });
      setIsProcessing(false);
      return;
    }

    // Close Immediately for snappy UI
    setIsTransferOpen(false);

    postJournalEntry(db, selectedInstId, {
      date: new Date(),
      description: `Internal Transfer: ${ref}`,
      reference: `TRF-${Date.now()}`,
      items: [
        { accountId: toId, amount: amount, type: 'Debit' },
        { accountId: fromId, amount: amount, type: 'Credit' },
      ]
    }).then(() => {
      logSystemEvent(db, selectedInstId, user, 'BANKING', 'Transfer Funds', `Transferred ${currency} ${amount} from account ${fromId} to ${toId}.`);
      toast({ title: "Transfer Successful" });
    }).catch(err => {
      toast({ variant: "destructive", title: "Transfer Failed", description: err.message });
    }).finally(() => setIsProcessing(false));
  };

  const handleAdjustBalance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !selectedAccount || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const targetBalance = parseFloat(formData.get('targetBalance') as string);
    const currentBalance = selectedAccount.balance || 0;
    const difference = targetBalance - currentBalance;

    if (difference === 0) {
      setIsAdjustOpen(false);
      setIsProcessing(false);
      return;
    }

    if (!accountingSetup?.openingBalanceEquityAccountId) {
      toast({ variant: "destructive", title: "Setup Required", description: "Opening Balance Equity account must be mapped." });
      setIsProcessing(false);
      return;
    }

    // Close Immediately
    setIsAdjustOpen(false);

    const isPositive = difference > 0;
    const absAmount = Math.abs(difference);

    postJournalEntry(db, selectedInstId, {
      date: new Date(),
      description: `Balance Correction for ${selectedAccount.name}`,
      reference: `CORR-${Date.now()}`,
      items: [
        { accountId: selectedAccount.id, amount: absAmount, type: isPositive ? 'Debit' : 'Credit' },
        { accountId: accountingSetup.openingBalanceEquityAccountId, amount: absAmount, type: isPositive ? 'Credit' : 'Debit' },
      ]
    }).then(() => {
      logSystemEvent(db, selectedInstId, user, 'BANKING', 'Adjust Balance', `Adjusted '${selectedAccount.name}' to ${targetBalance}.`);
      toast({ title: "Correction Posted" });
    }).catch(err => {
      toast({ variant: "destructive", title: "Adjustment Failed" });
    }).finally(() => setIsProcessing(false));
  };

  const handleRegisterAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      subtype: formData.get('subtype') as string,
      openingBalance: parseFloat(formData.get('openingBalance') as string) || 0,
      currencyId: formData.get('currencyId') as string || 'KES',
    };

    // Close Immediately
    setIsAddAccountOpen(false);

    registerFinancialAccount(db, selectedInstId, payload).then(() => {
      logSystemEvent(db, selectedInstId, user, 'BANKING', 'Register Account', `New node '${payload.name}' registered.`);
      toast({ title: "Account Registered" });
    }).catch(err => {
      toast({ variant: "destructive", title: "Registration Failed", description: err.message });
    }).finally(() => setIsProcessing(false));
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Landmark className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Cash & Bank</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Treasury & Liquidity</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
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

            <Button size="sm" variant="outline" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId} onClick={() => setIsAddAccountOpen(true)}>
              <PlusCircle className="size-4" /> Register Account
            </Button>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId} onClick={() => setIsTransferOpen(true)}>
              <ArrowRightLeft className="size-4" /> Transfer Funds
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Wallet className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access its treasury vault.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Liquidity</span>
                  <Wallet className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{currency} {totalCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <p className="text-[9px] text-emerald-500 mt-1 uppercase font-bold">Total Cash Assets</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Bank & Till</span>
                  <Banknote className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{currency} {bankLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold">Settled Funds</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-accent">Clearing Hub</span>
                  <Smartphone className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{currency} {clearingBalances.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold">M-Pesa / Card Pending</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card">
              <CardHeader className="py-3 px-6 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search accounts..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" className="size-8"><RefreshCw className="size-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Code</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Account Name</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Balance</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs uppercase font-bold animate-pulse opacity-50">Syncing vault...</TableCell></TableRow>
                    ) : bankAccounts.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs text-muted-foreground uppercase font-bold">No accounts found.</TableCell></TableRow>
                    ) : bankAccounts.map((acc) => (
                      <TableRow key={acc.id} className="h-14 hover:bg-secondary/5 transition-colors group">
                        <TableCell className="pl-6 font-mono text-[10px] font-bold text-muted-foreground">{acc.code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold">{acc.name}</span>
                            <Badge variant="outline" className="text-[8px] h-3.5 uppercase font-bold bg-background ml-2">{acc.subtype}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm text-primary">
                          {currency} {acc.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground">Operations</DropdownMenuLabel>
                              <DropdownMenuItem 
                                className="text-xs gap-2"
                                onClick={() => {
                                  setSelectedAccount(acc);
                                  setIsAdjustOpen(true);
                                }}
                              >
                                <TrendingUp className="size-3.5 text-emerald-500" /> Adjust Balance
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-2">
                                <History className="size-3.5 text-primary" /> View History
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-2">
                                <FileText className="size-3.5 text-accent" /> Account Statement
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs gap-2 text-destructive">
                                <Trash2 className="size-3.5" /> Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Adjust Balance Dialog */}
        <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleAdjustBalance}>
              <DialogHeader>
                <DialogTitle>Balance Correction</DialogTitle>
                <CardDescription>Update the ledger to match physical records for {selectedAccount?.name}.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="p-4 bg-secondary/20 rounded-lg border flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-bold uppercase text-muted-foreground">Ledger Balance</p>
                    <p className="text-lg font-mono font-bold">{currency} {selectedAccount?.balance?.toLocaleString()}</p>
                  </div>
                  <RefreshCw className="size-4 text-muted-foreground opacity-30" />
                </div>
                <div className="space-y-2">
                  <Label>True Physical Balance ({currency})</Label>
                  <Input name="targetBalance" type="number" step="0.01" placeholder="0.00" required className="h-10 font-mono text-lg" />
                </div>
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <p className="text-[10px] text-amber-600 font-bold uppercase flex items-center gap-1.5"><AlertCircle className="size-3" /> Audit Alert</p>
                  <p className="text-[9px] text-muted-foreground mt-1 leading-tight">This will auto-post a corrective Journal Entry.</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" className="text-xs" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs">Commit Correction</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Account Dialog */}
        <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleRegisterAccount}>
              <DialogHeader>
                <DialogTitle>New Financial Node</DialogTitle>
                <CardDescription>Register a new bank account or till.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Account Name</Label><Input name="name" placeholder="e.g. KCB Corporate" required className="h-9" /></div>
                  <div className="space-y-2"><Label>GL Code</Label><Input name="code" placeholder="1001" required className="h-9 font-mono" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select name="subtype" defaultValue="Cash & Bank">
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash & Bank" className="text-xs">Bank Account</SelectItem>
                        <SelectItem value="Petty Cash" className="text-xs">Petty Cash</SelectItem>
                        <SelectItem value="M-Pesa Clearing" className="text-xs">M-Pesa Clearing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Base Currency</Label>
                    <Select name="currencyId" defaultValue="KES">
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KES" className="text-xs">KES - Shilling</SelectItem>
                        {currencies?.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.id}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-2">
                  <Label className="text-primary font-bold">Opening Balance</Label>
                  <Input name="openingBalance" type="number" step="0.01" placeholder="0.00" className="h-9 font-mono" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" className="text-xs" onClick={() => setIsAddAccountOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-9 font-bold uppercase text-xs">Register Node</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Transfer Funds Dialog */}
        <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleTransfer}>
              <DialogHeader>
                <DialogTitle>Move Liquidity</DialogTitle>
                <CardDescription>Transfer between treasury nodes.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Source Account</Label>
                  <Select name="fromAccountId" required>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pay from..." /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">[{acc.code}] {acc.name} - {currency} {acc.balance.toLocaleString()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Account</Label>
                  <Select name="toAccountId" required>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Deposit to..." /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">[{acc.code}] {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Amount ({currency})</Label><Input name="amount" type="number" step="0.01" required className="h-9 text-xs" /></div>
                  <div className="space-y-2"><Label>Reference</Label><Input name="reference" placeholder="Memo" required className="h-9 text-xs" /></div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" className="text-xs" onClick={() => setIsTransferOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-9 font-bold uppercase text-xs">Confirm Movement</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
