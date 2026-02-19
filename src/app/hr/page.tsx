'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, 
  Clock, 
  CalendarCheck, 
  TrendingUp, 
  ShieldAlert, 
  UserPlus, 
  Zap, 
  Activity,
  ArrowUpRight,
  Sparkles,
  LayoutGrid,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import Link from 'next/link';
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions";

export default function HRDashboardPage() {
  const db = useFirestore();
  const [selectedInstId, setSelectedInstId] = useState<string>("");

  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const employeesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return query(collection(db, 'institutions', selectedInstId, 'employees'), orderBy('createdAt', 'desc'), limit(5));
  }, [db, selectedInstId]);
  const { data: recentStaff } = useCollection(employeesQuery);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-inner">
              <Users className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">Talent Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Institutional HR & Payroll Governance</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstId} onValueChange={setSelectedInstId}>
              <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold">
                <SelectValue placeholder={instLoading ? "Validating Access..." : "Select Institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/hr/employees/manage">
              <Button size="sm" className="gap-2 h-10 text-xs font-bold uppercase shadow-lg bg-primary" disabled={!selectedInstId}>
                <UserPlus className="size-4" /> Onboard Staff
              </Button>
            </Link>
          </div>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Users className="size-16 text-muted-foreground opacity-10 mb-4 animate-pulse" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize the HR command center.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Headcount</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">{recentStaff?.length || 0} ACTIVE</div>
                  <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Institutional Workforce</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-accent tracking-widest">Attendance</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-accent">94%</div>
                  <div className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Live Shift Pulse</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none ring-1 ring-border shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Payroll Cycle</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-emerald-500">OPEN</div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Next Run: 28th Prox.</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-sm">
                <CardHeader className="pb-1 pt-3"><span className="text-[9px] font-black uppercase text-primary tracking-widest">Staff Loyalty</span></CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-black font-headline text-primary">8.4 / 10</div>
                  <div className="flex items-center gap-1.5 mt-1 text-primary font-bold text-[9px] uppercase">
                    <TrendingUp className="size-3" /> Talent Retention
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Workforce Registry</CardTitle>
                    <CardDescription className="text-[10px]">Recent additions to the institutional staff ledger.</CardDescription>
                  </div>
                  <Link href="/hr/employees">
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase gap-1">Full Directory <ArrowUpRight className="size-3" /></Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/10">
                    {recentStaff?.length === 0 ? (
                      <div className="p-12 text-center text-xs text-muted-foreground uppercase font-bold">No employees registered.</div>
                    ) : recentStaff?.map((emp) => (
                      <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-secondary/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 font-bold text-xs uppercase`}>
                            {(emp.firstName?.[0] || '?')}{(emp.lastName?.[0] || '?')}
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase">{emp.firstName || ''} {emp.lastName || ''}</p>
                            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">{emp.jobTitle} • {emp.employeeId}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={`text-[8px] h-4 uppercase font-black bg-emerald-500/10 text-emerald-500 border-none`}>
                            {emp.status}
                          </Badge>
                          <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold">Hire: {emp.hireDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/10 bg-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Zap className="size-4 text-primary" /> Operational Pulse
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <Link href="/hr/attendance" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2"><Clock className="size-4 text-accent" /> Time Tracking</span>
                        <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                    <Link href="/hr/leave" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2"><CalendarCheck className="size-4 text-emerald-500" /> Absence Hub</span>
                        <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                    <Link href="/hr/disciplinary" className="block">
                      <Button variant="outline" className="w-full justify-between h-11 text-[10px] font-bold uppercase bg-secondary/10 hover:bg-secondary/20 border-none ring-1 ring-border group">
                        <span className="flex items-center gap-2"><ShieldAlert className="size-4 text-destructive" /> Compliance Log</span>
                        <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><LayoutGrid className="size-24 text-primary" /></div>
                  <div className="flex flex-col gap-3 relative z-10">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">HR Strategy</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                      "Talent data is strictly siloed per legal entity. Identity verification is required for all staff access."
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
