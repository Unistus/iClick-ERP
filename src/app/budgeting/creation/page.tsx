'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { 
  FilePlus2, 
  Search, 
  Filter, 
  Target, 
  Edit2, 
  Save, 
  Loader2, 
  ArrowRight,
  Info,
  CheckCircle2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';

export default function BudgetCreationPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const budgetAccountsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'coa'), 
      where('isTrackedForBudget', '==', true)
    );
  }, [db, selectedInstId]);
  const { data: accounts, isLoading } = useCollection(budgetAccountsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const handleUpdateLimit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !editingAcc || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const limit = parseFloat(formData.get('limit') as string) || 0;

    try {
      const accRef = doc(db, 'institutions', selectedInstId, 'coa', editingAcc.id);
      await updateDoc(accRef, {
        monthlyLimit: limit,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Allocation Updated", description: `${editingAcc.name} ceiling set to ${currency} ${limit.toLocaleString()}.` });
      setIsEditOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Update Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <FilePlus2 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Allocation Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Set Institutional Expenditure Ceilings</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
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
            <Target className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure budget allocations.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Filter by GL account..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter text-primary">
                  {accounts?.length || 0} Managed Nodes
                </Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Ledger Account</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Type / Subtype</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Actual Balance</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Budget Limit</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Allocation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Polling Institutional Data...</TableCell></TableRow>
                    ) : accounts?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No accounts marked for budget tracking.</TableCell></TableRow>
                    ) : accounts?.map((acc) => (
                      <TableRow key={acc.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase">{acc.name}</span>
                            <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">GL-{acc.code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-4 bg-background uppercase font-bold">{acc.subtype}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs opacity-50">
                          {currency} {acc.balance?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-primary">
                          {currency} {acc.monthlyLimit?.toLocaleString() || '0'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[9px] font-black uppercase gap-1.5 opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              setEditingAcc(acc);
                              setIsEditOpen(true);
                            }}
                          >
                            <Edit2 className="size-3" /> Adjust Limit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden p-6">
              <div className="flex gap-4 items-start">
                <Info className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase text-primary">Allocation Logic</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    To add more accounts to this list, visit **Accounting &gt; Chart of Accounts** and mark the desired Expense nodes as "Budget Tracked". The system will automatically compute utilization based on every journal entry posted to that GL node.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleUpdateLimit}>
              <DialogHeader>
                <DialogTitle>Set Expenditure Ceiling</DialogTitle>
                <CardDescription className="text-xs uppercase font-black tracking-tight">Node: {editingAcc?.name}</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-6 text-xs">
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/50 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Actual Balance (Burned)</p>
                    <p className="text-lg font-mono font-black text-primary">{currency} {editingAcc?.balance?.toLocaleString()}</p>
                  </div>
                  <Target className="size-6 text-primary opacity-20" />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest opacity-60">Target Monthly Limit ({currency})</Label>
                  <Input 
                    name="limit" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingAcc?.monthlyLimit} 
                    placeholder="0.00" 
                    required 
                    className="h-12 text-xl font-mono font-black border-primary/20 focus-visible:ring-primary"
                  />
                </div>

                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex gap-3 items-center">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <p className="text-[10px] text-muted-foreground leading-tight italic">
                    Finalizing this allocation will trigger threshold alerts across the Intelligence Hub once exceeded.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-11 font-black uppercase text-xs w-full shadow-lg shadow-primary/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Save className="size-3 mr-2" />} Commit Allocation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
