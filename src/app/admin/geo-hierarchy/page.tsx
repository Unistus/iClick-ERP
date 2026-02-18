
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
import { collection, doc, serverTimestamp, query, orderBy, deleteDoc } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Globe, MapPin, Plus, Trash2, ChevronRight, LayoutGrid, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const GEO_LEVELS = ["Continent", "Region", "Country", "Town", "Area"] as const;

export default function GeoHierarchyPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const geoQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'geo_locations'), orderBy('level', 'asc'));
  }, [db, selectedInstId]);
  
  const { data: locations, isLoading } = useCollection(geoQuery);

  const handleAddLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      level: formData.get('level') as string,
      parentId: formData.get('parentId') as string || 'root',
      updatedAt: serverTimestamp(),
    };

    try {
      await addDocumentNonBlocking(collection(db, 'institutions', selectedInstId, 'geo_locations'), data);
      toast({ title: "Node Deployed", description: `${data.name} added to ${data.level} hierarchy.` });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Deployment Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteNode = (id: string) => {
    deleteDoc(doc(db, 'institutions', selectedInstId, 'geo_locations', id));
    toast({ title: "Node Terminated" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Globe className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Geographic Hierarchy</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Territory & Logistics Mapping</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
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

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Node
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <MapPin className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure its operational map.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Territory Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Location Name</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Hierarchy Level</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Parent Context</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Management</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse font-bold tracking-widest opacity-50">Polling Atlas...</TableCell></TableRow>
                    ) : locations?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No geographic nodes mapped.</TableCell></TableRow>
                    ) : locations?.map((loc) => (
                      <TableRow key={loc.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6 font-bold text-xs uppercase tracking-tight">{loc.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[8px] h-4 font-black uppercase border-primary/20 text-primary">{loc.level}</Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground italic">
                          {locations.find(l => l.id === loc.parentId)?.name || 'Root'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" className="size-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteNode(loc.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12"><LayoutGrid className="size-24" /></div>
                <div className="space-y-3 relative z-10">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Fulfillment Logic</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                    "Territorial hierarchy is utilized by the <strong>Logistics Hub</strong> to batch deliveries and by <strong>CRM</strong> to profile client proximity."
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleAddLocation}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="size-5 text-primary" />
                  <DialogTitle>Register Geographic Node</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight">Hierarchy Initialization</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Node Label / Name</Label>
                  <Input name="name" placeholder="e.g. Nairobi, East Africa, Westlands" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hierarchy Level</Label>
                    <Select name="level" defaultValue="Area" required>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GEO_LEVELS.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Context</Label>
                    <Select name="parentId">
                      <SelectTrigger className="h-9"><SelectValue placeholder="Root Context" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">Institutional Root</SelectItem>
                        {locations?.map(l => <SelectItem key={l.id} value={l.id} className="text-xs">{l.name} ({l.level})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs w-full shadow-lg shadow-primary/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Plus className="size-3 mr-2" />} Deploy Node
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
