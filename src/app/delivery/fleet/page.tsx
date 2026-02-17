'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { registerFleetResource } from "@/lib/delivery/delivery.service";
import { CarFront, UserPlus, Plus, Search, CheckCircle2, User, Loader2, ShieldCheck, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function FleetManagementPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'drivers' | 'vehicles'>('drivers');
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const driversQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'drivers'), orderBy('updatedAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: drivers, isLoading: driversLoading } = useCollection(driversQuery);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'vehicles'), orderBy('updatedAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: vehicles, isLoading: vehiclesLoading } = useCollection(vehiclesQuery);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data: any = {};
    formData.forEach((v, k) => data[k] = v);

    try {
      await registerFleetResource(db, selectedInstId, activeTab, data);
      toast({ title: `${activeTab.slice(0, -1).toUpperCase()} Registered` });
      setIsAddOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Registration Failed" });
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
              <CarFront className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Fleet Command</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Institutional Driver & Vehicle Registry</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase" disabled={!selectedInstId} onClick={() => setIsAddOpen(true)}>
              <Plus className="size-4" /> Register {activeTab.slice(0, -1)}
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Users className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to manage fulfillment resources.</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
            <TabsList className="bg-secondary/20 h-10 p-1">
              <TabsTrigger value="drivers" className="text-xs gap-2 px-6"><User className="size-3.5" /> Pilot Registry</TabsTrigger>
              <TabsTrigger value="vehicles" className="text-xs gap-2 px-6"><CarFront className="size-3.5" /> Institutional Fleet</TabsTrigger>
            </TabsList>

            <TabsContent value="drivers">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                  <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input placeholder="Search drivers..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">{drivers?.length || 0} Operators</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Full Name</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-black">License #</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-black">Phone</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driversLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse">Synchronizing Drivers...</TableCell></TableRow>
                      ) : drivers?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No drivers registered.</TableCell></TableRow>
                      ) : drivers?.map((d) => (
                        <TableRow key={d.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30">
                          <TableCell className="pl-6 font-bold text-xs uppercase">{d.name}</TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground">{d.licenseNumber}</TableCell>
                          <TableCell className="text-xs">{d.phone}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-[8px] h-4 uppercase font-black ${
                              d.status === 'Available' ? 'bg-emerald-500/10 text-emerald-500 border-none' : 'bg-accent/10 text-accent border-accent/20'
                            }`}>
                              {d.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vehicles">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                  <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input placeholder="Search fleet..." className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">{vehicles?.length || 0} Vehicles</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Plate Number</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-black">Model / Make</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-black">Capacity</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehiclesLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs animate-pulse">Syncing Fleet Engine...</TableCell></TableRow>
                      ) : vehicles?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No vehicles registered.</TableCell></TableRow>
                      ) : vehicles?.map((v) => (
                        <TableRow key={v.id} className="h-14 hover:bg-secondary/10 transition-colors border-b-border/30">
                          <TableCell className="pl-6 font-mono text-xs font-black uppercase text-primary">{v.plateNumber}</TableCell>
                          <TableCell className="text-xs font-bold uppercase">{v.model}</TableCell>
                          <TableCell className="text-[10px] font-mono opacity-60">{v.capacity}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-[8px] h-4 uppercase font-black ${
                              v.status === 'Available' ? 'bg-emerald-500/10 text-emerald-500 border-none' : 'bg-accent/10 text-accent border-accent/20'
                            }`}>
                              {v.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {activeTab === 'drivers' ? <UserPlus className="size-5 text-primary" /> : <CarFront className="size-5 text-primary" />}
                  <DialogTitle>Register {activeTab.slice(0, -1).toUpperCase()}</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight">Fleet Asset Initialization</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                {activeTab === 'drivers' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Operator Full Name</Label>
                      <Input name="name" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><ShieldCheck className="size-3" /> License Number</Label>
                        <Input name="licenseNumber" required className="font-mono uppercase" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Phone className="size-3" /> Phone Contact</Label>
                        <Input name="phone" required />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Plate Number</Label>
                        <Input name="plateNumber" required className="font-mono uppercase" />
                      </div>
                      <div className="space-y-2">
                        <Label>Vehicle Make/Model</Label>
                        <Input name="model" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Load Capacity (e.g. 3 Tons)</Label>
                      <Input name="capacity" required />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="h-10 font-bold uppercase text-xs w-full shadow-lg shadow-primary/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Plus className="size-3 mr-2" />} Complete Registration
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
