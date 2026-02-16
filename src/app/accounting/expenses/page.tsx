
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
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { format } from "date-fns";
import { 
  ArrowRightLeft, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Wallet, 
  HandCoins, 
  UserCircle,
  FileText,
  BadgeCent
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createExpenseRequisition, approveExpense } from "@/lib/accounting/expense.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";
import { Switch } from '@/components/ui/switch';

export default function ExpenseManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const expensesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'expenses'), orderBy('createdAt', 'desc'), limit(50));
  }, [db, selectedInstId]);
  const { data: expenses, isLoading } = useCollection(expensesQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const coaQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'coa'), where('isActive', '==', true));
  }, [db, selectedInstId]);
  const { data: accounts } = useCollection(coaQuery);

  const currency = settings?.general?.currencySymbol || "KES";

  // Aggregates
  const pendingAmount = expenses?.filter(e => e.status === 'Pending').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  const approvedMTD = expenses?.filter(e => e.status === 'Paid').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

  const handleCreateReq = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !user || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      requestedBy: user.uid,
      employeeName: user.email?.split('@')[0] || "Employee",
      amount: parseFloat(formData.get('amount') as string),
      expenseAccountId: formData.get('expenseAccountId') as string,
      description: formData.get('description') as string,
      paymentMethod: formData.get('paymentMethod') as any,
      isPayrollRecoverable: formData.get('isRecoverable') === 'on',
    };

    setIsCreateOpen(false);

    createExpenseRequisition(db, selectedInstId, data).then(() => {
      logSystemEvent(db, selectedInstId, user, 'EXPENSES', 'Create Requisition', `New request for ${currency} ${data.amount} submitted.`);
      toast({ title: "Requisition Submitted" });
    }).catch(err => {
      toast({ variant: "destructive", title: "Submission Failed", description: err.message });
    }).finally(() => setIsProcessing(false));
  };

  const handleApprove = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !selectedReq || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const sourceAccountId = formData.get('sourceAccountId') as string;

    setIsApproveOpen(false);

    approveExpense(db, selectedInstId, selectedReq.id, sourceAccountId).then(() => {
      logSystemEvent(db, selectedInstId, user, 'EXPENSES', 'Approve Expense', `Expense req ${selectedReq.id} approved and posted.`);
      toast({ title: "Expense Approved & Paid" });
    }).catch(err => {
      toast({ variant: "destructive", title: "Approval Failed", description: err.message });
    }).finally(() => setIsProcessing(false));
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <HandCoins className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Expense Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Requisitions & Employee Payouts</p>
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

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Request
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <BadgeCent className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage internal expenses.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Pending Approval</span>
                  <Clock className="size-3 text-accent" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{currency} {pendingAmount.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-500">Paid (MTD)</span>
                  <Wallet className="size-3 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold text-emerald-500">{currency} {approvedMTD.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-primary">Active Claims</span>
                  <UserCircle className="size-3 text-primary" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg font-bold">{expenses?.filter(e => e.status !== 'Paid').length || 0} REQS</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card">
              <CardHeader className="py-3 px-6 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search requisitions..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Button size="icon" variant="ghost" className="size-8"><Filter className="size-3.5" /></Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Requested By</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold">Category / Description</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Amount</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-center">Status</TableHead>
                      <TableHead className="h-10 text-right pr-6 text-[10px] uppercase font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse">Syncing workflow...</TableCell></TableRow>
                    ) : !expenses || expenses.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground">No active expense requisitions.</TableCell></TableRow>
                    ) : expenses.map((req) => (
                      <TableRow key={req.id} className="h-14 hover:bg-secondary/5 transition-colors group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{req.employeeName}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">{req.createdAt?.toDate ? format(req.createdAt.toDate(), 'dd MMM HH:mm') : 'Pending'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-tight">
                              {accounts?.find(a => a.id === req.expenseAccountId)?.name || 'Misc'}
                            </span>
                            <span className="text-[11px] truncate max-w-[200px]">{req.description}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-[11px]">
                          {currency} {req.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[9px] h-4 uppercase font-bold ${
                            req.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            req.status === 'Pending' ? 'bg-accent/10 text-accent border-accent/20 animate-pulse' :
                            'bg-secondary text-muted-foreground border-border'
                          }`}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {req.status === 'Pending' && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-[9px] font-bold uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setSelectedReq(req);
                                setIsApproveOpen(true);
                              }}
                            >
                              <CheckCircle2 className="size-3 text-emerald-500" /> Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Requisition Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreateReq}>
              <DialogHeader>
                <DialogTitle>New Expense Request</DialogTitle>
                <CardDescription>Submit a requisition for approval and payout.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount ({currency})</Label>
                    <Input name="amount" type="number" step="0.01" required className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Expense Account</Label>
                    <Select name="expenseAccountId" required>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {accounts?.filter(a => a.type === 'Expense').map(acc => (
                          <SelectItem key={acc.id} value={acc.id} className="text-xs">[{acc.code}] {acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description / Purpose</Label>
                  <Input name="description" placeholder="e.g. Transport to client site" required className="h-9" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payout Method</Label>
                    <Select name="paymentMethod" defaultValue="Cash">
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash" className="text-xs">Physical Cash</SelectItem>
                        <SelectItem value="Bank" className="text-xs">Bank / M-Pesa</SelectItem>
                        <SelectItem value="Payroll Deduction" className="text-xs">Payroll Deduction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded bg-secondary/10 mt-4">
                    <Label className="text-[10px] uppercase font-bold">Salary Recoverable?</Label>
                    <Switch name="isRecoverable" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-9 font-bold uppercase text-xs">Submit for Approval</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Approve Expense Dialog */}
        <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
          <DialogContent className="max-w-sm">
            <form onSubmit={handleApprove}>
              <DialogHeader>
                <DialogTitle>Approve & Release Funds</DialogTitle>
                <CardDescription>Reviewing {selectedReq?.description} by {selectedReq?.employeeName}</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Requisition Amount</p>
                    <p className="text-xl font-bold font-mono text-primary">{currency} {selectedReq?.amount?.toLocaleString()}</p>
                  </div>
                  <HandCoins className="size-6 text-primary opacity-20" />
                </div>
                
                {selectedReq?.paymentMethod !== 'Payroll Deduction' && (
                  <div className="space-y-2">
                    <Label>Source Payout Account</Label>
                    <Select name="sourceAccountId" required>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Bank/Cash" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.filter(a => a.subtype === 'Cash & Bank' || a.subtype === 'Petty Cash').map(acc => (
                          <SelectItem key={acc.id} value={acc.id} className="text-xs">[{acc.code}] {acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedReq?.paymentMethod === 'Payroll Deduction' && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <p className="text-[9px] text-amber-600 font-bold uppercase leading-none">Internal Memo</p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">This will be auto-deducted from next payroll cycle.</p>
                  </div>
                )}
              </div>
              <DialogFooter className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/20 h-9" onClick={() => setIsApproveOpen(false)}>
                  <XCircle className="size-3 mr-1" /> Reject
                </Button>
                <Button type="submit" disabled={isProcessing} className="h-9 font-bold uppercase text-xs">
                  <CheckCircle2 className="size-3 mr-1" /> Post & Pay
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
