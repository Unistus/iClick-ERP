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
  Info, 
  Calendar,
  Zap,
  RefreshCw,
  LayoutGrid,
  ChevronRight,
  TrendingUp,
  History
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { saveBudgetAllocations } from '@/lib/budgeting/budget.service';
import { cn } from '@/lib/utils';

export default function BudgetCreationPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [localLimits, setLocalLimits] = useState<Record<string, number>>({});

  // Data Fetching: Institutions
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  // Data Fetching: Open Fiscal Periods
  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'fiscal_periods'), orderBy('startDate', 'desc'));
  }, [db, selectedInstId]);
  const { data: periods } = useCollection(periodsQuery);

  // Data Fetching: Budgeted Accounts from COA
  const budgetAccountsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'coa'), 
      where('isTrackedForBudget', '==', true)
    );
  }, [db, selectedInstId]);
  const { data: accounts, isLoading: accountsLoading } = useCollection(budgetAccountsQuery);

  // Data Fetching: Existing Allocations for the selected period
  const periodAllocationsQuery = useMemoFirebase(() => {
    if (!selectedInstId || !selectedPeriodId) return null;
    return collection(db, 'institutions', selectedInstId, 'fiscal_periods', selectedPeriodId, 'allocations');
  }, [db, selectedInstId, selectedPeriodId]);
  const { data: allocations } = useCollection(periodAllocationsQuery);

  // Sync server allocations to local state for editing
  useEffect(() => {
    if (allocations) {
      const map: Record<string, number> = {};
      allocations.forEach(a => map[a.id] = a.limit || 0);
      setLocalLimits(prev => ({ ...map, ...prev })); // Merge to prevent losing current unsaved local edits
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
      toast({ title: "Allocation Saved", description: `Updated ceiling for ${editingAcc.name}.` });
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
      toast({ title: "Audit Targets Deployed", description: "All period targets have been synchronized with the GL." });
    } catch (err) {
      toast({ variant: "destructive", title: "Bulk Save Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const activePeriod = periods?.find(p => p.id === selectedPeriodId);

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
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Define Institutional Spend Targets</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={(val) => {
              setSelectedInstId(val);
              setSelectedPeriodId("");
              setLocalLimits({});
            }}>
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
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name} {p.status === 'Closed' ? '🔒' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              size="sm" 
              className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" 
              disabled={!selectedPeriodId || isProcessing || activePeriod?.status === 'Closed'} 
              onClick={handleBulkSave}
            >
              {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit Allocation
            </Button>
          </div>
        </div>

        {!selectedPeriodId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Target className="size-16 text-muted-foreground opacity-10 mb-4" />
            <p className="text-sm font-medium text-muted-foreground max-w-sm text-center">
              Select an institution and an active fiscal cycle to set expenditure ceilings.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {activePeriod?.status === 'Closed' && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive">
                <History className="size-5" />
                <p className="text-xs font-black uppercase tracking-widest">Audited Period Locked: Read-Only Mode</p>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find ledger account..." 
                  className="pl-9 h-10 text-[10px] bg-card border-none ring-1 ring-border font-bold uppercase tracking-tight" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Total Period Allocation</p>
                  <p className="text-sm font-black font-mono">
                    KES {Object.values(localLimits).reduce((a, b) => a + b, 0).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter text-primary border-primary/20 bg-primary/5 h-8 px-3">
                  {filteredAccounts.length} Nodes Identified
                </Badge>
              </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Spend Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Ledger Account</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Type</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Current Ledger Balance</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right w-[200px]">Period Limit (Target)</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Quick Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse font-bold uppercase tracking-widest opacity-50">Polling Registry...</TableCell></TableRow>
                    ) : filteredAccounts.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No accounts found matching criteria.</TableCell></TableRow>
                    ) : filteredAccounts.map((acc) => {
                      const currentLimit = localLimits[acc.id] || 0;
                      return (
                        <TableRow key={acc.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase tracking-tight">{acc.name}</span>
                              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">GL-{acc.code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 font-black uppercase border-none">
                              {acc.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs opacity-50">
                            {acc.balance?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] font-bold text-muted-foreground opacity-30">KES</span>
                              <Input 
                                type="number" 
                                disabled={activePeriod?.status === 'Closed'}
                                className="h-9 w-36 text-right font-mono text-xs font-black border-none bg-secondary/20 focus-visible:ring-primary"
                                value={currentLimit}
                                onChange={(e) => setLocalLimits(prev => ({ ...prev, [acc.id]: parseFloat(e.target.value) || 0 }))}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              disabled={activePeriod?.status === 'Closed'}
                              className="h-8 text-[9px] font-black uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
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

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm p-6 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><LayoutGrid className="size-24" /></div>
                <div className="flex gap-4 items-start relative z-10">
                  <Info className="size-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-primary">Allocation Logic</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground max-w-xl">
                      Limits established here serve as the **Audit Ceiling** for the selected period. These targets do not restrict live ledger postings but are used to compute <strong>Variances</strong> and trigger <strong>Strategist Alerts</strong> in the Command Center.
                    </p>
                  </div>
                </div>
              </Card>
              <div className="p-6 bg-secondary/10 rounded-2xl border flex items-center justify-between group cursor-default">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="size-3 text-emerald-500" /> Fiscal Integrity
                  </p>
                  <p className="text-[11px] font-bold">Multi-tenant indexing is synchronized across all Cost Centers.</p>
                </div>
                <Zap className="size-8 text-primary opacity-10 group-hover:opacity-100 transition-all duration-700" />
              </div>
            </div>
          </div>
        )}

        {/* Refinement Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleUpdateLimit}>
              <DialogHeader>
                <div className="size-10 rounded bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Target className="size-6" />
                </div>
                <DialogTitle className="text-lg font-bold">Refine Node Ceiling</DialogTitle>
                <DialogDescription className="text-xs uppercase font-black tracking-tight text-primary">
                  Target: {editingAcc?.name} (GL-{editingAcc?.code})
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-6 text-xs">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Target Limit for {activePeriod?.name}</Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-muted-foreground">KES</div>
                    <Input 
                      name="limit" 
                      type="number" 
                      step="0.01" 
                      defaultValue={localLimits[editingAcc?.id] || 0} 
                      required 
                      className="h-14 text-2xl pl-14 font-mono font-black border-none ring-1 ring-border focus-visible:ring-primary shadow-inner bg-secondary/5"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded bg-secondary/5">
                    <p className="text-[8px] font-black uppercase opacity-40">Current Ledger</p>
                    <p className="text-xs font-mono font-bold">KES {editingAcc?.balance?.toLocaleString()}</p>
                  </div>
                  <div className="p-3 border rounded bg-secondary/5">
                    <p className="text-[8px] font-black uppercase opacity-40">Variance Room</p>
                    <p className={cn("text-xs font-mono font-bold", ((localLimits[editingAcc?.id] || 0) - (editingAcc?.balance || 0)) >= 0 ? "text-emerald-500" : "text-destructive")}>
                      KES {((localLimits[editingAcc?.id] || 0) - (editingAcc?.balance || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>

                <p className="text-[10px] italic text-muted-foreground leading-relaxed px-1">
                  Note: Changes to this node will instantly update the <strong>Variance Matrix</strong> for the {activePeriod?.name} audit cycle.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" className="text-xs uppercase font-bold" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button 
                  type="submit" 
                  disabled={isProcessing} 
                  className="h-11 font-black uppercase text-xs px-10 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
                >
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <CheckCircle2 className="size-3 mr-2" />} Commit Target
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
