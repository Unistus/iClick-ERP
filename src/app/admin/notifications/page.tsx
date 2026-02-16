
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, query, setDoc, serverTimestamp } from "firebase/firestore"
import { 
  BellRing, 
  Mail, 
  MessageSquare, 
  Send, 
  Save, 
  Variable, 
  RefreshCw, 
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Zap
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from '@/hooks/use-toast';
import { sendTransactionalEmail } from '@/lib/email-service';

/**
 * Registry of standard notification templates across the ERP.
 */
const TEMPLATE_REGISTRY = [
  // POS & SALES
  { id: "pos_receipt_email", channel: "Email", name: "Sale Receipt", trigger: "Sale Completed", tags: ["customerName", "invoiceNumber", "totalAmount", "saleDate"], content: "Dear {{customerName}},\n\nThank you for your purchase. Your invoice {{invoiceNumber}} for {{totalAmount}} has been processed.\n\nBest regards,\niClick Store" },
  { id: "mpesa_payment_sms", channel: "SMS", name: "Payment Received", trigger: "M-Pesa STK Success", tags: ["amount", "receiptNumber", "balance"], content: "Confirmed. KES{{amount}} received. Ref:{{receiptNumber}}. New balance: {{balance}}" },
  
  // INVENTORY
  { id: "stock_alert_sys", channel: "System", name: "Low Stock Alert", trigger: "Quantity Drop", tags: ["productName", "currentStock", "reorderLevel"], content: "Attention: {{productName}} is running low. Current stock: {{currentStock}}. Re-order level: {{reorderLevel}}." },
  { id: "grn_received_email", channel: "Email", name: "Stock Received", trigger: "GRN Processed", tags: ["orderNumber", "vendorName", "itemCount"], content: "Stock delivery for PO {{orderNumber}} from {{vendorName}} has been successfully received ({{itemCount}} items)." },

  // HR & PAYROLL
  { id: "payslip_ready_email", channel: "Email", name: "Payslip Published", trigger: "Payroll Run Closed", tags: ["employeeName", "payPeriod", "netSalary"], content: "Hi {{employeeName}}, your payslip for {{payPeriod}} is now available. Net Salary: {{netSalary}}." },
  { id: "leave_status_sys", channel: "System", name: "Leave Request Update", trigger: "Workflow Approved", tags: ["leaveType", "startDate", "endDate", "status"], content: "Your request for {{leaveType}} from {{startDate}} to {{endDate}} has been {{status}}." },

  // ACCOUNTING
  { id: "invoice_overdue_email", channel: "Email", name: "Payment Reminder", trigger: "Credit Term Expiry", tags: ["customerName", "invoiceNumber", "dueDate"], content: "Notice: Your payment for invoice {{invoiceNumber}} was due on {{dueDate}}. Please settle the balance." },
  { id: "budget_limit_sys", channel: "System", name: "Budget Threshold", trigger: "Expense Logged", tags: ["budgetName", "percentage"], content: "Warning: {{budgetName}} has reached {{percentage}}% of its allocated limit." },

  // ADMIN & SECURITY
  { id: "welcome_user_email", channel: "Email", name: "Account Activation", trigger: "User Created", tags: ["firstName", "email", "temporaryPassword"], content: "Welcome to iClick ERP, {{firstName}}! Use {{temporaryPassword}} to login to {{email}}." },
  { id: "role_change_sys", channel: "System", name: "Permissions Modified", trigger: "RBAC Updated", tags: ["roleName", "modifiedBy"], content: "Your system role has been updated to {{roleName}} by {{modifiedBy}}." },
];

export default function NotificationTemplates() {
  const db = useFirestore()
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
  const [activeChannel, setActiveChannel] = useState<"Email" | "SMS" | "System">("Email")
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const templatesQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'notification_templates'))
  }, [db, selectedInstitutionId])
  
  const { data: templates, isLoading } = useCollection(templatesQuery)

  const filteredTemplates = templates?.filter(t => t.channel === activeChannel) || []
  const activeTemplate = templates?.find(t => t.id === activeTemplateId)

  const handleSync = async () => {
    if (!selectedInstitutionId) return
    setInitializing(true)
    try {
      const promises = TEMPLATE_REGISTRY.map(def => {
        const existing = templates?.find(t => t.id === def.id)
        if (existing) return Promise.resolve()
        
        const docRef = doc(db, 'institutions', selectedInstitutionId, 'notification_templates', def.id)
        return setDoc(docRef, {
          ...def,
          institutionId: selectedInstitutionId,
          isActive: true,
          updatedAt: serverTimestamp()
        }, { merge: true })
      })
      await Promise.all(promises)
      toast({ title: "Registry Synced", description: "Communication channels are up to date." })
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setInitializing(false)
    }
  }

  const handleSaveTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedInstitutionId || !activeTemplateId) return

    const formData = new FormData(e.currentTarget)
    const data = {
      subject: formData.get('subject') as string || "",
      content: formData.get('content') as string,
      updatedAt: serverTimestamp(),
    }

    try {
      const docRef = doc(db, 'institutions', selectedInstitutionId, 'notification_templates', activeTemplateId)
      await setDoc(docRef, data, { merge: true })
      toast({ title: "Template Saved" })
    } catch (e) {
      toast({ variant: "destructive", title: "Save Failed" })
    }
  }

  const handleSendTest = async () => {
    if (!selectedInstitutionId || !activeTemplateId || !activeTemplate) return;
    
    setSendingTest(true);
    const testEmail = prompt("Enter email address for test message:");
    if (!testEmail) {
      setSendingTest(false);
      return;
    }

    // Prepare mock tags based on template requirements
    const mockTags: Record<string, string> = {};
    activeTemplate.tags?.forEach((tag: string) => {
      mockTags[tag] = `[TEST_${tag.toUpperCase()}]`;
    });

    const result = await sendTransactionalEmail(db, selectedInstitutionId, {
      to: testEmail,
      templateId: activeTemplateId,
      tags: mockTags
    });

    if (result.success) {
      toast({ title: "Test Email Sent", description: `Message delivered via institutional SMTP.` });
    } else {
      toast({ variant: "destructive", title: "Delivery Failed", description: result.error });
    }
    setSendingTest(false);
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <BellRing className="size-5" />
            </div>
            <h1 className="text-2xl font-headline font-bold">Communications</h1>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 h-9 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10"
              disabled={!selectedInstitutionId || initializing}
              onClick={handleSync}
            >
              {initializing ? <RefreshCw className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-primary" />}
              Sync Templates
            </Button>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Mail className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Choose an institution to configure its notification engine.</p>
          </div>
        ) : (
          <Tabs value={activeChannel} onValueChange={(val: any) => {
            setActiveChannel(val)
            setActiveTemplateId(null)
          }} className="w-full">
            <TabsList className="bg-secondary/30 h-10 p-1 mb-4 border-b rounded-none w-full justify-start bg-transparent">
              <TabsTrigger value="Email" className="text-xs gap-2 px-6 h-8 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                <Mail className="size-3.5" /> Email Center
              </TabsTrigger>
              <TabsTrigger value="SMS" className="text-xs gap-2 px-6 h-8 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                <MessageSquare className="size-3.5" /> SMS Gateway
              </TabsTrigger>
              <TabsTrigger value="System" className="text-xs gap-2 px-6 h-8 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                <BellRing className="size-3.5" /> System Alerts
              </TabsTrigger>
            </TabsList>

            <div className="grid gap-4 lg:grid-cols-12 min-h-[600px]">
              <Card className="lg:col-span-4 border-none ring-1 ring-border shadow bg-card/50 overflow-hidden flex flex-col">
                <CardHeader className="py-3 px-4 border-b border-border/50">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Available Templates</p>
                </CardHeader>
                <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/30">
                  {isLoading ? (
                    <div className="p-8 text-center text-xs animate-pulse opacity-50 uppercase font-bold">Retrieving...</div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <AlertCircle className="size-8 mx-auto opacity-10 mb-2" />
                      <p className="text-xs italic">No {activeChannel} templates registered.</p>
                    </div>
                  ) : filteredTemplates.map(t => (
                    <button 
                      key={t.id}
                      className={`w-full text-left p-4 hover:bg-primary/5 transition-all flex flex-col gap-1 border-l-2 ${activeTemplateId === t.id ? 'bg-primary/10 border-primary' : 'border-transparent'}`}
                      onClick={() => setActiveTemplateId(t.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold tracking-tight">{t.name}</span>
                        {t.isActive ? <CheckCircle2 className="size-3 text-emerald-500" /> : <div className="size-2 rounded-full bg-muted" />}
                      </div>
                      <span className="text-[9px] text-muted-foreground uppercase font-mono">{t.trigger}</span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-xl bg-card overflow-hidden flex flex-col">
                {activeTemplate ? (
                  <form onSubmit={handleSaveTemplate} className="flex flex-col h-full">
                    <CardHeader className="py-4 px-6 border-b border-border/50 flex flex-row items-center justify-between shrink-0">
                      <div className="space-y-0.5">
                        <h3 className="text-lg font-bold">{activeTemplate.name}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest">{activeTemplate.trigger}</p>
                      </div>
                      <div className="flex gap-2">
                        {activeChannel === 'Email' && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            disabled={sendingTest}
                            className="gap-2 h-9 px-4 text-xs font-bold border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
                            onClick={handleSendTest}
                          >
                            {sendingTest ? <RefreshCw className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                            Test Delivery
                          </Button>
                        )}
                        <Button type="submit" size="sm" className="gap-2 h-9 px-6 font-bold shadow-lg shadow-primary/20">
                          <Save className="size-4" /> Save
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                      {activeChannel === 'Email' && (
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Subject Line</Label>
                          <Input 
                            name="subject" 
                            defaultValue={activeTemplate.subject} 
                            placeholder="e.g. Your receipt from iClick"
                            className="bg-secondary/20 border-none ring-1 ring-border h-10 text-sm font-medium"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Message Body</Label>
                        <Textarea 
                          name="content"
                          defaultValue={activeTemplate.content}
                          className="min-h-[250px] bg-secondary/10 border-none ring-1 ring-border p-4 text-sm leading-relaxed custom-scrollbar"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Variable className="size-3.5 text-primary" />
                          <Label className="text-[10px] uppercase font-bold tracking-wider">Dynamic Modules (Tags)</Label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activeTemplate.tags?.map((tag: string) => (
                            <Badge 
                              key={tag} 
                              variant="outline" 
                              className="text-[10px] py-1 px-2.5 bg-background cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors"
                              onClick={() => {
                                navigator.clipboard.writeText(`{{${tag}}}`)
                                toast({ title: "Tag Copied", description: `{{${tag}}} added to clipboard.` })
                              }}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-[9px] text-muted-foreground italic flex items-center gap-1.5">
                          <Info className="size-3" /> Click a tag to copy. Use {{tag}} syntax in the body or subject.
                        </p>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 py-32 space-y-4">
                    <div className="size-20 rounded-full border-4 border-dashed flex items-center justify-center">
                      <Send className="size-8" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold uppercase tracking-[0.2em]">Select a Channel</p>
                      <p className="text-[10px]">Configure how the system talks to users.</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  )
}
