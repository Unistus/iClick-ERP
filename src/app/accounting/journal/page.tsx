
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Plus, History, Calculator, ArrowRightLeft, Save, Trash2, AlertCircle, CheckCircle2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { postJournalEntry, type JournalItem } from "@/lib/accounting/journal.service";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function JournalEntriesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Form State
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [items, setItems] = useState<JournalItem[]>([
    { accountId: "", amount: 0, type: 'Debit' },
    { accountId: "", amount: 0, type: 'Credit' },
  ]);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const entriesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(
      collection(db, 'institutions', selectedInstId, 'journal_entries'), 
      orderBy('date', 'desc'),
      limit(50)
    );
  }, [db, selectedInstId]);
  const { data: entries, isLoading: entriesLoading } = useCollection(entriesQuery);

  const coaRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'coa'), orderBy('code', 'asc'));
  }, [db, selectedInstId]);
  const { data: accounts } = useCollection(coaRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  // Calculations
  const totalDebit = items.filter(i => i.type === 'Debit').reduce((sum, i) => sum + i.amount, 0);
  const totalCredit = items.filter(i => i.type === 'Credit').reduce((sum, i) => sum + i.amount, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addItem = () => setItems([...items, { accountId: "", amount: 0, type: 'Debit' }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof JournalItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handlePost = async () => {
    if (!selectedInstId || !isBalanced || isPosting) return;
    setIsPosting(true);

    try {
      // 1. Fetch Sequence for Reference
      const seqRef = doc(db, 'institutions', selectedInstId, 'document_sequences', 'journal_entry');
      const seqSnap = await getDoc(seqRef);
      let reference = `JE-${Date.now()}`;

      if (seqSnap.exists()) {
        const seqData = seqSnap.data();
        reference = `${seqData.prefix}${seqData.nextNumber.toString().padStart(seqData.padding, '0')}`;
        
        // Non-blocking update of sequence
        await runTransaction(db, async (transaction) => {
          const s = await transaction.get(seqRef);
          if (s.exists()) {
            transaction.update(seqRef, { nextNumber: s.data().nextNumber + 1 });
          }
        });
      }

      // 2. Post Journal
      await postJournalEntry(db, selectedInstId, {
        date: new Date(date),
        description,
        reference,
        items: items.filter(i => i.accountId && i.amount > 0)
      });

      logSystemEvent(db, selectedInstId, user, 'ACCOUNTING', 'Post Journal', `Manual entry ${reference} posted.`);
      toast({ title: "Journal Posted", description: `Reference: ${reference}` });
      setIsCreateOpen(false);
      resetForm();
    } catch (err) {
      toast({ variant: "destructive", title: "Posting Failed", description: "Ledger transaction error." });
    } finally {
      setIsPosting(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setItems([{ accountId: "", amount: 0, type: 'Debit' }, { accountId: "", amount: 0, type: 'Credit' }]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <History className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Journal Entries</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Double-Entry Financial Records</p>
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

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId}>
                  <Plus className="size-4" /> New Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2 shrink-0 border-b">
                  <DialogTitle className="text-xl">Create Journal Entry</DialogTitle>
                  <CardDescription>Record manual adjustments or external transactions to the general ledger.</CardDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold opacity-60">Entry Description</Label>
                      <Input 
                        placeholder="e.g. Opening balance adjustment" 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-secondary/10 border-none ring-1 ring-border h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold opacity-60">Transaction Date</Label>
                      <Input 
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-secondary/10 border-none ring-1 ring-border h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-secondary/20">
                        <TableRow>
                          <TableHead className="text-[10px] uppercase font-bold h-9">Ledger Account</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold h-9 w-[120px]">Type</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold h-9 text-right w-[150px]">Amount</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold h-9 text-right w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={idx} className="h-12">
                            <TableCell>
                              <Select value={item.accountId} onValueChange={(val) => updateItem(idx, 'accountId', val)}>
                                <SelectTrigger className="h-8 text-[11px] bg-transparent border-none ring-1 ring-border">
                                  <SelectValue placeholder="Select Account..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts?.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                      [{acc.code}] {acc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select value={item.type} onValueChange={(val: any) => updateItem(idx, 'type', val)}>
                                <SelectTrigger className="h-8 text-[11px] bg-transparent border-none ring-1 ring-border">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Debit" className="text-xs">DEBIT</SelectItem>
                                  <SelectItem value="Credit" className="text-xs">CREDIT</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input 
                                type="number" 
                                value={item.amount || ''} 
                                onChange={(e) => updateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                className="h-8 text-right font-mono text-xs bg-transparent border-none ring-1 ring-border"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => removeItem(idx)} disabled={items.length <= 2}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="p-3 bg-secondary/10 border-t flex justify-start">
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-2 uppercase font-bold" onClick={addItem}>
                        <Plus className="size-3" /> Add Row
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t bg-secondary/5 shrink-0">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex gap-8">
                      <div className="text-center">
                        <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Total Debits</p>
                        <p className="text-lg font-mono font-bold text-emerald-500">{currency} {totalDebit.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Total Credits</p>
                        <p className="text-lg font-mono font-bold text-destructive">{currency} {totalCredit.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {!isBalanced && totalDebit > 0 && (
                        <div className="flex items-center gap-2 text-destructive text-[10px] font-bold uppercase animate-pulse">
                          <AlertCircle className="size-3.5" /> Out of Balance ({currency} {Math.abs(totalDebit - totalCredit).toLocaleString()})
                        </div>
                      )}
                      {isBalanced && (
                        <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase">
                          <CheckCircle2 className="size-3.5" /> Entry Balanced
                        </div>
                      )}
                      <Button 
                        disabled={!isBalanced || isPosting} 
                        onClick={handlePost}
                        className="gap-2 px-8 font-bold uppercase text-xs h-10 shadow-lg shadow-primary/20"
                      >
                        {isPosting ? <Plus className="size-4 animate-spin" /> : <Save className="size-4" />} Post Entry
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Calculator className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to view its primary double-entry log.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card">
            <CardHeader className="py-3 px-6 border-b border-border/50 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search references or descriptions..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{entries?.length || 0} Recent Records</p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Timestamp</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold">Reference</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold">Description</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Debit</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right">Credit</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs">Synchronizing ledger...</TableCell></TableRow>
                  ) : !entries || entries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">No financial activity recorded yet.</TableCell></TableRow>
                  ) : entries.map((entry) => {
                    const debits = entry.items?.reduce((sum: number, i: any) => i.type === 'Debit' ? sum + i.amount : sum, 0) || 0;
                    const credits = entry.items?.reduce((sum: number, i: any) => i.type === 'Credit' ? sum + i.amount : sum, 0) || 0;

                    return (
                      <TableRow key={entry.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">{entry.date ? format(entry.date.toDate(), 'dd MMM yyyy') : 'Pending'}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">{entry.date ? format(entry.date.toDate(), 'HH:mm:ss') : ''}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] font-bold text-primary">{entry.reference}</TableCell>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate">{entry.description}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-[11px] text-emerald-500">
                          {currency} {debits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-[11px] text-destructive">
                          {currency} {credits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-500 font-bold px-2">POSTED</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
