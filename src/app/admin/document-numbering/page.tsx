
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { Hash, Settings2 } from "lucide-react"

export default function DocumentNumbering() {
  const db = useFirestore()
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold">Document Numbering</h1>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[180px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Hash className="size-10 text-muted-foreground opacity-20 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Select institution to configure sequences.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { type: "Sales Invoice", prefix: "INV-", next: "1001", color: "border-primary" },
              { type: "Purchase Order", prefix: "PO-", next: "500", color: "border-accent" },
              { type: "Payment Receipt", prefix: "RCP-", next: "2500", color: "border-emerald-500" },
            ].map((cfg) => (
              <Card key={cfg.type} className={`bg-card border-l-2 ${cfg.color} shadow`}>
                <CardHeader className="py-2.5 px-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{cfg.type}</CardTitle>
                    <Button variant="ghost" size="icon" className="size-6"><Settings2 className="size-3.5" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Prefix</p>
                      <p className="text-sm font-mono font-bold">{cfg.prefix}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Next</p>
                      <p className="text-sm font-mono font-bold">{cfg.next}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-secondary/20 rounded">
                    <p className="text-xs font-mono font-bold tracking-widest text-primary text-center">{cfg.prefix}{cfg.next}</p>
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
