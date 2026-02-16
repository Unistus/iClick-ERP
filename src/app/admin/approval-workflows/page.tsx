
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
import { Switch } from "@/components/ui/switch"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { GitPullRequest, Plus, Edit2, Search, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function ApprovalWorkflows() {
  const db = useFirestore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const workflowsQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'approval_workflows'))
  }, [db, selectedInstitutionId])
  
  const { data: workflows, isLoading } = useCollection(workflowsQuery)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedInstitutionId) return

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      triggerType: formData.get('triggerType'),
      minAmount: parseFloat(formData.get('minAmount') as string) || 0,
      isMultiLevel: formData.get('isMultiLevel') === 'on',
      isActive: true,
      institutionId: selectedInstitutionId,
      updatedAt: serverTimestamp(),
    }

    const colRef = collection(db, 'institutions', selectedInstitutionId, 'approval_workflows')

    if (editingWorkflow) {
      updateDocumentNonBlocking(doc(colRef, editingWorkflow.id), data)
    } else {
      addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp() })
    }
    setIsCreateOpen(false)
    setEditingWorkflow(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Approval Workflows</h1>
            <p className="text-muted-foreground">Define authorization hierarchies for expenses, discounts, and credit sales.</p>
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
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-11" disabled={!selectedInstitutionId}>
                  <Plus className="size-4" /> New Workflow
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingWorkflow ? 'Edit' : 'Add'} Workflow</DialogTitle>
                    <DialogDescription>Configure when and how approvals are triggered.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Workflow Name</Label>
                      <Input id="name" name="name" defaultValue={editingWorkflow?.name} placeholder="e.g. High Discount Approval" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Trigger Type</Label>
                        <Select name="triggerType" defaultValue={editingWorkflow?.triggerType || "Discount"}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Expense">Expense</SelectItem>
                            <SelectItem value="Discount">Discount</SelectItem>
                            <SelectItem value="CreditSale">Credit Sale</SelectItem>
                            <SelectItem value="InventoryAdjustment">Inventory Adjustment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="minAmount">Min. Amount</Label>
                        <Input id="minAmount" name="minAmount" type="number" defaultValue={editingWorkflow?.minAmount} placeholder="1000" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch id="isMultiLevel" name="isMultiLevel" defaultChecked={editingWorkflow?.isMultiLevel} />
                      <Label htmlFor="isMultiLevel">Multi-level Approval Required</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Deploy Workflow</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-secondary/10">
            <GitPullRequest className="size-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium">Select an institution to manage workflows.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl">
            <CardHeader>
              <CardTitle>Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Levels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : workflows?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No workflows defined.</TableCell></TableRow>
                  ) : workflows?.map((wf) => (
                    <TableRow key={wf.id}>
                      <TableCell className="font-bold flex items-center gap-3">
                        <div className="size-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                          <GitPullRequest className="size-4" />
                        </div>
                        {wf.name}
                      </TableCell>
                      <TableCell><Badge variant="outline">{wf.triggerType}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">KES {wf.minAmount.toLocaleString()}</TableCell>
                      <TableCell>{wf.isMultiLevel ? 'Multi-Step' : 'Single-Step'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingWorkflow(wf)
                          setIsCreateOpen(true)
                        }}>
                          <Edit2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
