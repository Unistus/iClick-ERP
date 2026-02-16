
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { BellRing, Mail, MessageSquare, Send, Save, Variable } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function NotificationTemplates() {
  const db = useFirestore()
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const [activeTemplate, setActiveTemplate] = useState<any>(null)

  const templates = [
    { id: 1, name: "Welcome Email", type: "Email", trigger: "User Registration", content: "Hi {{firstName}}, Welcome to iClick ERP!" },
    { id: 2, name: "Low Stock Alert", type: "SMS", trigger: "Inventory Drop", content: "Alert: {{productName}} is below re-order level." },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold">Notifications</h1>
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

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1 border-none ring-1 ring-border shadow">
            <CardHeader className="py-3">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {templates.map(t => (
                  <button 
                    key={t.id} 
                    className={`w-full text-left p-3 hover:bg-secondary/20 transition-colors flex items-center justify-between ${activeTemplate?.id === t.id ? 'bg-secondary/40' : ''}`}
                    onClick={() => setActiveTemplate(t)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-7 rounded bg-secondary flex items-center justify-center text-primary">
                        {t.type === 'Email' ? <Mail className="size-3.5" /> : <MessageSquare className="size-3.5" />}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold">{t.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-tighter">{t.trigger}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1">{t.type}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none ring-1 ring-border shadow-lg">
            {activeTemplate ? (
              <>
                <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">{activeTemplate.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1.5 px-2">
                      <Send className="size-3" /> Test
                    </Button>
                    <Button size="sm" className="h-8 text-[10px] gap-1.5 px-2">
                      <Save className="size-3" /> Save
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Message</Label>
                    <Textarea 
                      value={activeTemplate.content} 
                      className="min-h-[150px] font-mono text-xs bg-secondary/10 border-none ring-1 ring-border"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {['firstName', 'amount', 'invoiceNumber'].map(v => (
                        <Badge key={v} variant="secondary" className="text-[8px] h-4 gap-1 px-1.5 cursor-pointer opacity-70 hover:opacity-100">
                          <Variable className="size-2.5" /> {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16">
                <BellRing className="size-10 opacity-10 mb-2" />
                <p className="text-xs">Select a template to configure.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
