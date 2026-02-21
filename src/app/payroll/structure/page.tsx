'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  History, 
  MoreVertical, 
  Loader2, 
  BadgeCent, 
  HandCoins, 
  ShieldCheck, 
  Zap,
  TrendingUp,
  Edit2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function SalaryStructurePage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  // Data Fetching: Employees & Pay Grades
  const employeesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'employees'), orderBy('lastName', 'asc'));
  }, [db, selectedInstId]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const payGradesRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'pay_grades');
  }, [db, selectedInstId]);
  const { data: payGrades } = useCollection(payGradesRef);

  const settingsRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'global');
  }, [db, selectedInstId]);
  const { data: settings } = useDoc(settingsRef);

  const currency = settings?.general?.currencySymbol || "KES";

  const filteredEmployees = employees?.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary shadow-inner border border-primary/10">
              <Layers className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Salary Structures</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Staff Remuneration Matrix</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder={instLoading ? "Authorizing..." : "Select Institution"} />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <BadgeCent className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground text-center px-6">Select an institution to manage staff salary structures.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find personnel profile..." 
                  className="pl-9 h-10 text-[10px] bg-card border-none ring-1 ring-border font-bold uppercase tracking-tight" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/20 bg-primary/5 h-8 px-4">
                {filteredEmployees.length} Master Nodes Detected
              </Badge>
            </div>

            <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
              <CardHeader className="py-3 px-6 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Remuneration Ledger</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[8px] bg-emerald-500/10 text-emerald-500 font-black px-2">Compliance Phase: ACTIVE</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Staff Member</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Official Title</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase">Pay Grade</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-right">Base Salary</TableHead>
                      <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Structure Cmd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs animate-pulse uppercase font-black tracking-widest opacity-50">Polling Roster...</TableCell></TableRow>
                    ) : filteredEmployees.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-24 text-xs text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No matching personnel nodes.</TableCell></TableRow>
                    ) : filteredEmployees.map((emp) => (
                      <TableRow key={emp.id} className="h-16 hover:bg-secondary/10 transition-colors border-b-border/30 group">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase shadow-sm">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{emp.firstName} {emp.lastName}</span>
                              <span className="text-[9px] text-muted-foreground font-mono font-bold tracking-widest opacity-60">ID: {emp.employeeId}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-bold uppercase text-primary/70">{emp.jobTitle}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] h-4 font-black uppercase border-primary/20 bg-primary/5 text-primary">
                            {payGrades?.find(g => g.id === emp.payGradeId)?.name || 'NO GRADE'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-foreground/80">
                          {currency} {emp.salary?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary">
                            <Edit2 className="size-3" /> Refine Structure
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><ShieldCheck className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Remuneration Guard</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Salary structures are anchored to the institutional **Chart of Accounts**. Base salaries and recurring allowances are mapped to specific expense nodes, ensuring zero-latency budgeting sync."
                  </p>
                </div>
              </Card>
              <div className="p-6 bg-secondary/10 rounded-2xl border border-border/50 flex items-center justify-between group cursor-default">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="size-3 text-emerald-500" /> Incentive Integration
                  </p>
                  <p className="text-[11px] font-bold leading-tight">Sales commissions and attendance bonuses are automatically layered onto these base structures.</p>
                </div>
                <Zap className="size-8 text-primary opacity-10 group-hover:opacity-100 transition-all duration-700" />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}