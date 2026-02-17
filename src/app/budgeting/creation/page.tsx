'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { 
  FilePlus2, 
  Search, 
  Target, 
  Edit2, 
  Save, 
  Loader2, 
  Info, 
  CheckCircle2, 
  Calendar,
  Zap,
  RefreshCw,
  LayoutGrid
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { saveBudgetAllocations } from '@/lib/budgeting/budget.service';

export default function BudgetCreationPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [localLimits, setLocalLimits] = useState<Record<string, number>>({});

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), where('status', '==', 'Open'));
  }, [db, selectedInstId]);
  const { data: periods } = useCollection(periodsQuery);

  const budgetAccountsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'coa'), 
      where('isTrackedForBudget', '==', true)
    );
  }, [db, selectedInstId]);
  const { data: accounts, isLoading } = useCollection(budgetAccountsQuery);

  const periodAllocationsQuery = useMemoFirebase(() => {
    if (!selectedInstId || !selectedPeriodId) return null;
    return collection(db, 'institutions', selectedInstId, 'fiscal_periods', selectedPeriodId, 'allocations');
  }, [db, selectedInstId, selectedPeriodId]);
  const { data: allocations } = useCollection(periodAllocationsQuery);

  useEffect(() => {
    if (allocations) {
      const map: Record<string, number> = {};
      allocations.forEach(a => map[a.id] = a.limit || 0);
      setLocalLimits(map);
    }
  }, [allocations]);

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
      toast({ title: "Bulk Update Complete", description: "All period targets deployed." });
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
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <FilePlus2 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Allocation Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Set Institutional Expenditure Ceilings</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[200px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
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
                <SelectValue placeholder="Target Period" />
              </SelectTrigger>
              <SelectContent>
                {periods?.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedPeriodId || isProcessing} onClick={handleBulkSave}>
              {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit All
            </Button>
          </div>
        </div>

        {!selectedPeriodId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Target className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution and open fiscal period to begin allocation.</p>
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
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Tracking</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Last Actual</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Period Limit</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase">Syncing Registry...</TableCell></TableRow>
                    ) : accounts?.map((acc) => (
                      <TableRow key={acc.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase">{acc.name}</span>
                            <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">GL-{acc.code}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 font-black uppercase">ACTIVE</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs opacity-50">
                          {acc.balance?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            type="number" 
                            className="h-8 w-32 ml-auto text-right font-mono text-xs font-black border-none bg-secondary/20"
                            value={localLimits[acc.id] || 0}
                            onChange={(e) => setLocalLimits(prev => ({ ...prev, [acc.id]: parseFloat(e.target.value) || 0 }))}
                          />
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
                            <Edit2 className="size-3" /> Single Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-5"><LayoutGrid className="size-24" /></div>
              <div className="flex gap-4 items-start relative z-10">
                <Info className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase text-primary">Fiscal Logic</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground max-w-2xl">
                    Changes made here apply only to the selected **Target Period**. You can perform a bulk save for all listed accounts using the top-right command or refine individual limits.
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
                <DialogTitle>Set Period Ceiling</DialogTitle>
                <CardDescription className="text-xs uppercase font-black tracking-tight">Node: {editingAcc?.name}</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-6 text-xs">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Target Limit for {periods?.find(p => p.id === selectedPeriodId)?.name}</Label>
                  <Input 
                    name="limit" 
                    type="number" 
                    step="0.01" 
                    defaultValue={localLimits[editingAcc?.id] || 0} 
                    required 
                    className="h-12 text-xl font-mono font-black border-primary/20"
                  />
                </div>
                <p className="text-[10px] italic text-muted-foreground">Note: This target will be used by the Variance Hub to track spend deviations for this specific period.</p>
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
