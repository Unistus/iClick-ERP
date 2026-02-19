'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Layers, Plus, Edit2, Search, Filter, BookOpen, Target, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/accounting/coa.model";

export default function COAManagement() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any>(null);
  const [activeType, setActiveType] = useState<AccountType | 'All'>('Asset');
  
  // Budget tracking state for form
  const [isTrackedForBudget, setIsTrackedForBudget] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const coaQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'coa'), orderBy('code', 'asc'));
  }, [db, selectedInstId]);
  
  const { data: accounts, isLoading } = useCollection(coaQuery);

  const filteredAccounts = accounts?.filter(acc => activeType === 'All' || acc.type === activeType) || [];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId) return;

    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as AccountType;
    const limit = parseFloat(formData.get('monthlyLimit') as string) || 0;

    // RULE: All Expense accounts are auto-tracked for budgeting
    const shouldTrack = type === 'Expense' ? true : isTrackedForBudget;

    const data = {
      code: formData.get('code'),
      name: formData.get('name'),
      type: type,
      subtype: formData.get('subtype'),
      isActive: true,
      balance: editingAcc ? editingAcc.balance : 0,
      isTrackedForBudget: shouldTrack,
      monthlyLimit: limit,
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'institutions', selectedInstId, 'coa');

    if (editingAcc) {
      updateDocumentNonBlocking(doc(colRef, editingAcc.id), data);
    } else {
      addDocumentNonBlocking(colRef, { ...data, institutionId: selectedInstId });
    }
    setIsCreateOpen(false);
    setEditingAcc(null);
    setIsTrackedForBudget(false);
  };

  const openEdit = (acc: any) => {
    setEditingAcc(acc);
    setIsTrackedForBudget(acc.isTrackedForBudget || false);
    setIsCreateOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Layers className="size-5" />
            </div>
            <h1 className="text-2xl font-headline font-bold">Chart of Accounts</h1>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[200px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if(!open) setEditingAcc(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-9 text-xs" disabled={!selectedInstId}>
                  <Plus className="size-4" /> Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingAcc ? 'Edit' : 'New'} Ledger Node</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 text-xs">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Code</Label>
                        <Input name="code" defaultValue={editingAcc?.code} placeholder="1000" required className="h-9" />
                      </div>
                      <div className="grid gap-2 col-span-2">
                        <Label>Account Name</Label>
                        <Input name="name" defaultValue={editingAcc?.name} placeholder="Office Supplies" required className="h-9 font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Account Type</Label>
                        <Select name="type" defaultValue={editingAcc?.type || "Asset"}>
                          <SelectTrigger className="h-9 text-xs font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs font-bold">{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Subtype</Label>
                        <Input name="subtype" defaultValue={editingAcc?.subtype} placeholder="Operating Expense" className="h-9" />
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2 uppercase font-black tracking-tighter">
                            <Target className="size-3.5 text-primary" /> Budget Lifecycle
                          </Label>
                          <p className="text-[10px] text-muted-foreground">Enroll this node in fiscal variance tracking.</p>
                        </div>
                        <Switch 
                          checked={isTrackedForBudget} 
                          onCheckedChange={setIsTrackedForBudget}
                        />
                      </div>
                      
                      <div className="p-3 bg-background/50 rounded-lg border border-dashed text-[10px] text-muted-foreground flex gap-2 items-start">
                        <Sparkles className="size-3 text-primary shrink-0 mt-0.5" />
                        <p><strong>Note:</strong> Expense accounts are automatically enrolled in budget tracking to enforce procurement ceilings.</p>
                      </div>

                      {isTrackedForBudget && (
                        <div className="grid gap-2 animate-in slide-in-from-top-1 duration-200">
                          <Label className="text-[10px] uppercase font-bold opacity-60">Base Monthly Ceiling</Label>
                          <Input 
                            name="monthlyLimit" 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            defaultValue={editingAcc?.monthlyLimit}
                            className="h-10 font-mono font-black text-lg bg-background"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-11 font-black uppercase text-xs shadow-lg shadow-primary/20">Save Financial Node</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <BookOpen className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to view its financial backbone.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-1 overflow-x-auto p-1 bg-secondary/20 rounded-lg w-fit">
              {['All', ...ACCOUNT_TYPES].map((type) => (
                <Button 
                  key={type} 
                  variant="ghost" 
                  size="sm" 
                  className={`h-8 px-4 text-[10px] font-bold uppercase tracking-wider ${activeType === type ? 'bg-background shadow-sm text-primary' : 'opacity-50'}`}
                  onClick={() => setActiveType(type as any)}
                >
                  {type}
                </Button>
              ))}
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Code</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Account Name</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Type / Subtype</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right">Balance</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Budget Hub</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs uppercase font-bold animate-pulse">Synchronizing ledger...</TableCell></TableRow>
                    ) : filteredAccounts.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">No accounts registered in this category.</TableCell></TableRow>
                    ) : filteredAccounts.map((acc) => (
                      <TableRow key={acc.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30">
                        <TableCell className="font-mono text-[11px] font-black text-primary pl-6 uppercase">{acc.code}</TableCell>
                        <TableCell className="font-black text-xs uppercase tracking-tight">{acc.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[8px] h-4 bg-primary/5 text-primary border-none font-black uppercase">{acc.type}</Badge>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold opacity-50">{acc.subtype}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-xs text-foreground/80">
                          {acc.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          {acc.isTrackedForBudget ? (
                            <Badge variant="secondary" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 font-black border-none uppercase shadow-sm">
                              Enrolled
                            </Badge>
                          ) : (
                            <span className="text-[8px] text-muted-foreground opacity-30">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(acc)}>
                            <Edit2 className="size-3.5 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
