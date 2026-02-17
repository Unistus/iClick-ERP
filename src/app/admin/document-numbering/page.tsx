'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, query, setDoc, serverTimestamp } from "firebase/firestore"
import { Hash, Settings2, RefreshCw, Save, Sparkles } from "lucide-react"
import { toast } from "@/hooks/use-toast"

/**
 * Registry of document types requiring sequences.
 */
const SEQUENCE_DEFINITIONS = [
  { id: "sales_invoice", title: "Sales Invoice", prefix: "INV-", nextNumber: 1001, padding: 4 },
  { id: "purchase_order", title: "Purchase Order", prefix: "PO-", nextNumber: 500, padding: 4 },
  { id: "product_sku", title: "Product SKU", prefix: "SKU-", nextNumber: 1000, padding: 5 },
  { id: "product_id", title: "Physical Product ID", prefix: "PROD-", nextNumber: 100, padding: 4 },
  { id: "service_id", title: "Service Asset ID", prefix: "SERV-", nextNumber: 100, padding: 4 },
  { id: "batch_lot_number", title: "Batch / Lot Number", prefix: "LOT-", nextNumber: 1, padding: 6 },
  { id: "warehouse_code", title: "Warehouse Site Code", prefix: "WH-", nextNumber: 1, padding: 2 },
  { id: "grn", title: "Goods Received Note", prefix: "GRN-", nextNumber: 100, padding: 4 },
  { id: "stock_transfer", title: "Stock Transfer", prefix: "TR-", nextNumber: 100, padding: 4 },
  { id: "stock_adjustment", title: "Stock Adjustment", prefix: "ADJ-", nextNumber: 100, padding: 4 },
  { id: "journal_entry", title: "Journal Entry", prefix: "JE-", nextNumber: 1000, padding: 5 },
  { id: "payment_receipt", title: "Payment Receipt", prefix: "RCP-", nextNumber: 2500, padding: 5 },
  { id: "payroll_run", title: "Payroll Run", prefix: "PAY-", nextNumber: 1, padding: 3 },
  { id: "payslip", title: "Employee Payslip", prefix: "PS-", nextNumber: 1, padding: 6 },
  { id: "prescription", title: "Medical Prescription", prefix: "RX-", nextNumber: 1000, padding: 6 },
  { id: "delivery_order", title: "Delivery Order", prefix: "DEL-", nextNumber: 100, padding: 4 },
  { id: "customer_id", title: "Customer Account", prefix: "CUST-", nextNumber: 1000, padding: 4 },
  { id: "employee_id", title: "Employee Number", prefix: "EMP-", nextNumber: 100, padding: 3 },
  { id: "approval_req", title: "Approval Request", prefix: "APR-", nextNumber: 1, padding: 4 },
];

export default function DocumentNumbering() {
  const db = useFirestore()
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
  const [initializing, setInitializing] = useState(false)

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const sequencesQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'document_sequences'))
  }, [db, selectedInstitutionId])
  
  const { data: sequences, isLoading } = useCollection(sequencesQuery)

  const formatPreview = (prefix: string | undefined, next: number | undefined, padding: number | undefined) => {
    const p = prefix || "";
    const n = next !== undefined ? next : 0;
    const pad = padding || 1;
    return `${p}${n.toString().padStart(pad, '0')}`
  }

  const handleInitialize = async () => {
    if (!selectedInstitutionId) return
    setInitializing(true)
    
    try {
      const promises = SEQUENCE_DEFINITIONS.map(def => {
        const existing = sequences?.find(s => s.id === def.id);
        if (existing) return Promise.resolve();

        const docRef = doc(db, 'institutions', selectedInstitutionId, 'document_sequences', def.id);
        return setDoc(docRef, {
          ...def,
          institutionId: selectedInstitutionId,
          isActive: true,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      await Promise.all(promises);
      toast({ title: "Sequences Initialized", description: "Standard numbering rules deployed." });
    } catch (e) {
      toast({ variant: "destructive", title: "Initialization Failed" });
    } finally {
      setInitializing(false)
    }
  }

  const handleUpdate = async (seqId: string, formData: FormData) => {
    if (!selectedInstitutionId) return;

    const data = {
      prefix: formData.get('prefix') as string,
      nextNumber: parseInt(formData.get('next') as string) || 1,
      padding: parseInt(formData.get('padding') as string) || 1,
      updatedAt: serverTimestamp()
    };

    try {
      const docRef = doc(db, 'institutions', selectedInstitutionId, 'document_sequences', seqId);
      await setDoc(docRef, data, { merge: true });
      toast({ title: "Sequence Updated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Save Failed" });
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Hash className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold">Document Numbering</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Institutional Identifier Standards</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Active Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button 
              className="inline-flex items-center justify-center gap-2 rounded-md text-xs font-medium h-9 px-3 border border-primary/20 bg-primary/5 hover:bg-primary/10 disabled:opacity-50"
              disabled={!selectedInstitutionId || initializing}
              onClick={handleInitialize}
            >
              {initializing ? <RefreshCw className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-primary" />}
              Sync Definitions
            </button>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Hash className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure document sequences.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading ? (
              <div className="col-span-full py-12 text-center text-xs opacity-50 animate-pulse uppercase font-bold tracking-widest">
                Retrieving Sequence Registry...
              </div>
            ) : (
              sequences?.map((seq) => (
                <Card key={seq.id} className="bg-card border-none ring-1 ring-border shadow-sm hover:ring-primary/30 transition-all flex flex-col">
                  <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b border-border/50 bg-secondary/5">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary truncate max-w-[150px]">
                      {seq.title}
                    </CardTitle>
                    <Settings2 className="size-3 text-muted-foreground/50" />
                  </CardHeader>
                  <CardContent className="p-4 flex-1 flex flex-col gap-4">
                    <div className="p-2.5 bg-background rounded-lg border border-primary/10 ring-4 ring-primary/5">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold text-center mb-1">Generated Preview</p>
                      <p className="text-lg font-mono font-bold text-foreground text-center tracking-wider">
                        {formatPreview(seq.prefix, seq.nextNumber, seq.padding)}
                      </p>
                    </div>

                    <form 
                      className="grid gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdate(seq.id, new FormData(e.currentTarget));
                      }}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] uppercase font-bold opacity-60">Prefix</Label>
                          <Input 
                            name="prefix" 
                            defaultValue={seq.prefix} 
                            className="h-8 text-xs font-mono bg-secondary/20 border-none ring-1 ring-border"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] uppercase font-bold opacity-60">Padding</Label>
                          <Input 
                            name="padding" 
                            type="number"
                            min="1"
                            max="10"
                            defaultValue={seq.padding} 
                            className="h-8 text-xs font-mono bg-secondary/20 border-none ring-1 ring-border"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] uppercase font-bold opacity-60">Next Incremental Number</Label>
                        <Input 
                          name="next" 
                          type="number"
                          defaultValue={seq.nextNumber} 
                          className="h-8 text-xs font-mono bg-secondary/20 border-none ring-1 ring-border"
                        />
                      </div>
                      
                      <Button type="submit" size="sm" className="w-full h-8 text-[10px] font-bold uppercase gap-2 mt-1">
                        <Save className="size-3" /> Save Sequence
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
