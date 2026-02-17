
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, doc, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Database, Plus, MapPin, Warehouse, CheckCircle2, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function WarehousesPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const warehouseQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'warehouses'));
  }, [db, selectedInstId]);
  const { data: warehouses, isLoading } = useCollection(warehouseQuery);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      location: formData.get('location') as string,
      isDefault: formData.get('isDefault') === 'on',
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'institutions', selectedInstId, 'warehouses');
    addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp() });

    toast({ title: "Storage Site Registered" });
    setIsCreateOpen(false);
    setIsProcessing(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Warehouse className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Storage Network</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Multi-site Warehouse Nodes</p>
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
              <Plus className="size-4" /> Add Site
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Database className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage its warehouse topology.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {warehouses?.map((w) => (
              <Card key={w.id} className="border-none ring-1 ring-border shadow-md bg-card group hover:ring-primary/30 transition-all">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      <Warehouse className="size-6" />
                    </div>
                    {w.isDefault && (
                      <Badge variant="secondary" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 font-bold uppercase tracking-tighter">
                        <CheckCircle2 className="size-2 mr-1" /> Primary Site
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg leading-none">{w.name}</h3>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{w.code}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <MapPin className="size-3" /> {w.location}
                    </div>
                    <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Register Warehouse Site</DialogTitle>
                <CardDescription>Establish a new physical or logical storage node.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Site Name</Label>
                    <Input name="name" placeholder="e.g. Main Central Store" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input name="code" placeholder="WH-01" required className="font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Physical Address / Location</Label>
                  <Input name="location" placeholder="e.g. Industrial Area, Wing B" required />
                </div>
                <div className="flex items-center justify-between p-3 border rounded bg-secondary/10">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] uppercase font-bold">Set as Default?</Label>
                    <p className="text-[9px] text-muted-foreground">Used for initial stock receipt and POS deduction.</p>
                  </div>
                  <input type="checkbox" name="isDefault" className="size-4" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" className="h-10 font-bold uppercase text-xs">Deploy Site</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
