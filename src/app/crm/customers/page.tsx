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
import { collection, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { registerCustomer } from "@/lib/crm/crm.service";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  UserCircle, 
  Phone, 
  Mail, 
  CreditCard, 
  Loader2, 
  MoreVertical, 
  Calendar, 
  MapPin, 
  Truck, 
  Building2, 
  Contact, 
  Hash, 
  Globe, 
  LayoutGrid,
  CheckCircle2,
  BadgeCent,
  ShieldCheck,
  FileText,
  Clock
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function CustomerDirectoryPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Hierarchy Picking State
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [selectedTownId, setSelectedTownId] = useState<string>("");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'customers'), orderBy('name', 'asc'));
  }, [db, selectedInstId]);
  const { data: customers, isLoading } = useCollection(customersQuery);

  // Geo Hierarchy Data
  const geoQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'geo_locations');
  }, [db, selectedInstId]);
  const { data: geoNodes } = useCollection(geoQuery);

  const countries = geoNodes?.filter(n => n.level === 'Country') || [];
  const towns = geoNodes?.filter(n => n.level === 'Town' && n.parentId === selectedCountryId) || [];
  const areas = geoNodes?.filter(n => n.level === 'Area' && n.parentId === selectedTownId) || [];

  const handleCreateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      legalName: formData.get('legalName') as string,
      registrationNumber: formData.get('regNumber') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      status: formData.get('status') as any || 'Lead',
      tier: 'Silver',
      contactPerson: {
        name: formData.get('cpName') as string,
        role: formData.get('cpRole') as string,
        phone: formData.get('cpPhone') as string,
      },
      creditLimit: parseFloat(formData.get('creditLimit') as string) || 0,
      birthday: formData.get('birthday') as string,
      taxPin: formData.get('taxPin') as string,
      billingAddress: formData.get('billingAddress') as string,
      shippingAddress: formData.get('shippingAddress') as string,
      geoCountryId: selectedCountryId,
      geoTownId: selectedTownId,
      geoAreaId: formData.get('areaId') as string,
      preferredDeliveryTime: formData.get('preferredDeliveryTime') as any,
      deliveryNotes: formData.get('deliveryNotes') as string,
    };

    try {
      await registerCustomer(db, selectedInstId, data);
      toast({ title: "Customer Onboarded", description: "Profile indexed with hierarchical logistics." });
      setIsCreateOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Registration Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCustomers = customers?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
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
              <h1 className="text-2xl font-headline font-bold text-foreground">Client Directory</h1>
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
                    <TableHead className="h-10 text-[10px] uppercase font-black">Business Info</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Territory</TableHead>
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
                          <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">ID: {c.registrationNumber || 'PERSONAL'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase"><Building2 className="size-3" /> {c.legalName || c.name}</div>
                          <div className="flex items-center gap-1.5 text-[9px] text-primary opacity-60 uppercase"><Contact className="size-3" /> {c.contactPerson?.name || 'N/A'}</div>
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
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase">{geoNodes?.find(n => n.id === c.geoTownId)?.name || 'UNMAPPED'}</span>
                          <span className="text-[9px] text-muted-foreground opacity-60 truncate max-w-[120px]">{c.shippingAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-primary">
                        {(c.loyaltyPoints || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh]">
            <form onSubmit={handleCreateCustomer}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <UserCircle className="size-5 text-primary" />
                  <DialogTitle>Register Professional Profile</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight text-primary">Client Onboarding v3.5</CardDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basic" className="py-4">
                <TabsList className="bg-secondary/30 h-10 p-1 mb-4">
                  <TabsTrigger value="basic" className="text-xs gap-2 px-6">1. Identity</TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs gap-2 px-6">2. Contact Person</TabsTrigger>
                  <TabsTrigger value="logistics" className="text-xs gap-2 px-6">3. Logistics</TabsTrigger>
                  <TabsTrigger value="financial" className="text-xs gap-2 px-6">4. Tax & Financials</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid gap-4 py-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Trading / Display Name</Label>
                        <Input name="name" placeholder="e.g. Acme Hub" required className="h-10 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label>Legal Business Name</Label>
                        <Input name="legalName" placeholder="e.g. Acme Global Solutions LTD" className="h-10 font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Hash className="size-3" /> Registration Number (BRN)</Label>
                        <Input name="regNumber" placeholder="e.g. CPR/2023/12345" className="font-mono" />
                      </div>
                      <div className="space-y-2">
                        <Label>Initial Status</Label>
                        <Select name="status" defaultValue="Lead">
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lead">Lead (Market Prospect)</SelectItem>
                            <SelectItem value="Active">Active (Invoicing Enabled)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Mail className="size-3" /> Communication Email</Label>
                        <Input name="email" type="email" placeholder="finance@client.com" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Phone className="size-3" /> Main Phone</Label>
                        <Input name="phone" placeholder="+254..." required />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="grid gap-4 py-4 text-xs bg-secondary/10 p-4 rounded-xl border border-dashed">
                    <div className="space-y-2">
                      <Label className="uppercase font-bold tracking-widest">Main Decision Maker / Contact Full Name</Label>
                      <Input name="cpName" placeholder="e.g. John Doe" className="bg-background" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Designation / Role</Label>
                        <Input name="cpRole" placeholder="e.g. Procurement Manager" className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label>Direct Mobile</Label>
                        <Input name="cpPhone" placeholder="+254..." className="bg-background" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="logistics" className="space-y-4">
                  <div className="grid gap-4 py-4 text-xs">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-primary"><Globe className="size-3" /> Country</Label>
                        <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Pick Country" /></SelectTrigger>
                          <SelectContent>
                            {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-primary"><MapPin className="size-3" /> Town / City</Label>
                        <Select value={selectedTownId} onValueChange={setSelectedTownId} disabled={!selectedCountryId}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Pick Town" /></SelectTrigger>
                          <SelectContent>
                            {towns.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-primary"><LayoutGrid className="size-3" /> Specific Area</Label>
                        <Select name="areaId" disabled={!selectedTownId}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Pick Area" /></SelectTrigger>
                          <SelectContent>
                            {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-accent font-bold"><Truck className="size-3" /> Delivery Address</Label>
                        <Textarea name="shippingAddress" placeholder="e.g. 4th Floor, Westlands Hub, Suite 402" className="min-h-[80px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-muted-foreground font-bold"><Clock className="size-3" /> Delivery Logistics Notes</Label>
                        <Textarea name="deliveryNotes" placeholder="e.g. Ring bell at gate, specific entry instructions..." className="min-h-[80px]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Delivery Window</Label>
                      <Select name="preferredDeliveryTime" defaultValue="Afternoon">
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning">Morning (08:00 - 12:00)</SelectItem>
                          <SelectItem value="Afternoon">Afternoon (12:00 - 17:00)</SelectItem>
                          <SelectItem value="Evening">Evening (17:00 - 20:00)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-4">
                  <div className="grid gap-6 py-4 text-xs">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5 text-primary font-bold"><ShieldCheck className="size-3" /> Tax PIN (KRA PIN / TIN)</Label>
                          <Input name="taxPin" placeholder="e.g. P051..." className="font-mono font-bold h-10" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5 text-accent font-bold"><BadgeCent className="size-3" /> Credit Trust Limit</Label>
                          <Input name="creditLimit" type="number" step="0.01" placeholder="0.00" className="h-10 font-black text-lg" />
                          <p className="text-[9px] text-muted-foreground italic">Authorized credit ceiling for unpaid finalized invoices.</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5 text-primary font-bold"><FileText className="size-3" /> Financial / Billing Address</Label>
                          <Textarea name="billingAddress" placeholder="Address for official invoices and tax reports..." className="min-h-[100px]" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5 text-primary font-bold"><Calendar className="size-3" /> Date of Birth</Label>
                          <Input name="birthday" type="date" className="h-10" />
                          <p className="text-[9px] text-muted-foreground italic">Used for automated birthday loyalty discounts.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-10 font-bold uppercase">Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 px-10 font-bold uppercase text-xs shadow-xl shadow-primary/20">
                  {isProcessing ? <Loader2 className="size-3 animate-spin mr-2" /> : <CheckCircle2 className="size-3 mr-2" />} Finalize Onboarding
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
