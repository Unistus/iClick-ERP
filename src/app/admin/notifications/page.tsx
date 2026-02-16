
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
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
    { id: 2, name: "Low Stock Alert", type: "SMS", trigger: "Inventory Drop", content: "Alert: {{productName}} is below re-order level ({{stock}} left)." },
    { id: 3, name: "Payment Receipt", type: "Email", trigger: "Sale Completion", content: "Dear {{customerName}}, Your payment of {{amount}} for INV-{{invoiceNumber}} has been received." },
    { id: 4, name: "M-Pesa STK Push", type: "Push", trigger: "Payment Initiation", content: "Pay {{amount}} to iClick ERP. Enter PIN on your phone." },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Notification Templates</h1>
            <p className="text-muted-foreground">Manage automated communication for customers and staff.</p>
          </div>
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

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 border-none ring-1 ring-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase">Template List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {templates.map(t => (
                  <button 
                    key={t.id} 
                    className={`w-full text-left p-4 hover:bg-secondary/20 transition-colors flex items-center justify-between ${activeTemplate?.id === t.id ? 'bg-secondary/40' : ''}`}
                    onClick={() => setActiveTemplate(t)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-secondary flex items-center justify-center text-primary">
                        {t.type === 'Email' ? <Mail className="size-4" /> : <MessageSquare className="size-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{t.trigger}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{t.type}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none ring-1 ring-border shadow-xl">
            {activeTemplate ? (
              <>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{activeTemplate.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Send className="size-4" /> Test
                      </Button>
                      <Button size="sm" className="gap-2">
                        <Save className="size-4" /> Save
                      </Button>
                    </div>
                  </div>
                  <CardDescription>Triggered by: {activeTemplate.trigger}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2">
                    <Label>Message Content</Label>
                    <Textarea 
                      value={activeTemplate.content} 
                      className="min-h-[200px] font-mono text-sm bg-secondary/20"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary" className="gap-1 cursor-pointer"><Variable className="size-3" /> firstName</Badge>
                      <Badge variant="secondary" className="gap-1 cursor-pointer"><Variable className="size-3" /> productName</Badge>
                      <Badge variant="secondary" className="gap-1 cursor-pointer"><Variable className="size-3" /> amount</Badge>
                      <Badge variant="secondary" className="gap-1 cursor-pointer"><Variable className="size-3" /> invoiceNumber</Badge>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                <BellRing className="size-12 opacity-10 mb-4" />
                <p>Select a template to edit its configuration.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
