
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Briefcase, Plus, Edit2 } from "lucide-react"

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
      addDocumentNonBlocking(deptColRef, { ...data, createdAt: serverTimestamp() })
    }
    setIsCreateOpen(false)
    setEditingDept(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold">Departments</h1>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[160px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={!selectedInstitutionId}>
              <SelectTrigger className="w-[160px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map(b => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-9 text-xs" disabled={!selectedBranchId} onClick={() => setEditingDept(null)}>
                  <Plus className="size-4" /> Add Dept
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingDept ? 'Edit' : 'Add'} Department</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" defaultValue={editingDept?.name} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" defaultValue={editingDept?.description} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedBranchId ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Briefcase className="size-10 text-muted-foreground opacity-20 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Select institution and branch to manage departments.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Dept Name</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Description</TableHead>
                    <TableHead className="h-9 text-right text-[10px] uppercase font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-xs">Loading...</TableCell></TableRow>
                  ) : departments?.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground">No records found.</TableCell></TableRow>
                  ) : departments?.map((dept) => (
                    <TableRow key={dept.id} className="h-11">
                      <TableCell className="font-bold text-xs flex items-center gap-2">
                        <Briefcase className="size-3.5 text-primary" />
                        {dept.name}
                      </TableCell>
                      <TableCell className="text-xs">{dept.description}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                          setEditingDept(dept)
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
