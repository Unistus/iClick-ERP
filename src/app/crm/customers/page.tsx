'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { archiveCustomer, approveCustomer, verifyKYC } from "@/lib/crm/crm.service";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  UserCircle, 
  Loader2, 
  MoreVertical, 
  MapPin, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Coins, 
  TrendingUp, 
  Edit2, 
  Trash2, 
  History, 
  UserCheck, 
  ShieldAlert, 
  Star,
  ChevronRight,
  RefreshCw
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { logSystemEvent } from "@/lib/audit-service";
import { cn } from "@/lib/utils";
import Link from 'next/link';

export default function CustomerDirectoryPage() {
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const segmentsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'customer_segments');
  }, [db, selectedInstId]);
  const { data: segments } = useCollection(segmentsRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const customersQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'customers'), orderBy('updatedAt', 'desc'));
  }, [db, selectedInstId]);
  const { data: customers, isLoading } = useCollection(customersQuery);

  const currency = settings?.general?.currencySymbol || "KES";

  const handleApprove = (id: string, name: string) => {
    if (!selectedInstId) return;
    approveCustomer(db, selectedInstId, id).then(() => {
      logSystemEvent(db, selectedInstId, user, 'CRM', 'Approve Customer', `Approved ${name} for Sales operations.`);
      toast({ title: "Customer Approved", description: `${name} authorized for trading.` });
    });
  };

  const handleVerifyKYC = (id: string, name: string) => {
    if (!selectedInstId) return;
    verifyKYC(db, selectedInstId, id).then(() => {
      logSystemEvent(db, selectedInstId, user, 'CRM', 'KYC Verification', `KYC identity verified for ${name}.`);
      toast({ title: "KYC Verified" });
    });
  };

  const handleDelete = (id: string) => {
    if (!selectedInstId || !confirm("Are you sure you want to archive this customer? This action is immutable.")) return;
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
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">Customer Directory</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Master Identity Hub</p>
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

            <Button 
              size="sm" 
              className="gap-2 h-9 text-xs font-bold uppercase shadow-lg shadow-primary/20 bg-primary" 
              disabled={!selectedInstId}
              onClick={() => router.push(`/crm/customers/manage?instId=${selectedInstId}`)}
            >
              <Plus className="size-4" /> New Profile
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <UserCircle className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground text-center">Select an institution to access its customer vault.</p>
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
                              <DropdownMenuItem 
                                className="text-xs gap-2" 
                                onClick={() => router.push(`/crm/customers/manage?instId=${selectedInstId}&id=${c.id}`)}
                              >
                                <Edit2 className="size-3.5 text-primary" /> Edit Identity Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-2" onClick={() => handleVerifyKYC(c.id, c.name)}>
                                <UserCheck className="size-3.5 text-emerald-500" /> Verify KYC Documents
                              </DropdownMenuItem>
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
                                <FileText className="size-3.5" /> Export Statement
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
      </div>
    </DashboardLayout>
  );
}
