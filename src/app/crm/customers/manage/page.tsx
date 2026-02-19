'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { registerCustomer, updateCustomer } from "@/lib/crm/crm.service";
import { 
  ArrowLeft, 
  ArrowRight, 
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
  ChevronLeft
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

const TABS = ["basic", "contact", "logistics", "financial"];

function ManagementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user } = useUser();
  
  const selectedInstId = searchParams.get('instId') || "";
  const editingId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState("basic");
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

  const handleNext = () => {
    const currentIndex = TABS.indexOf(activeTab);
    if (currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const currentIndex = TABS.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1]);
    }
  };

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

  const isLastTab = activeTab === "financial";
  const isFirstTab = activeTab === "basic";

  if (customerLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" type="button" onClick={() => router.push('/crm/customers')}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">{editingId ? 'Refine Identity' : 'Register Customer'}</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Institutional Onboarding Protocol v2.4</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 px-4 bg-primary/5 border-primary/20 text-primary font-black uppercase tracking-widest">
            {editingCustomer?.status || 'PENDING APPROVAL'}
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-secondary/20 h-14 p-1 w-full justify-start rounded-none border-b border-border/50 gap-1 bg-transparent">
              <TabsTrigger value="basic" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <UserCircle className="size-4" /> <span className="hidden md:inline uppercase font-black text-[10px] tracking-widest">1. Identity</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <Contact className="size-4" /> <span className="hidden md:inline uppercase font-black text-[10px] tracking-widest">2. Contacts</span>
              </TabsTrigger>
              <TabsTrigger value="logistics" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <Truck className="size-4" /> <span className="hidden md:inline uppercase font-black text-[10px] tracking-widest">3. Logistics</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 gap-2">
                <ShieldCheck className="size-4" /> <span className="hidden md:inline uppercase font-black text-[10px] tracking-widest">4. Strategy</span>
              </TabsTrigger>
            </TabsList>

            <div className="p-8 min-h-[450px]">
              <TabsContent value="basic" className="space-y-6 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Trading / Display Name</Label>
                    <Input name="name" defaultValue={editingCustomer?.name} required className="h-12 font-bold text-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Legal Registered Name</Label>
                    <Input name="legalName" defaultValue={editingCustomer?.legalName} className="h-12 font-bold" />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 uppercase font-black text-[10px] tracking-widest opacity-60"><Hash className="size-3" /> Registration #</Label>
                    <Input name="regNumber" defaultValue={editingCustomer?.registrationNumber} className="h-11 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 uppercase font-black text-[10px] tracking-widest opacity-60"><Calendar className="size-3" /> Reg. Date</Label>
                    <Input name="regDate" type="date" defaultValue={editingCustomer?.registrationDate} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 uppercase font-black text-[10px] tracking-widest opacity-60"><Briefcase className="size-3" /> Profile Type</Label>
                    <Select name="typeId" defaultValue={editingCustomer?.typeId}>
                      <SelectTrigger className="h-11 font-bold uppercase"><SelectValue placeholder="Pick Type..." /></SelectTrigger>
                      <SelectContent>
                        {customerTypes?.map(t => <SelectItem key={t.id} value={t.id} className="text-[10px] font-black uppercase">{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 uppercase font-black text-[10px] tracking-widest opacity-60"><Mail className="size-3" /> Corporate Email</Label>
                    <Input name="email" type="email" defaultValue={editingCustomer?.email} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 uppercase font-black text-[10px] tracking-widest opacity-60"><Phone className="size-3" /> Primary Phone</Label>
                    <Input name="phone" defaultValue={editingCustomer?.phone} required className="h-11" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-6 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="bg-secondary/5 p-8 rounded-3xl border border-dashed border-border/50 space-y-6">
                  <div className="space-y-2">
                    <Label className="uppercase font-black text-primary tracking-widest flex items-center gap-2 mb-4">
                      <Contact className="size-5" /> Decision Maker Identification
                    </Label>
                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <Label>Full Identity Name</Label>
                        <Input name="cpName" defaultValue={editingCustomer?.contactPerson?.name} placeholder="e.g. Jane Doe" className="h-12 bg-background font-bold" />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Designation / Role</Label>
                          <Input name="cpRole" defaultValue={editingCustomer?.contactPerson?.role} placeholder="e.g. Chief Procurement Officer" className="h-11 bg-background" />
                        </div>
                        <div className="space-y-2">
                          <Label>Direct Secure Line</Label>
                          <Input name="cpPhone" defaultValue={editingCustomer?.contactPerson?.phone} placeholder="+254..." className="h-11 bg-background" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="logistics" className="space-y-6 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60"><Globe className="size-3" /> Country</Label>
                    <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                      <SelectTrigger className="h-11 font-bold uppercase"><SelectValue placeholder="Pick Country" /></SelectTrigger>
                      <SelectContent>
                        {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="geoCountryId" value={selectedCountryId} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60"><MapPin className="size-3" /> Town / City</Label>
                    <Select value={selectedTownId} onValueChange={setSelectedTownId} disabled={!selectedCountryId}>
                      <SelectTrigger className="h-11 font-bold uppercase"><SelectValue placeholder="Pick Town" /></SelectTrigger>
                      <SelectContent>
                        {towns.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="geoTownId" value={selectedTownId} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60"><LayoutGrid className="size-3" /> Area Node</Label>
                    <Select name="geoAreaId" defaultValue={editingCustomer?.geoAreaId} disabled={!selectedTownId}>
                      <SelectTrigger className="h-11 font-bold uppercase"><SelectValue placeholder="Pick Area" /></SelectTrigger>
                      <SelectContent>
                        {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6 border-t pt-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-accent font-black uppercase text-[10px] tracking-widest opacity-60"><Truck className="size-3" /> Physical Fulfillment Address</Label>
                    <Textarea name="shippingAddress" defaultValue={editingCustomer?.shippingAddress} className="min-h-[120px] bg-secondary/5" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-60"><Clock className="size-3" /> Logistics Memo</Label>
                    <Textarea name="deliveryNotes" defaultValue={editingCustomer?.deliveryNotes} placeholder="Access requirements, gate instructions..." className="min-h-[120px] bg-secondary/5" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-8 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-2 p-6 bg-primary/5 rounded-3xl border border-primary/10">
                      <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em] mb-2"><ShieldCheck className="size-4" /> Regulatory Compliance PIN</Label>
                      <Input name="taxPin" defaultValue={editingCustomer?.taxPin} className="font-mono font-black h-12 text-xl bg-background" placeholder="P051..." />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-widest mb-2"><BadgeCent className="size-4" /> Institutional Credit Trust</Label>
                      <Input name="creditLimit" type="number" step="0.01" defaultValue={editingCustomer?.creditLimit} className="h-14 font-black text-2xl bg-secondary/5" />
                      <p className="text-[9px] text-muted-foreground italic font-medium">Defines the maximum unsecured receivable balance for this identity.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest"><Tag className="size-4" /> Segmentation</Label>
                        <Select name="segmentId" defaultValue={editingCustomer?.segmentId}>
                          <SelectTrigger className="h-11 uppercase font-black text-[10px]"><SelectValue placeholder="Cluster..." /></SelectTrigger>
                          <SelectContent>
                            {segments?.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase">{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest"><TrendingUp className="size-4" /> Sales Liaison</Label>
                        <Select name="salesPersonId" defaultValue={editingCustomer?.assignedSalesPersonId}>
                          <SelectTrigger className="h-11 uppercase font-black text-[10px]"><SelectValue placeholder="Assign..." /></SelectTrigger>
                          <SelectContent>
                            {staffMembers?.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase">{s.email?.split('@')[0]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {editingId && (
                      <div className="space-y-2 pt-4 border-t">
                        <Label className="uppercase font-black text-[10px] tracking-widest opacity-60">Transition Status</Label>
                        <Select name="status" defaultValue={editingCustomer?.status}>
                          <SelectTrigger className="h-11 font-black uppercase text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending" className="text-[10px] font-black uppercase text-amber-500">AWAITING VERIFICATION</SelectItem>
                            <SelectItem value="Active" className="text-[10px] font-black uppercase text-emerald-500">AUTHORIZED HUB</SelectItem>
                            <SelectItem value="Blocked" className="text-[10px] font-black uppercase text-destructive">LOCKED / TERMINATED</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="p-6 bg-secondary/10 rounded-3xl border flex gap-4 items-start shadow-inner mt-4">
                      <Zap className="size-6 text-primary shrink-0 animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Onboarding Logic</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground italic font-medium">
                          "Institutional silo protection is active. This profile will only be visible to staff within this legal entity node."
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <CardFooter className="p-8 bg-secondary/10 border-t border-border/50 flex flex-col md:flex-row justify-between gap-6">
            <div className="flex items-center gap-3">
              {!isFirstTab && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePrevious}
                  className="h-12 px-8 font-black uppercase text-xs tracking-widest"
                >
                  <ChevronLeft className="size-4 mr-2" /> Back
                </Button>
              )}
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => router.push('/crm/customers')}
                className="h-12 px-8 font-black uppercase text-xs tracking-widest opacity-40 hover:opacity-100"
              >
                Discard
              </Button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {!isLastTab ? (
                <Button 
                  type="button" 
                  onClick={handleNext}
                  className="w-full md:w-auto h-12 px-12 font-black uppercase text-xs shadow-2xl bg-primary hover:bg-primary/90 gap-3"
                >
                  Next Stage <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isProcessing} 
                  className="w-full md:w-auto h-12 px-12 font-black uppercase text-xs shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 gap-3 border-none ring-2 ring-primary/20"
                >
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} 
                  {editingId ? 'Update Global Profile' : 'Commit Registration'}
                </Button>
              )}
            </div>
          </CardFooter>
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
