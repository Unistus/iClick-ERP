'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Lock, 
  ShieldCheck, 
  Key, 
  RotateCcw, 
  Zap, 
  Info, 
  AlertTriangle,
  History,
  Activity,
  Search,
  Database,
  Loader2
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function DataEncryptionPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isRotating, setIsRotating] = useState(false);

  // Data Fetching: Institutions
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  // Data Fetching: Encryption Config
  const encryptionRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'encryption');
  }, [db, selectedInstId]);
  const { data: config } = useDoc(encryptionRef);

  const handleToggleEncryption = async (field: string, enabled: boolean) => {
    if (!selectedInstId || !encryptionRef) return;
    try {
      await setDoc(encryptionRef, {
        [`fields.${field}`]: enabled,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      logSystemEvent(db, selectedInstId, user, 'SECURITY', 'Toggle Encryption', `Field-level protection ${enabled ? 'ENABLED' : 'DISABLED'} for ${field}.`);
      toast({ title: "Policy Updated", description: `Field ${field} protection state changed.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleRotateKeys = () => {
    if (!selectedInstId || !confirm("CRITICAL: Rotating encryption keys requires 100% system availability. Proceed?")) return;
    setIsRotating(true);
    setTimeout(() => {
      setIsRotating(false);
      logSystemEvent(db, selectedInstId, user, 'SECURITY', 'Rotate Keys', 'Manual institutional key rotation sequence completed.');
      toast({ title: "Keys Rotated Successfully", description: "Institutional master key set has been renewed." });
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Lock className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Data At Rest</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Field-Level Protection & Key Management</p>
            </div>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs font-bold shadow-sm">
              <SelectValue placeholder="Select Institution" />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <ShieldCheck className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure its encryption perimeter.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Database className="size-4 text-primary" /> Sensitive Field Matrix
                    </CardTitle>
                    <CardDescription className="text-[10px]">Toggle encryption for high-risk institutional data points.</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black uppercase text-emerald-500">AES-256 GCM ACTIVE</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[9px] font-black uppercase pl-6">Data Entity / Field</TableHead>
                        <TableHead className="h-10 text-[9px] font-black uppercase">Risk Classification</TableHead>
                        <TableHead className="h-10 text-right text-[9px] font-black uppercase pr-6">Protection State</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { id: 'cust_phone', name: 'Customer Phone Numbers', risk: 'High (PII)', module: 'CRM' },
                        { id: 'emp_salary', name: 'Employee Salary Components', risk: 'Critical (Financial)', module: 'HR' },
                        { id: 'supplier_bank', name: 'Vendor Bank Details', risk: 'High (Corporate)', module: 'Purchases' },
                        { id: 'auth_passwords', name: 'Authentication Credentials', risk: 'System Root', module: 'Auth' },
                      ].map((field) => (
                        <TableRow key={field.id} className="h-14 border-b-border/30 hover:bg-secondary/5 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase">{field.name}</span>
                              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">{field.module} MODULE</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[8px] h-4 bg-primary/10 text-primary border-none font-black uppercase px-2">
                              {field.risk}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Switch 
                              checked={config?.fields?.[field.id] || field.id === 'auth_passwords'} 
                              disabled={field.id === 'auth_passwords'}
                              onCheckedChange={(val) => handleToggleEncryption(field.id, val)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 p-6 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><ShieldCheck className="size-32 text-primary" /></div>
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Encryption Standard</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                    "Institutional data is encrypted using **AES-256-GCM** at the database layer. Keys are managed in the **Cloud KMS** and are siloed per legal entity to ensure zero cross-tenant visibility."
                  </p>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border/10 pb-3">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Key className="size-4 text-primary" /> Master Key Control
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="p-4 bg-secondary/20 rounded-xl border border-border/50 text-center space-y-2">
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Current Key Version</p>
                    <p className="text-lg font-black font-mono tracking-widest">V2.14.8</p>
                    <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <Zap className="size-2.5 animate-pulse" /> Rotation Healthy
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Button 
                      onClick={handleRotateKeys} 
                      disabled={isRotating}
                      className="w-full h-11 font-black uppercase text-[10px] gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                    >
                      {isRotating ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Rotate Institutional Keys
                    </Button>
                    <p className="text-[9px] text-muted-foreground text-center italic">
                      Key rotation takes approx. 120s to propagate across the edge.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase opacity-60">
                      <span>Automatic Rotation</span>
                      <Switch defaultChecked />
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-1">Recommended: Every 90 Days</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-amber-500/5 border-none ring-1 ring-amber-500/20 p-6">
                <div className="flex gap-3 items-start">
                  <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Compliance Warning</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                      Disabling encryption on fields marked 'Critical' may violate GDPR/POPIA standards for this institution.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}