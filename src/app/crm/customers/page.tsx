'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { registerCustomer, updateCustomer, archiveCustomer, approveCustomer, verifyKYC } from "@/lib/crm/crm.service";
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
  UserCheck,
  ShieldAlert,
  Zap
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
import { cn } from "@/lib/utils";

export default function CustomerDirectoryPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  // Logistics chaining
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [selectedTownId, setSelectedTownId] = useState<string>("");

  // UI CLEANUP HOOK
  useEffect(() => {
    if (!isCreateOpen) {
      setEditingCustomer(null);
      setActiveTab("basic");
      setIsProcessing(false);
      setSelectedCountryId("");
      setSelectedTownId("");
    }
  }, [isCreateOpen]);

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
    return query(collection(db, 'institutions', selectedInstId, 'customers'), orderBy('updatedAt', 'desc'));
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
      status: editingCustomer ? (formData.get('status') as any) : 'Pending',
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

    setIsCreateOpen(false);

    if (editingCustomer) {
      updateCustomer(db, selectedInstId, editingCustomer.id, data);
      logSystemEvent(db, selectedInstId, user, 'CRM', 'Update Customer', `Updated profile for ${data.name}`);
      toast({ title: "Profile Updated" });
    } else {
      registerCustomer(db, selectedInstId, data);
      logSystemEvent(db, selectedInstId, user, 'CRM', 'Register Customer', `Onboarded new customer: ${data.name}. Status: PENDING APPROVAL.`);
      toast({ title: "Registration Received", description: "Customer awaiting administrative approval." });
    }
  };

  const handleApprove = (id: string, name: string) => {
    if (!selectedInstId) return;
    approveCustomer(db, selectedInstId, id).then(() => {
      logSystemEvent(db, selectedInstId, user, 'CRM', 'Approve Customer', `Approved ${name} for Sales operations.`);
      toast({ title: "Customer Approved", description: `${name} can now be accessed in Sales module.` });
    });
  };

  const handleVerifyKYC = (id: string, name: string) => {
    if (!selectedInstId) return;
    verifyKYC(db, selectedInstId, id).then(() => {
      logSystemEvent(db, selectedInstId, user, 'CRM', 'KYC Verification', `KYC identity verified for ${name}.`);
      toast({ title: "KYC Verified" });
    });
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
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Master Identity & Approval Hub</p>
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
            <p className="text-sm font-medium text-muted-foreground">Select an institution to access its customer vault.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search identity or email..." 
                  className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px] font-bold uppercase text-primary border-primary/20 bg-primary/5 h-7 px-3">
                  {filteredCustomers.length} Records
                </Badge>
                <Badge variant="outline" className="text-[10px] font-bold uppercase text-accent border-accent/20 bg-accent/5 h-7 px-3">
                  {filteredCustomers.filter(c => c.status === 'Pending').length} Awaiting Approval
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Customer Identity</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">KYC</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black">Segment</TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-black text-right">Credit Limit</TableHead>
                    <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Management</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Polling CRM Vault...</TableCell></TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">No matching profiles found.</TableCell></TableRow>
                  ) : filteredCustomers.map((c) => (
                    <TableRow key={c.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{c.name}</span>
                          <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">{c.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "text-[8px] h-4 uppercase font-black border-none",
                          c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 
                          c.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 
                          c.status === 'Lead' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                        )}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.kycVerified ? (
                          <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[9px] uppercase">
                            <ShieldCheck className="size-3" /> Verified
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground opacity-40 font-bold text-[9px] uppercase">
                            <ShieldAlert className="size-3" /> Unverified
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-bold uppercase">{segments?.find(s => s.id === c.segmentId)?.name || 'GENERAL'}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-primary">
                        {currency} {c.creditLimit?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-2">
                          {c.status === 'Pending' && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 text-[9px] font-black uppercase gap-1.5 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
                              onClick={() => handleApprove(c.id, c.name)}
                            >
                              <CheckCircle2 className="size-3" /> Approve
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comprehensive Management</DropdownMenuLabel>
                              <DropdownMenuItem className="text-xs gap-2" onClick={() => openEdit(c)}>
                                <Edit2 className="size-3.5 text-primary" /> Edit Identity Profile
                              </DropdownMenuItem>
                              {!c.kycVerified && (
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => handleVerifyKYC(c.id, c.name)}>
                                  <UserCheck className="size-3.5 text-emerald-500" /> Verify KYC Documents
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-xs gap-2">
                                <Coins className="size-3.5 text-amber-500" /> Adjust Credit Trust
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-2">
                                <Star className="size-3.5 text-primary" /> Manual Points Override
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs gap-2">
                                <History className="size-3.5" /> View Activity Stream
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-2">
                                <FileText className="size-3.5 text-accent" /> Export Statements
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs gap-2 text-destructive" onClick={() => handleDelete(c.id)}>
                                <Trash2 className="size-3.5" /> Archive Profile
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh] ring-1 ring-border shadow-2xl">
            <form onSubmit={handleCreateCustomer}>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><UserCircle className="size-5" /></div>
                  <DialogTitle>{editingCustomer ? 'Refine' : 'Register'} Customer Profile</DialogTitle>
                </div>
                <CardDescription className="text-xs uppercase font-black tracking-tight text-primary">Onboarding Status: {editingCustomer ? editingCustomer.status : 'PENDING APPROVAL'}</CardDescription>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="py-4">
                <TabsList className="bg-secondary/30 h-10 p-1 mb-4 border-b rounded-none w-full justify-start bg-transparent">
                  <TabsTrigger value="basic" className="text-xs gap-2 px-6 rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10">1. Identity</TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs gap-2 px-6 rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10">2. Contacts</TabsTrigger>
                  <TabsTrigger value="logistics" className="text-xs gap-2 px-6 rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10">3. Logistics</TabsTrigger>
                  <TabsTrigger value="financial" className="text-xs gap-2 px-6 rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10">4. Strategy</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid gap-4 py-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="uppercase font-bold tracking-widest opacity-60">Trading / Display Name</Label>
                        <Input name="name" defaultValue={editingCustomer?.name} placeholder="e.g. Acme Hub" required className="h-10 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase font-bold tracking-widest opacity-60">Legal Registered Name</Label>
                        <Input name="legalName" defaultValue={editingCustomer?.legalName} placeholder="e.g. Acme Global Solutions LTD" className="h-10 font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 uppercase font-bold tracking-widest opacity-60"><Hash className="size-3" /> Registration # (BRN)</Label>
                        <Input name="regNumber" defaultValue={editingCustomer?.registrationNumber} placeholder="e.g. CPR/2023/12345" className="font-mono" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 uppercase font-bold tracking-widest opacity-60"><Calendar className="size-3" /> Business Reg. Date</Label>
                        <Input name="regDate" type="date" defaultValue={editingCustomer?.registrationDate} className="h-10" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 uppercase font-bold tracking-widest opacity-60"><Briefcase className="size-3" /> Profile Type</Label>
                        <Select name="typeId" defaultValue={editingCustomer?.typeId}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Pick Type..." /></SelectTrigger>
                          <SelectContent>
                            {customerTypes?.map(t => <SelectItem key={t.id} value={t.id} className="text-xs uppercase font-bold">{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 uppercase font-bold tracking-widest opacity-60"><Mail className="size-3" /> Corporate Email</Label>
                        <Input name="email" type="email" defaultValue={editingCustomer?.email} placeholder="finance@customer.com" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 uppercase font-bold tracking-widest opacity-60"><Phone className="size-3" /> Primary Phone</Label>
                        <Input name="phone" defaultValue={editingCustomer?.phone} placeholder="+254..." required />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={handleNext} className="gap-2 h-10 px-8 font-bold uppercase text-xs shadow-lg shadow-primary/20">
                      Next Step <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="grid gap-4 py-4 text-xs bg-secondary/5 p-6 rounded-2xl border border-dashed border-border/50">
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
                    <Button type="button" onClick={handleNext} className="gap-2 h-10 px-8 font-bold uppercase text-xs shadow-lg shadow-primary/20">
                      Logistics Profile <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="logistics" className="space-y-4">
                  <div className="grid gap-4 py-4 text-xs">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-primary font-bold uppercase tracking-widest opacity-60"><Globe className="size-3" /> Country</Label>
                        <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Pick Country" /></SelectTrigger>
                          <SelectContent>
                            {countries.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <input type="hidden" name="geoCountryId" value={selectedCountryId} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-primary font-bold uppercase tracking-widest opacity-60"><MapPin className="size-3" /> Town / City</Label>
                        <Select value={selectedTownId} onValueChange={setSelectedTownId} disabled={!selectedCountryId}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Pick Town" /></SelectTrigger>
                          <SelectContent>
                            {towns.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <input type="hidden" name="geoTownId" value={selectedTownId} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-primary font-bold uppercase tracking-widest opacity-60"><LayoutGrid className="size-3" /> Specific Area</Label>
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
                        <Label className="flex items-center gap-1.5 text-accent font-bold uppercase tracking-widest opacity-60"><Truck className="size-3" /> Shipping Address</Label>
                        <Textarea name="shippingAddress" defaultValue={editingCustomer?.shippingAddress} placeholder="Physical site for inventory delivery..." className="min-h-[80px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-muted-foreground font-bold uppercase tracking-widest opacity-60"><Clock className="size-3" /> Fulfillment Notes</Label>
                        <Textarea name="deliveryNotes" defaultValue={editingCustomer?.deliveryNotes} placeholder="Access codes, gate instructions..." className="min-h-[80px]" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={handleNext} className="gap-2 h-10 px-8 font-bold uppercase text-xs shadow-lg shadow-primary/20">
                      Financial Policy <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-4">
                  <div className="grid gap-6 py-4 text-xs">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <Label className="flex items-center gap-1.5 text-primary font-black uppercase tracking-[0.2em]"><ShieldCheck className="size-4" /> Regulatory Tax PIN</Label>
                          <Input name="taxPin" defaultValue={editingCustomer?.taxPin} placeholder="e.g. P051..." className="font-mono font-bold h-10 bg-background" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5 text-emerald-500 font-bold uppercase tracking-widest"><BadgeCent className="size-4" /> Credit Trust Ceiling</Label>
                          <Input name="creditLimit" type="number" step="0.01" defaultValue={editingCustomer?.creditLimit || crmSetup?.defaultCreditLimit} className="h-12 font-black text-xl bg-secondary/10" />
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5 text-accent font-bold uppercase tracking-widest"><Coins className="size-4" /> Settlement Currency</Label>
                          <Select name="currencyId" defaultValue={editingCustomer?.currencyId || "KES"}>
                            <SelectTrigger className="h-10 font-bold uppercase"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {currencies?.map(curr => <SelectItem key={curr.id} value={curr.id} className="text-xs font-bold">{curr.id}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest"><Tag className="size-4" /> Segment</Label>
                            <Select name="segmentId" defaultValue={editingCustomer?.segmentId}>
                              <SelectTrigger className="h-10 uppercase font-bold"><SelectValue placeholder="Cluster..." /></SelectTrigger>
                              <SelectContent>
                                {segments?.map(s => <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase">{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest"><TrendingUp className="size-4" /> Strategist</Label>
                            <Select name="salesPersonId" defaultValue={editingCustomer?.assignedSalesPersonId}>
                              <SelectTrigger className="h-10 uppercase font-bold"><SelectValue placeholder="Assign..." /></SelectTrigger>
                              <SelectContent>
                                {staffMembers?.map(s => <SelectItem key={s.id} value={s.id} className="text-xs uppercase">{s.email?.split('@')[0]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="uppercase font-bold tracking-widest opacity-60">Onboarding Status</Label>
                          <Select name="status" defaultValue={editingCustomer?.status || "Pending"}>
                            <SelectTrigger className="h-10 font-bold uppercase"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending" className="text-xs font-bold uppercase text-amber-500">PENDING APPROVAL</SelectItem>
                              <SelectItem value="Active" className="text-xs font-bold uppercase text-emerald-500">ACTIVE HUB</SelectItem>
                              <SelectItem value="Lead" className="text-xs font-bold uppercase">PROSPECT LEAD</SelectItem>
                              <SelectItem value="Blocked" className="text-xs font-bold uppercase text-destructive">BLOCKED / LOCKED</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="bg-secondary/10 p-6 -mx-6 -mb-6 rounded-b-lg border-t border-border/50 gap-2">
                <div className="flex-1 flex items-center gap-2 text-[10px] text-muted-foreground opacity-50 uppercase font-black tracking-widest">
                  <Zap className="size-3 text-primary animate-pulse" /> Final verification phase
                </div>
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-10 font-bold uppercase tracking-widest">Discard</Button>
                <Button type="submit" disabled={isProcessing} className="h-10 px-10 font-bold uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2">
                  {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-4" />} {editingCustomer ? 'Update Profile' : 'Finalize Registration'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
