'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { registerCustomer, updateCustomer } from "@/lib/crm/crm.service";
import { 
  ArrowLeft, 
  UserCircle, 
  Mail, 
  Phone, 
  Hash, 
  Calendar, 
  Briefcase, 
  Globe, 
  MapPin, 
  LayoutGrid, 
  Truck, 
  Clock, 
  ShieldCheck, 
  BadgeCent, 
  Tag, 
  TrendingUp, 
  Zap, 
  Sparkles, 
  Loader2,
  CheckCircle2,
  Contact,
  Save,
  Globe2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

function ManagementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user } = useUser();
  
  const selectedInstId = searchParams.get('instId') || "";
  const editingId = searchParams.get('id');

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [selectedTownId, setSelectedTownId] = useState<string>("");

  // Data Fetching
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

  const editingCustomerRef = useMemoFirebase(() => {
    if (!selectedInstId || !editingId) return null;
    return doc(db, 'institutions', selectedInstId, 'customers', editingId);
  }, [db, selectedInstId, editingId]);
  const { data: editingCustomer, isLoading: customerLoading } = useDoc(editingCustomerRef);

  const geoQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'geo_locations');
  }, [db, selectedInstId]);
  const { data: geoNodes } = useCollection(geoQuery);

  const staffRef = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: staffMembers } = useCollection(staffRef);

  const crmSetupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'crm');
  }, [db, selectedInstId]);
  const { data: crmSetup } = useDoc(crmSetupRef);

  useEffect(() => {
    if (editingCustomer) {
      setSelectedCountryId(editingCustomer.geoCountryId || "");
      setSelectedTownId(editingCustomer.geoTownId || "");
    }
  }, [editingCustomer]);

  const countries = geoNodes?.filter(n => n.level === 'Country') || [];
  const towns = geoNodes?.filter(n => n.level === 'Town' && n.parentId === selectedCountryId) || [];
  const areas = geoNodes?.filter(n => n.level === 'Area' && n.parentId === selectedTownId) || [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    try {
      if (editingId) {
        await updateCustomer(db, selectedInstId, editingId, data);
        logSystemEvent(db, selectedInstId, user, 'CRM', 'Update Customer', `Updated profile for ${data.name}`);
        toast({ title: "Profile Updated" });
      } else {
        await registerCustomer(db, selectedInstId, data);
        logSystemEvent(db, selectedInstId, user, 'CRM', 'Register Customer', `Onboarded new customer: ${data.name}.`);
        toast({ title: "Registration Complete", description: "Customer awaiting administrative approval." });
      }
      router.push('/crm/customers');
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (customerLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* STICKY HEADER */}
      <div className="flex items-center justify-between sticky top-0 z-30 bg-background/80 backdrop-blur-md p-4 -mx-4 border-b border-border/50 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" type="button" onClick={() => router.push('/crm/customers')} className="rounded-full">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-headline font-bold">{editingId ? 'Refine Identity' : 'Register Customer'}</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Institutional Onboarding Protocol v2.4</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editingId && (
            <Badge variant="outline" className="h-10 px-4 bg-primary/5 border-primary/20 text-primary font-black uppercase tracking-widest hidden md:flex">
              {editingCustomer?.status || 'PENDING'}
            </Badge>
          )}
          <Button 
            form="customer-manage-form"
            type="submit" 
            disabled={isProcessing} 
            className="h-10 px-8 font-black uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-2 border-none ring-2 ring-primary/20 transition-all active:scale-95"
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 
            {editingId ? 'Update Master Node' : 'Commit To Registry'}
          </Button>
        </div>
      </div>

      <form id="customer-manage-form" onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: BASIC IDENTITY */}
        <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
          <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary"><UserCircle className="size-5" /></div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest">1. Basic Identity</CardTitle>
                <CardDescription className="text-[10px]">Legal identifiers and institutional segmentation.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Trading / Display Name</Label>
                <Input name="name" defaultValue={editingCustomer?.name} required className="h-11 font-bold text-base bg-secondary/5 border-none ring-1 ring-border" />
              </div>
              <div className="space-y-2">
                <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Legal Registered Name</Label>
                <Input name="legalName" defaultValue={editingCustomer?.legalName} className="h-11 font-bold bg-secondary/5 border-none ring-1 ring-border" />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 uppercase font-black text-[10px] tracking-widest opacity-60"><Hash className="size-3" /> Registration #</Label>
                <Input name="regNumber" defaultValue={editingCustomer?.registrationNumber} className="h-11 font-mono bg-secondary/5 border-none ring-1 ring-border" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 uppercase font-black text-[10px] tracking-widest opacity-60"><Calendar className="size-3" /> Reg. Date</Label>
                <Input name="regDate" type="date" defaultValue={editingCustomer?.registrationDate} className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 uppercase font-black text-[10px] tracking-widest opacity-60"><Tag className="size-3 text-primary" /> Customer Segment</Label>
                <Select name="segmentId" defaultValue={editingCustomer?.segmentId}>
                  <SelectTrigger className="h-11 font-bold uppercase bg-secondary/5 border-none ring-1 ring-border"><SelectValue placeholder="Select Segment..." /></SelectTrigger>
                  <SelectContent>
                    {segments?.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase">{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 uppercase font-black text-[10px] tracking-widest opacity-60"><Mail className="size-3" /> Corporate Email</Label>
                <Input name="email" type="email" defaultValue={editingCustomer?.email} required className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 uppercase font-black text-[10px] tracking-widest opacity-60"><Phone className="size-3" /> Primary Phone</Label>
                <Input name="phone" defaultValue={editingCustomer?.phone} required className="h-11 bg-secondary/5 border-none ring-1 ring-border" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: CONTACT PERSON */}
        <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
          <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><Contact className="size-5" /></div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-500">2. Key Contact Node</CardTitle>
                <CardDescription className="text-[10px]">Primary decision maker within the client entity.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="bg-emerald-500/5 p-6 rounded-2xl border border-dashed border-emerald-500/20 grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Decision Maker Name</Label>
                <Input name="cpName" defaultValue={editingCustomer?.contactPerson?.name} placeholder="e.g. Jane Doe" className="h-11 bg-background font-bold border-none ring-1 ring-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Designation / Role</Label>
                <Input name="cpRole" defaultValue={editingCustomer?.contactPerson?.role} placeholder="e.g. Procurement Lead" className="h-11 bg-background border-none ring-1 ring-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Direct Line</Label>
                <Input name="cpPhone" defaultValue={editingCustomer?.contactPerson?.phone} placeholder="+254..." className="h-11 bg-background border-none ring-1 ring-border" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: GEOGRAPHIC & LOGISTICS */}
        <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
          <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10 text-accent"><Truck className="size-5" /></div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-accent">3. Logistics & Fulfillment</CardTitle>
                <CardDescription className="text-[10px]">Territorial hierarchy and delivery instructions.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary font-black uppercase text-[9px] tracking-widest opacity-60"><Globe className="size-3" /> Country</Label>
                <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                  <SelectTrigger className="h-11 font-bold uppercase bg-secondary/5 border-none ring-1 ring-border"><SelectValue placeholder="Pick Country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.id} value={c.id} className="uppercase font-bold text-[10px]">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <input type="hidden" name="geoCountryId" value={selectedCountryId} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary font-black uppercase text-[9px] tracking-widest opacity-60"><MapPin className="size-3" /> Town / City</Label>
                <Select value={selectedTownId} onValueChange={setSelectedTownId} disabled={!selectedCountryId}>
                  <SelectTrigger className="h-11 font-bold uppercase bg-secondary/5 border-none ring-1 ring-border">
                    <SelectValue placeholder={selectedCountryId ? "Pick Town" : "Pick Country First"} />
                  </SelectTrigger>
                  <SelectContent>
                    {towns.map(t => <SelectItem key={t.id} value={t.id} className="uppercase font-bold text-[10px]">{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <input type="hidden" name="geoTownId" value={selectedTownId} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary font-black uppercase text-[9px] tracking-widest opacity-60"><LayoutGrid className="size-3" /> Area Node</Label>
                <Select name="geoAreaId" defaultValue={editingCustomer?.geoAreaId} disabled={!selectedTownId}>
                  <SelectTrigger className="h-11 font-bold uppercase bg-secondary/5 border-none ring-1 ring-border">
                    <SelectValue placeholder={selectedTownId ? "Pick Area" : "Pick Town First"} />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map(a => <SelectItem key={a.id} value={a.id} className="uppercase font-bold text-[10px]">{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8 pt-4 border-t border-border/50">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-accent font-black uppercase text-[9px] tracking-widest opacity-60"><Truck className="size-3" /> Physical Fulfillment Address</Label>
                <Textarea name="shippingAddress" defaultValue={editingCustomer?.shippingAddress} className="min-h-[100px] bg-secondary/5 border-none ring-1 ring-border" placeholder="Full street address, building, or warehouse node..." />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-black uppercase text-[9px] tracking-widest opacity-60"><Clock className="size-3" /> Logistics Memo</Label>
                <Textarea name="deliveryNotes" defaultValue={editingCustomer?.deliveryNotes} placeholder="Access requirements, gate instructions, preferred delivery times..." className="min-h-[100px] bg-secondary/5 border-none ring-1 ring-border" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: FINANCIALS & CRM */}
        <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
          <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><BadgeCent className="size-5" /></div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-500">4. Financial Strategy</CardTitle>
                <CardDescription className="text-[10px]">Trust limits and regulatory compliance parameters.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-2 p-6 bg-primary/5 rounded-3xl border border-primary/10 shadow-inner">
                  <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em] mb-3"><ShieldCheck className="size-4" /> Regulatory Compliance PIN</Label>
                  <Input name="taxPin" defaultValue={editingCustomer?.taxPin} className="font-mono font-black h-12 text-2xl bg-background border-none ring-1 ring-border" placeholder="P051..." />
                </div>
                
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-widest mb-1"><BadgeCent className="size-4" /> Institutional Credit Trust</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground opacity-40">KES</span>
                    <Input name="creditLimit" type="number" step="0.01" defaultValue={editingCustomer?.creditLimit} className="h-14 font-black text-3xl pl-14 bg-secondary/5 border-none ring-1 ring-border focus-visible:ring-emerald-500" />
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed italic">Defines the maximum unsecured receivable balance for this identity node.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60"><Briefcase className="size-4 text-accent" /> Profile Type</Label>
                    <Select name="typeId" defaultValue={editingCustomer?.typeId}>
                      <SelectTrigger className="h-11 uppercase font-black text-[10px] bg-secondary/5 border-none ring-1 ring-border"><SelectValue placeholder="Pick Type..." /></SelectTrigger>
                      <SelectContent>
                        {customerTypes?.map(t => <SelectItem key={t.id} value={t.id} className="text-[10px] font-black uppercase">{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60"><TrendingUp className="size-4" /> Sales Liaison</Label>
                    <Select name="salesPersonId" defaultValue={editingCustomer?.assignedSalesPersonId}>
                      <SelectTrigger className="h-11 uppercase font-black text-[10px] bg-secondary/5 border-none ring-1 ring-border"><SelectValue placeholder="Assign..." /></SelectTrigger>
                      <SelectContent>
                        {staffMembers?.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase">{s.email?.split('@')[0]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border/50">
                  <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Transition Status</Label>
                  <Select name="status" defaultValue={editingCustomer?.status || "Pending"}>
                    <SelectTrigger className="h-12 font-black uppercase text-xs border-none ring-2 ring-primary/20 bg-secondary/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending" className="text-[10px] font-black uppercase text-amber-500">AWAITING VERIFICATION</SelectItem>
                      <SelectItem value="Active" className="text-[10px] font-black uppercase text-emerald-500">AUTHORIZED HUB</SelectItem>
                      <SelectItem value="Lead" className="text-[10px] font-black uppercase text-primary">SALES PROSPECT</SelectItem>
                      <SelectItem value="Blocked" className="text-[10px] font-black uppercase text-destructive">LOCKED / TERMINATED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex gap-4 items-start shadow-inner mt-4 group hover:ring-1 hover:ring-primary/30 transition-all">
                  <Zap className="size-6 text-primary shrink-0 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Onboarding Logic</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                      "Institutional silo protection is active. This profile will only be visible to authorized staff within this legal entity node."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

export default function ManageCustomerPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>}>
        <ManagementForm />
      </Suspense>
    </DashboardLayout>
  );
}
