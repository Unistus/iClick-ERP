
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  History, 
  Star, 
  Trash2, 
  Edit2, 
  RefreshCw,
  LayoutGrid,
  ShieldCheck,
  Building,
  UserCog,
  LogOut,
  FileText,
  BadgeCent,
  Activity,
  CheckCircle2,
  CalendarDays,
  UserCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";
import { cn } from "@/lib/utils";

export default function EmployeeDirectoryPage() {
  const db = useFirestore();
  const router = useRouter();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const employeesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'employees'), orderBy('lastName', 'asc'));
  }, [db, selectedInstId]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const branchesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'branches');
  }, [db, selectedInstId]);
  const { data: branches } = useCollection(branchesRef);

  const filteredEmployees = employees?.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
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
              <h1 className="text-2xl font-headline font-bold">Staff Directory</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Master Workforce Ledger</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
                <SelectValue placeholder={instLoading ? "Validating..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              size="sm" 
              className="gap-2 h-9 text-xs font-bold uppercase shadow-lg bg-primary hover:bg-primary/90" 
              disabled={!selectedInstId}
              onClick={() => router.push(`/hr/employees/manage?instId=${selectedInstId}`)}
            >
              <UserPlus className="size-4" /> Register Staff
            </Button>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <UserCircle className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to view the workforce roster.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase opacity-50 tracking-widest">Headcount</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-primary">{filteredEmployees.length} ACTIVE</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase opacity-50 tracking-widest">Onboarding</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-accent">{filteredEmployees.filter(e => e.status === 'Onboarding').length} STAFF</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase opacity-50 tracking-widest">Payroll Ready</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xl font-black font-headline text-emerald-500">100%</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10"><ShieldCheck className="size-24" /></div>
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase tracking-widest">Identity Sync</span></CardHeader>
                <CardContent className="pb-4"><div className="text-xl font-black font-headline">LOCKED</div></CardContent>
              </Card>
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search name, ID or title..." 
                    className="pl-9 h-8 text-[10px] bg-secondary/20 border-none" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase text-primary border-primary/20 bg-primary/5 h-7 px-3">
                    {filteredEmployees.length} Master Records
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[10px] uppercase font-black pl-6">Employee Identity</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black text-center">Status</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Role / Title</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Branch Node</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-black">Contact Node</TableHead>
                      <TableHead className="h-10 text-right text-[10px] uppercase font-black pr-6">Command</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Polling Roster Hub...</TableCell></TableRow>
                    ) : filteredEmployees.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-20 text-xs text-muted-foreground uppercase font-bold">Workforce directory is empty.</TableCell></TableRow>
                    ) : filteredEmployees.map((emp) => (
                      <TableRow key={emp.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded bg-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase shadow-sm">
                              {emp.firstName[0]}{emp.lastName[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{emp.firstName} {emp.lastName}</span>
                              <span className="text-[9px] text-muted-foreground font-mono font-bold tracking-widest">{emp.employeeId}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-4 uppercase font-black border-none",
                            emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 
                            emp.status === 'Onboarding' ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 
                            'bg-secondary text-muted-foreground'
                          )}>
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-primary font-bold text-[9px] uppercase tracking-tighter">
                            <Briefcase className="size-3 opacity-50" /> {emp.jobTitle}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[9px] uppercase">
                            <Building className="size-3 opacity-30" /> {branches?.find(b => b.id === emp.branchId)?.name || '...'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground opacity-70"><Mail className="size-2.5" /> {emp.email}</div>
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground opacity-70"><Phone className="size-2.5" /> {emp.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-all">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60 shadow-2xl ring-1 ring-border">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Master Workforce Control</DropdownMenuLabel>
                              <DropdownMenuItem className="text-xs gap-3 font-bold" onClick={() => router.push(`/hr/employees/manage?instId=${selectedInstId}&id=${emp.id}`)}>
                                <Edit2 className="size-3.5 text-primary" /> Refine Identity Node
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-3 font-bold">
                                <UserCog className="size-3.5 text-accent" /> Personnel Self-Service Portal
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-3 font-bold">
                                <FileText className="size-3.5 text-emerald-500" /> Document Vault (KYC/Contracts)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs gap-3 font-bold">
                                <CalendarDays className="size-3.5" /> Leave & Absence Matrix
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-3 font-bold">
                                <BadgeCent className="size-3.5" /> Payroll Structure & History
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-3 font-bold">
                                <Activity className="size-3.5" /> Performance Scorecard
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs gap-3 font-bold text-amber-500">
                                <LogOut className="size-3.5" /> Exit Management (Clearance)
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-3 font-bold text-destructive">
                                <Trash2 className="size-3.5" /> Terminate Contract Node
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
