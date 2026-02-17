
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
import { collection, query, orderBy, where, doc, updateDoc } from "firebase/firestore";
import { registerCustomer } from "@/lib/crm/crm.service";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  UserCircle,
  Phone,
  Mail,
  CreditCard,
  Crown,
  Loader2,
  MoreVertical,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function CustomerDirectoryPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'customers'), orderBy('name', 'asc'));
  }, [db, selectedInstId]);
  const { data: customers, isLoading } = useCollection(customersQuery);

  const handleCreateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      status: formData.get('status') as any || 'Lead',
      tier: 'Silver',
      creditLimit: parseFloat(formData.get('creditLimit') as string) || 0,
      birthday: formData.get('birthday') as string,
    };

    try {
      await registerCustomer(db, selectedInstId, data);
      toast({ title: "Customer Onboarded", description: "Identity verified and profile indexed." });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Registration Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStatus = async (customerId: string, status: string) => {
    const ref = doc(db, 'institutions', selectedInstId, 'customers', customerId);
    await updateDoc(ref, { status });
    toast({ title: `Status Updated to ${status}` });
  };

  const filteredCustomers = customers?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Customer Directory</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Master Identity & Relationship Ledger</p>
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

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId} onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> New Profile
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <UserCircle className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access its client vault.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search name, phone or email..." 
                  className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter text-primary">
                {isLoading ? "Polling Directory..." : `${filteredCustomers.length} Identities`}
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Client Identity</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Contact Points</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Tier</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right">Points</TableHead>
                    <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Management</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Syncing CRM Hub...</TableCell></TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No matching profiles found.</TableCell></TableRow>
                  ) : filteredCustomers.map((c) => (
                    <TableRow key={c.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-tight">{c.name}</span>
                          <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">REF: {c.id.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Mail className="size-3" /> {c.email}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Phone className="size-3" /> {c.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-[8px] h-4 uppercase font-black ${
                          c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-none' : 
                          c.status === 'Lead' ? 'bg-primary/10 text-primary border-none' : 'bg-destructive/10 text-destructive border-none'
                        }`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[8px] h-4 uppercase font-black bg-accent/10 text-accent border-none gap-1">
                          <Crown className="size-2" /> {c.tier || 'Silver'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-primary">
                        {(c.loyaltyPoints || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100"><MoreVertical className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest">Profile Control</DropdownMenuLabel>
                            <DropdownMenuItem className="text-xs gap-2" onClick={() => updateStatus(c.id, 'Active')}><CheckCircle2 className="size-3.5 text-emerald-500" /> Approve Profile</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs gap-2" onClick={() => updateStatus(c.id, 'Blocked')}><XCircle className="size-3.5 text-destructive" /> Block Client</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs gap-2"><CreditCard className="size-3.5" /> Adjust Wallet</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreateCustomer}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <UserCircle className="size-5 text-primary" />
                  <DialogTitle>Register Client Profile</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight">Identity Initialization v1.4</CardDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 text-xs">
                <div className="space-y-2">
                  <Label>Full Trading Name / Individual</Label>
                  <Input name="name" placeholder="e.g. Acme Corp or Jane Doe" required className="h-10 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Mail className="size-3" /> Email Address</Label>
                    <Input name="email" type="email" placeholder="jane@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Phone className="size-3" /> Phone Contact</Label>
                    <Input name="phone" placeholder="+254..." required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Calendar className="size-3" /> Birthday (Promo Trigger)</Label>
                    <Input name="birthday" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><CreditCard className="size-3" /> Credit Limit</Label>
                    <Input name="creditLimit" type="number" step="0.01" placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Initial Status</Label>
                  <Select name="status" defaultValue="Lead">
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lead">Lead (Awaiting verification)</SelectItem>
                      <SelectItem value="Active">Active (Ready for billing)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-10 font-bold uppercase">Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 px-10 font-bold uppercase text-xs shadow-xl shadow-primary/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <CheckCircle2 className="size-3 mr-2" />} Finalize Profile
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
