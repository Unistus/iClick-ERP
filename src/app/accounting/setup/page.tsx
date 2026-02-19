'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Settings, Save, Loader2, Info, ArrowRightLeft, HeartHandshake } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logSystemEvent } from "@/lib/audit-service";

export default function AccountingSetupPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db]);
  const { data: institutions } = useCollection(instColRef);

  const setupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'accounting');
  }, [db, selectedInstId]);

  const { data: setup } = useDoc(setupRef);

  const crmSetupRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return doc(db, 'institutions', selectedInstId, 'settings', 'crm');
  }, [db, selectedInstId]);
  const { data: crmSetup } = useDoc(crmSetupRef);

  const coaRef = useMemoFirebase(() => {
    if (!selectedInstId) return null;
    return collection(db, 'institutions', selectedInstId, 'coa');
  }, [db, selectedInstId]);

  const { data: accounts } = useCollection(coaRef);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId || !setupRef) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates: any = {};
    formData.forEach((value, key) => updates[key] = value);

    try {
      await setDoc(setupRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSystemEvent(db, selectedInstId, user, 'ACCOUNTING', 'Update Setup', 'Account mappings were updated.');
      toast({ title: "Setup Saved", description: "System events will now auto-post to these accounts." });
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const AccountSelect = ({ name, label, description, typeFilter }: { name: string, label: string, description: string, typeFilter?: string[] }) => (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
        {label} <Info className="size-3 opacity-30" />
      </Label>
      <p className="text-[10px] text-muted-foreground leading-none mb-2">{description}</p>
      <Select name={name} defaultValue={setup?.[name]}>
        <SelectTrigger className="h-9 text-xs bg-secondary/10 border-none ring-1 ring-border">
          <SelectValue placeholder="Select Ledger Account" />
        </SelectTrigger>
        <SelectContent>
          {accounts?.filter(acc => !typeFilter || typeFilter.includes(acc.type) || typeFilter.includes(acc.subtype)).map(acc => (
            <SelectItem key={acc.id} value={acc.id} className="text-xs">
              [{acc.code}] {acc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <ArrowRightLeft className="size-5" />
            </div>
            <h1 className="text-2xl font-headline font-bold">Financial Automation</h1>
          </div>
          
          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-9 bg-card border-none ring-1 ring-border text-xs">
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
            <Settings className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure its automation engine.</p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-6">
                <Card className="border-none ring-1 ring-border shadow-2xl bg-card">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="text-lg">Event Mapping</CardTitle>
                    <CardDescription>Link operational system events to specific Chart of Accounts nodes.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <div className="space-y-6">
                      <h3 className="text-xs font-bold text-primary uppercase border-b pb-2">Revenue & Assets</h3>
                      <AccountSelect 
                        name="salesRevenueAccountId" 
                        label="Sales Revenue" 
                        description="Standard income account for POS and invoice sales."
                      />
                      <AccountSelect 
                        name="accountsReceivableAccountId" 
                        label="Accounts Receivable" 
                        description="Asset account for credit sales and pending client payments."
                      />
                      <AccountSelect 
                        name="inventoryAssetAccountId" 
                        label="Inventory Asset" 
                        description="Primary asset account tracking stock value."
                      />
                      <AccountSelect 
                        name="openingBalanceEquityAccountId" 
                        label="Opening Balance Equity" 
                        description="Equity account used to offset initial account balances."
                        typeFilter={['Equity', 'Opening Balance Equity']}
                      />
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xs font-bold text-accent uppercase border-b pb-2">Expenses & Liabilities</h3>
                      <AccountSelect 
                        name="accountsPayableAccountId" 
                        label="Accounts Payable" 
                        description="Liability account for vendor credit and bills."
                      />
                      <AccountSelect 
                        name="vatPayableAccountId" 
                        label="VAT Payable" 
                        description="Liability account for collected taxes owed to KRA."
                      />
                      <AccountSelect 
                        name="salariesPayableAccountId" 
                        label="Salaries Payable" 
                        description="Liability for accrued wages or payroll-recoverable claims."
                        typeFilter={['Liability']}
                      />
                      <AccountSelect 
                        name="cashOnHandAccountId" 
                        label="Cash on Hand" 
                        description="Asset account for physical branch till collections."
                      />
                      <AccountSelect 
                        name="accumulatedDepreciationAccountId" 
                        label="Accumulated Depreciation" 
                        description="Contra-asset account tracking total value loss."
                        typeFilter={['Asset', 'Accumulated Depreciation']}
                      />
                      <AccountSelect 
                        name="depreciationExpenseAccountId" 
                        label="Depreciation Expense" 
                        description="Profit & Loss account for periodic asset write-offs."
                        typeFilter={['Expense']}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border shadow-xl bg-card">
                  <CardHeader className="border-b border-border/50 bg-secondary/10">
                    <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                      <HeartHandshake className="size-4 text-primary" /> CRM Financial Mappings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-8 md:grid-cols-2">
                    <div className="space-y-6">
                      <h3 className="text-xs font-bold text-primary uppercase border-b pb-2">Stored Value & Loyalty</h3>
                      <div className="p-3 border rounded-lg bg-secondary/5 space-y-2">
                        <p className="text-[10px] font-bold uppercase opacity-50">Current Mappings</p>
                        <div className="flex justify-between text-[11px]">
                          <span>Wallet Liability:</span>
                          <span className="font-bold text-primary">[{accounts?.find(a => a.id === crmSetup?.walletAccountId)?.code}]</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span>Gift Card Liability:</span>
                          <span className="font-bold text-primary">[{accounts?.find(a => a.id === crmSetup?.giftCardAccountId)?.code}]</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-xs font-bold text-accent uppercase border-b pb-2">Marketing & Yield</h3>
                      <div className="p-3 border rounded-lg bg-secondary/5 space-y-2">
                        <p className="text-[10px] font-bold uppercase opacity-50">Current Mappings</p>
                        <div className="flex justify-between text-[11px]">
                          <span>Discount Node:</span>
                          <span className="font-bold text-accent">[{accounts?.find(a => a.id === crmSetup?.discountAccountId)?.code}]</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span>Campaign Node:</span>
                          <span className="font-bold text-accent">[{accounts?.find(a => a.id === crmSetup?.marketingAccountId)?.code}]</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none ring-1 ring-border shadow bg-secondary/5 h-fit">
                  <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest">Automation Engine</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-[11px] leading-relaxed opacity-70">
                      Events mapped here will trigger real-time Journal Entries in the double-entry ledger. Ensure account codes are verified by your audit team.
                    </p>
                    <Button type="submit" disabled={isSaving} className="w-full gap-2 h-10 font-bold uppercase text-[10px]">
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Commit All Mappings
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
