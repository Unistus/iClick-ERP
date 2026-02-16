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
import { Briefcase, Plus, Edit2, Search } from "lucide-react"

export default function DepartmentsManagement() {
  const db = useFirestore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<any>(null)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const branchQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'branches'))
  }, [db, selectedInstitutionId])
  const { data: branches } = useCollection(branchQuery)

  const deptQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId || !selectedBranchId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'branches', selectedBranchId, 'departments'))
  }, [db, selectedInstitutionId, selectedBranchId])
  const { data: departments, isLoading } = useCollection(deptQuery)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedInstitutionId || !selectedBranchId) return

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      institutionId: selectedInstitutionId,
      branchId: selectedBranchId,
      updatedAt: serverTimestamp(),
    }

    const deptColRef = collection(db, 'institutions', selectedInstitutionId, 'branches', selectedBranchId, 'departments')

    if (editingDept) {
      updateDocumentNonBlocking(doc(deptColRef, editingDept.id), data)
    } else {
      addDocumentNonBlocking(deptColRef, {
        ...data,
        createdAt: serverTimestamp(),
      })
    }
    setIsCreateOpen(false)
    setEditingDept(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Departments</h1>
            <p className="text-muted-foreground">Organize branch operations into functional units.</p>
          </div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[180px] bg-card border-none ring-1 ring-border">
                <SelectValue placeholder="Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={!selectedInstitutionId}>
              <SelectTrigger className="w-[180px] bg-card border-none ring-1 ring-border">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={!selectedBranchId} onClick={() => setEditingDept(null)}>
                  <Plus className="size-4" /> New Dept
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingDept ? 'Edit' : 'Add'} Department</DialogTitle>
                    <DialogDescription>
                      Create a functional unit within {branches?.find(b => b.id === selectedBranchId)?.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dept-name">Department Name</Label>
                      <Input id="dept-name" name="name" defaultValue={editingDept?.name} placeholder="e.g. Pharmacy, Kitchen, Reception" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" defaultValue={editingDept?.description} placeholder="A brief overview of function..." />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save Department</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedBranchId ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-secondary/10">
            <Briefcase className="size-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium">Please select an institution and branch to manage departments.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl">
            <CardHeader>
              <CardTitle>Departments List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dept Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : departments?.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No departments found.</TableCell></TableRow>
                  ) : departments?.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-bold flex items-center gap-3">
                        <div className="size-8 rounded bg-secondary text-primary flex items-center justify-center">
                          <Briefcase className="size-4" />
                        </div>
                        {dept.name}
                      </TableCell>
                      <TableCell>{dept.description}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingDept(dept)
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
