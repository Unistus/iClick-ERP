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
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { registerCustomer, updateCustomer, archiveCustomer } from "@/lib/crm/crm.service";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  UserCircle, 
  Phone, 
  Mail, 
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
  Clock,
  Sparkles,
  Coins,
  TrendingUp,
  Tag,
  Briefcase,
  ArrowRight,
  Edit2,
  Trash2,
  History,
  Star,
  UserCheck
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
import { logSystemEvent } from "@/lib/audit-service";
import { useUser } from "@/firebase";

export default function CustomerDirectoryPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  // Chained Select States for Logistics
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [selectedTownId, setSelectedTownId] = useState<string>("");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const segmentsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'customer_segments');
  }, [db, selectedInstId]);
  const { data: segments } = useCollection(segmentsRef);

  const typesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'customer_types');
  }, [db, selectedInstId]);
  const { data: customerTypes } = useCollection(typesRef);

  const crmSetupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'crm');
  }, [db, selectedInstId]);
  const { data: crmSetup } = useDoc(crmSetupRef);

  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'customers'), orderBy('name', 'asc'));
  }, [db, selectedInstId]);
  const { data: customers, isLoading } = useCollection(customersQuery);

  const geoQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'geo_locations');
  }, [db, selectedInstId]);
  const { data: geoNodes } = useCollection(geoQuery);

  const curRef = useMemoFirebase(() => collection(db, 'currencies'), [db]);
  const { data: currencies } = useCollection(curRef);

  const staffRef = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: staffMembers } = useCollection(staffRef);

  const countries = geoNodes?.filter(n => n.level === 'Country') || [];
  const towns = geoNodes?.filter(n => n.level === 'Town' && n.parentId === selectedCountryId) || [];
  const areas = geoNodes?.filter(n => n.level === 'Area' && n.parentId === selectedTownId) || [];

  const handleNext = () => {
    if (activeTab === "basic") setActiveTab("contact");
    else if (activeTab === "contact") setActiveTab("logistics");
    else if (activeTab === "logistics") setActiveTab("financial");
  };

  const handleCreateCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const data: any = {
      name: formData.get('name') as string,
      legalName: formData.get('legalName') as string,
      registrationNumber: formData.get('regNumber') as string,
      registrationDate: formData.get('regDate') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      status: (formData.get('status') as any) || 'Lead',
      typeId: formData.get('typeId') as string,
      segmentId: formData.get('segmentId') as string,
      currencyId: formData.get('currencyId') as string,
      assignedSalesPersonId: formData.get('salesPersonId') as string,
      contactPerson: {
        name: formData.get('cpName') as string,
        role: formData.get('cpRole') as string,
        phone: formData.get('cpPhone') as string,
      },
      creditLimit: parseFloat(formData.get('creditLimit') as string) || (crmSetup?.defaultCreditLimit || 0),
      taxPin: formData.get('taxPin') as string,
      billingAddress: formData.get('billingAddress') as string,
      shippingAddress: formData.get('shippingAddress') as string,
      geoCountryId: formData.get('geoCountryId') as string,
      geoTownId: formData.get('geoTownId') as string,
      geoAreaId: formData.get('geoAreaId') as string,
      preferredDeliveryTime: (formData.get('preferredDeliveryTime') as any),
      deliveryNotes: formData.get('deliveryNotes') as string,
    };

    // Close and reset state immediately for snappy UI (non-blocking)
    setIsCreateOpen(false);
    setIsProcessing(false);
    setEditingCustomer(null);
    setActiveTab("basic");

    if (editingCustomer) {
      updateCustomer(db, selectedInstId, editingCustomer.id, data);
      logSystemEvent(db, selectedInstId, user, 'CRM', 'Update Customer', `Updated profile for ${data.name}`);
      toast({ title: "Profile Updated" });
    } else {
      registerCustomer(db, selectedInstId, data);
      logSystemEvent(db, selectedInstId, user, 'CRM', 'Register Customer', `Onboarded new customer: ${data.name}`);
      toast({ title: "Customer Registered" });
    }
  };

  const openEdit = (customer: any) => {
    setEditingCustomer(customer);
    setSelectedCountryId(customer.geoCountryId || "");
    setSelectedTownId(customer.geoTownId || "");
    setIsCreateOpen(true);
    setActiveTab("basic");
  };

  const handleDelete = (id: string) => {
    if (!selectedInstId || !confirm("Are you sure you want to archive this customer?")) return;
    archiveCustomer(db, selectedInstId, id);
    logSystemEvent(db, selectedInstId, user, 'CRM', 'Archive Customer', `Archived customer ID: ${id}`);
    toast({ title: "Customer Archived" });
  };

  const filteredCustomers = customers?.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
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

            <Button size="sm" className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20" disabled={!selectedInstId} onClick={() => {
              setEditingCustomer(null);
              setIsCreateOpen(true);
              setActiveTab("basic");
            }}>
              <Plus className="size-4" /> New Profile
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <UserCircle className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access its customer vault.</p>
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
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Customer Identity</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Business Info</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Segment</TableHead>
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
                          <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{c.name}</span>
                          <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">BRN: {c.registrationNumber || 'PERSONAL'}</span>
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
                          <span className="text-[10px] font-bold uppercase">{segments?.find(s => s.id === c.segmentId)?.name || 'GENERAL'}</span>
                          <span className="text-[9px] text-muted-foreground opacity-60 truncate max-w-[120px]">{customerTypes?.find(t => t.id === c.typeId)?.name || 'INDIVIDUAL'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-primary">
                        {(c.loyaltyPoints || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Directory Ops</DropdownMenuLabel>
                            <DropdownMenuItem className="text-xs gap-2" onClick={() => openEdit(c)}>
                              <Edit2 className="size-3.5 text-primary" /> Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs gap-2">
                              <FileText className="size-3.5 text-accent" /> View Statement
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs gap-2">
                              <Star className="size-3.5 text-primary" /> Adjust Points
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs gap-2">
                              <History className="size-3.5" /> Interaction Log
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs gap-2">
                              <UserCheck className="size-3.5 text-emerald-500" /> Verify Identity
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs gap-2 text-destructive" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="size-3.5" /> Archive Profile
                            </DropdownMenuItem>
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
          <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh]">
            <form onSubmit={handleCreateCustomer}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <UserCircle className="size-5 text-primary" />
                  <DialogTitle>{editingCustomer ? 'Refine' : 'Register'} Customer Profile</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight text-primary">Institutional Onboarding v4.2</CardDescription>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="py-4">
                <TabsList className="bg-secondary/30 h-10 p-1 mb-4 border-b rounded-none w-full justify-start bg-transparent">
                  <TabsTrigger value="basic" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10">1. Identity</TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10">2. Key Contact</TabsTrigger>
                  <TabsTrigger value="logistics" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10">3. Logistics</TabsTrigger>
                  <TabsTrigger value="financial" className="text-xs gap-2 px-6 data-[state=active]:bg-primary/10">4. Financial Strategy</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid gap-4 py-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Trading / Display Name</Label>
                        <Input name="name" defaultValue={editingCustomer?.name} placeholder="e.g. Acme Hub" required className="h-10 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label>Legal Registered Name</Label>
                        <Input name="legalName" defaultValue={editingCustomer?.legalName} placeholder="e.g. Acme Global Solutions LTD" className="h-10 font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Hash className="size-3" /> Registration Number (BRN)</Label>
                        <Input name="regNumber" defaultValue={editingCustomer?.registrationNumber} placeholder="e.g. CPR/2023/12345" className="font-mono" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Calendar className="size-3" /> Business Reg. Date</Label>
                        <Input name="regDate" type="date" defaultValue={editingCustomer?.registrationDate} className="h-10" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Briefcase className="size-3" /> Profile Type</Label>
                        <Select name="typeId" defaultValue={editingCustomer?.typeId}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Dynamic Type..." /></SelectTrigger>
                          <SelectContent>
                            {customerTypes?.map(t => <SelectItem key={t.id} value={t.id} className="text-xs uppercase font-bold">{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Mail className="size-3" /> Corporate Email</Label>
                        <Input name="email" type="email" defaultValue={editingCustomer?.email} placeholder="finance@customer.com" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Phone className="size-3" /> Primary Phone</Label>
                        <Input name="phone" defaultValue={editingCustomer?.phone} placeholder="+254..." required />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={handleNext} className="gap-2 h-10 px-8 font-bold uppercase text-xs">
                      Next Step <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="grid gap-4 py-4 text-xs bg-secondary/5 p-6 rounded-2xl border border-dashed">
                    <div className="space-y-2">
                      <Label className="uppercase font-black text-primary tracking-widest flex items-center gap-2"><Contact className="size-4" /> Primary Decision Maker</Label>
                      <Input name="cpName" defaultValue={editingCustomer?.contactPerson?.name} placeholder="Full Name" className="bg-background h-10 font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Designation / Role</Label>
                        <Input name="cpRole" defaultValue={editingCustomer?.contactPerson?.role} placeholder="e.g. Finance Director" className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label>Direct Line</Label>
                        <Input name="cpPhone" defaultValue={editingCustomer?.contactPerson?.phone} placeholder="+254..." className="bg-background" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={handleNext} className="gap-2 h-10 px-8 font-bold uppercase text-xs">
                      Logistics Profile <ArrowRight className="size-4" />
                    </Button>
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
                            {countries.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <input type="hidden" name="geoCountryId" value={selectedCountryId} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-primary"><MapPin className="size-3" /> Town / City</Label>
                        <Select value={selectedTownId} onValueChange={setSelectedTownId} disabled={!selectedCountryId}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Pick Town" /></SelectTrigger>
                          <SelectContent>
                            {towns.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <input type="hidden" name="geoTownId" value={selectedTownId} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-primary"><LayoutGrid className="size-3" /> Specific Area</Label>
                        <Select name="geoAreaId" defaultValue={editingCustomer?.geoAreaId} disabled={!selectedTownId}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Pick Area" /></SelectTrigger>
                          <SelectContent>
                            {areas.map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-accent font-bold"><Truck className="size-3" /> Shipping / Delivery Address</Label>
                        <Textarea name="shippingAddress" defaultValue={editingCustomer?.shippingAddress} placeholder="Physical site for inventory delivery..." className="min-h-[80px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-muted-foreground font-bold"><Clock className="size-3" /> Delivery Logic Notes</Label>
                        <Textarea name="deliveryNotes" defaultValue={editingCustomer?.deliveryNotes} placeholder="Access codes, gate instructions..." className="min-h-[80px]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Fulfillment Window</Label>
                      <Select name="preferredDeliveryTime" defaultValue={editingCustomer?.preferredDeliveryTime || "Afternoon"}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning" className="text-xs">Morning (08:00 - 12:00)</SelectItem>
                          <SelectItem value="Afternoon" className="text-xs">Afternoon (12:00 - 17:00)</SelectItem>
                          <SelectItem value="Evening" className="text-xs">Evening (17:00 - 20:00)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={handleNext} className="gap-2 h-10 px-8 font-bold uppercase text-xs">
                      Financial Controls <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-4">
                  <div className="grid gap-6 py-4 text-xs">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <Label className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest"><ShieldCheck className="size-4" /> Regulatory Tax PIN</Label>
                          <Input name="taxPin" defaultValue={editingCustomer?.taxPin} placeholder="e.g. P051..." className="font-mono font-bold h-10 bg-background" />
                          <p className="text-[8px] text-muted-foreground italic">Required for verified institutional invoicing.</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5 text-emerald-500 font-bold uppercase"><BadgeCent className="size-4" /> Credit Trust Ceiling</Label>
                          <Input name="creditLimit" type="number" step="0.01" defaultValue={editingCustomer?.creditLimit || crmSetup?.defaultCreditLimit} className="h-12 font-black text-xl bg-secondary/10" />
                          <p className="text-[9px] text-muted-foreground">Authorized credit balance for non-prepaid transactions.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5 text-accent font-bold uppercase"><Coins className="size-4" /> Settlement Currency</Label>
                          <Select name="currencyId" defaultValue={editingCustomer?.currencyId || "KES"}>
                            <SelectTrigger className="h-10 font-bold"><SelectValue placeholder="Select Base..." /></SelectTrigger>
                            <SelectContent>
                              {currencies?.map(curr => <SelectItem key={curr.id} value={curr.id} className="text-xs font-bold">{curr.id} - {curr.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5 text-primary font-bold uppercase"><FileText className="size-4" /> Financial Billing Address</Label>
                          <Textarea name="billingAddress" defaultValue={editingCustomer?.billingAddress} placeholder="Address for official tax statements..." className="min-h-[100px] bg-secondary/5" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest"><Tag className="size-4" /> Segment</Label>
                            <Select name="segmentId" defaultValue={editingCustomer?.segmentId}>
                              <SelectTrigger className="h-10"><SelectValue placeholder="Select Cluster..." /></SelectTrigger>
                              <SelectContent>
                                {segments?.map(s => <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase">{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest"><TrendingUp className="size-4" /> Strategist</Label>
                            <Select name="salesPersonId" defaultValue={editingCustomer?.assignedSalesPersonId}>
                              <SelectTrigger className="h-10"><SelectValue placeholder="Assign Manager..." /></SelectTrigger>
                              <SelectContent>
                                {staffMembers?.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.email?.split('@')[0].toUpperCase()}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Customer Standing</Label>
                          <Select name="status" defaultValue={editingCustomer?.status || "Lead"}>
                            <SelectTrigger className="h-10 font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Lead" className="text-xs font-bold">LEAD (Prospect)</SelectItem>
                              <SelectItem value="Active" className="text-xs font-bold">ACTIVE (Pre-approved)</SelectItem>
                              <SelectItem value="Blocked" className="text-xs font-bold text-destructive">BLOCKED (Locked)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg border-t gap-2">
                <div className="flex-1 flex items-center gap-2 text-[10px] text-muted-foreground opacity-50 uppercase font-bold">
                  <Sparkles className="size-3" /> System indexed onboarding
                </div>
                <Button type="button" variant="ghost" onClick={() => { setIsCreateOpen(false); setEditingCustomer(null); setActiveTab("basic"); }} className="text-xs h-10 font-bold uppercase">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 px-10 font-bold uppercase text-xs shadow-xl shadow-primary/20 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-4" />} {editingCustomer ? 'Update Profile' : 'Finalize Customer Profile'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
