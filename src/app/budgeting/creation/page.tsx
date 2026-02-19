'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { 
  FilePlus2, 
  Search, 
  Target, 
  Edit2, 
  Save, 
  Loader2, 
  Calendar,
  RefreshCw,
  ChevronRight,
  History
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { saveBudgetAllocations } from '@/lib/budgeting/budget.service';
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function BudgetCreationPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [localLimits, setLocalLimits] = useState<Record<string, number>>({});

  // 1. Data Fetching: Permitted Institutions
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // 2. Data Fetching: Fiscal Periods
  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), orderBy('startDate', 'desc'));
  }, [db, selectedInstId]);
  const { data: periods, isLoading: periodsLoading } = useCollection(periodsQuery);

  // 3. Data Fetching: Budgeted Accounts from COA
  const budgetAccountsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'coa'), 
      where('isTrackedForBudget', '==', true)
    );
  }, [db, selectedInstId]);
  const { data: accounts, isLoading: accountsLoading } = useCollection(budgetAccountsQuery);

  // 4. Data Fetching: Existing Allocations
  const periodAllocationsQuery = useMemoFirebase(() => {
    if (!selectedInstId || !selectedPeriodId) return null;
    return collection(db, 'institutions', selectedInstId, 'fiscal_periods', selectedPeriodId, 'allocations');
  }, [db, selectedInstId, selectedPeriodId]);
  const { data: allocations } = useCollection(periodAllocationsQuery);

  useEffect(() => {
    if (allocations) {
      const map: Record<string, number> = {};
      allocations.forEach(a => map[a.id] = a.limit || 0);
      setLocalLimits(prev => ({ ...map, ...prev }));
    }
  }, [allocations]);

  const filteredAccounts = accounts?.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acc.code.includes(searchTerm)
  ) || [];

  const handleUpdateLimit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !selectedPeriodId || !editingAcc || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const limit = parseFloat(formData.get('limit') as string) || 0;

    try {
      await saveBudgetAllocations(db, selectedInstId, selectedPeriodId, [{ accountId: editingAcc.id, limit }]);
      toast({ title: "Allocation Saved" });
      setIsEditOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Update Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkSave = async () => {
    if (!selectedInstId || !selectedPeriodId || isProcessing) return;
    setIsProcessing(true);
    try {
      const payload = Object.entries(localLimits).map(([accountId, limit]) => ({ accountId, limit }));
      await saveBudgetAllocations(db, selectedInstId, selectedPeriodId, payload);
      toast({ title: "Audit Targets Deployed" });
    } catch (err) {
      toast({ variant: "destructive", title: "Bulk Save Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner">
              <FilePlus2 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Allocation Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Define Spend Targets</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={(val) => {
              setSelectedInstId(val);
              setSelectedPeriodId("");
              setLocalLimits({});
            }}>
              <SelectTrigger className="w-[200px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId} disabled={!selectedInstId}>
              <SelectTrigger className="w-[180px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <Calendar className="size-3 mr-2 text-primary" />
                <SelectValue placeholder={periodsLoading ? "Scanning Periods..." : "Target Period"} />
              </SelectTrigger>
              <SelectContent>
                {periods?.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              size="sm" 
              className="gap-2 h-9 text-xs font-bold uppercase shadow-lg bg-primary" 
              disabled={!selectedPeriodId || isProcessing} 
              onClick={handleBulkSave}
            >
              {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Allocation
            </Button>
          </div>
        </div>

        {!selectedPeriodId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Target className="size-16 text-muted-foreground opacity-10 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution and cycle to set expenditure ceilings.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find ledger account..." 
                  className="pl-9 h-10 text-[10px] bg-card border-none ring-1 ring-border" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase text-primary bg-primary/5 h-8 px-3">
                {filteredAccounts.length} Nodes Identified
              </Badge>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Spend Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Ledger Account</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Type</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right w-[200px]">Period Limit (Target)</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse font-bold uppercase opacity-50">Polling Registry...</TableCell></TableRow>
                    ) : filteredAccounts.map((acc) => {
                      const currentLimit = localLimits[acc.id] || 0;
                      return (
                        <TableRow key={acc.id} className="h-16 hover:bg-secondary/10 border-b-border/30 group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase tracking-tight">{acc.name}</span>
                              <span className="text-[9px] opacity-60">GL-{acc.code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 font-black uppercase border-none">
                              {acc.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] font-bold text-muted-foreground opacity-30">KES</span>
                              <Input 
                                type="number" 
                                className="h-9 w-36 text-right font-mono text-xs font-black border-none bg-secondary/20"
                                value={currentLimit}
                                onChange={(e) => setLocalLimits(prev => ({ ...prev, [acc.id]: parseFloat(e.target.value) || 0 }))}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-[9px] font-black uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10"
                              onClick={() => {
                                setEditingAcc(acc);
                                setIsEditOpen(true);
                              }}
                            >
                              <Edit2 className="size-3" /> Refine
                            </Button>
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

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleUpdateLimit}>
              <DialogHeader>
                <DialogTitle>Refine Node Ceiling</DialogTitle>
                <DialogDescription className="text-xs">
                  Target: {editingAcc?.name} (GL-{editingAcc?.code})
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6 text-xs">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Target Limit</Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-muted-foreground">KES</div>
                    <Input 
                      name="limit" 
                      type="number" 
                      step="0.01" 
                      defaultValue={localLimits[editingAcc?.id] || 0} 
                      required 
                      className="h-14 text-2xl pl-14 font-mono font-black border-none ring-1 ring-border"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-11 font-black uppercase text-xs w-full bg-primary">
                  Commit Target
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}