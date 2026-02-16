
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Hash, Plus, Edit2, Settings2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function DocumentNumbering() {
  const db = useFirestore()
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const configQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'doc_numbering'))
  }, [db, selectedInstitutionId])
  
  const { data: configs, isLoading } = useCollection(configQuery)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Document Numbering</h1>
            <p className="text-muted-foreground">Configure auto-incrementing sequences for invoices, POs, and receipts.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[200px] h-11 bg-card border-none ring-1 ring-border">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-secondary/10">
            <Hash className="size-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium">Select an institution to configure numbering sequences.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { type: "Sales Invoice", prefix: "INV-", next: "1001", color: "border-primary" },
              { type: "Purchase Order", prefix: "PO-", next: "500", color: "border-accent" },
              { type: "Payment Receipt", prefix: "RCP-", next: "2500", color: "border-emerald-500" },
              { type: "Stock Transfer", prefix: "TRF-", next: "100", color: "border-blue-500" },
              { type: "Credit Note", prefix: "CRN-", next: "50", color: "border-destructive" },
            ].map((cfg) => (
              <Card key={cfg.type} className={`bg-card border-l-4 ${cfg.color} shadow-lg`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{cfg.type}</CardTitle>
                    <Button variant="ghost" size="icon" className="size-8"><Settings2 className="size-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-muted-foreground">Prefix</p>
                      <p className="text-lg font-mono font-bold">{cfg.prefix}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Next Value</p>
                      <p className="text-lg font-mono font-bold">{cfg.next}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/20 rounded-lg">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold">Preview</p>
                    <p className="text-sm font-mono font-bold tracking-widest text-primary">{cfg.prefix}{cfg.next}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
