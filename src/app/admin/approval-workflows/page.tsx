
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { GitPullRequest, Plus, Edit2 } from "lucide-react"
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
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold">Approval Workflows</h1>
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
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-9 text-xs" disabled={!selectedInstitutionId}>
                  <Plus className="size-4" /> New Workflow
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingWorkflow ? 'Edit' : 'Add'} Workflow</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 text-xs">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Workflow Name</Label>
                      <Input id="name" name="name" defaultValue={editingWorkflow?.name} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Trigger Type</Label>
                        <Select name="triggerType" defaultValue={editingWorkflow?.triggerType || "Discount"}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Expense" className="text-xs">Expense</SelectItem>
                            <SelectItem value="Discount" className="text-xs">Discount</SelectItem>
                            <SelectItem value="CreditSale" className="text-xs">Credit Sale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="minAmount">Min. Amount</Label>
                        <Input id="minAmount" name="minAmount" type="number" defaultValue={editingWorkflow?.minAmount} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch id="isMultiLevel" name="isMultiLevel" defaultChecked={editingWorkflow?.isMultiLevel} />
                      <Label htmlFor="isMultiLevel">Multi-level Required</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Deploy</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-secondary/5">
            <GitPullRequest className="size-10 text-muted-foreground opacity-20 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Select institution to manage workflows.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Workflow Name</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Trigger</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Threshold</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Status</TableHead>
                    <TableHead className="h-9 text-right text-[10px] uppercase font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-xs">Loading...</TableCell></TableRow>
                  ) : workflows?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">No records.</TableCell></TableRow>
                  ) : workflows?.map((wf) => (
                    <TableRow key={wf.id} className="h-11">
                      <TableCell className="font-bold text-xs flex items-center gap-2">
                        <GitPullRequest className="size-3.5 text-primary" />
                        {wf.name}
                      </TableCell>
                      <TableCell className="text-[11px]"><Badge variant="outline" className="text-[9px] h-4">{wf.triggerType}</Badge></TableCell>
                      <TableCell className="font-mono text-[11px]">KES {wf.minAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-500">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                          setEditingWorkflow(wf)
                          setIsCreateOpen(true)
                        }}>
                          <Edit2 className="size-3.5" />
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
