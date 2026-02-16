
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { MapPin, Edit2, Store, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function BranchManagement() {
  const db = useFirestore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any>(null)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const branchQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'branches'))
  }, [db, selectedInstitutionId])
  
  const { data: branches, isLoading } = useCollection(branchQuery)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedInstitutionId) return

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      address: formData.get('address'),
      institutionId: selectedInstitutionId,
      isActive: true,
      updatedAt: serverTimestamp(),
    }

    const branchColRef = collection(db, 'institutions', selectedInstitutionId, 'branches')

    if (editingBranch) {
      updateDocumentNonBlocking(doc(branchColRef, editingBranch.id), data)
    } else {
      addDocumentNonBlocking(branchColRef, { ...data, createdAt: serverTimestamp() })
    }
    setIsCreateOpen(false)
    setEditingBranch(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold">Branch Management</h1>
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
                <Button size="sm" className="gap-2 h-9 text-xs" disabled={!selectedInstitutionId} onClick={() => setEditingBranch(null)}>
                  <Plus className="size-4" /> Add Branch
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingBranch ? 'Edit' : 'Add'} Branch</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Branch Name</Label>
                      <Input id="name" name="name" defaultValue={editingBranch?.name} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" name="address" defaultValue={editingBranch?.address} required />
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

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Store className="size-10 text-muted-foreground opacity-20 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to continue.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Branch Name</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Address</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Status</TableHead>
                    <TableHead className="h-9 text-right text-[10px] uppercase font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs">Loading...</TableCell></TableRow>
                  ) : branches?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">No records found.</TableCell></TableRow>
                  ) : branches?.map((branch) => (
                    <TableRow key={branch.id} className="h-11">
                      <TableCell className="font-bold text-xs flex items-center gap-2">
                        <MapPin className="size-3.5 text-accent" />
                        {branch.name}
                      </TableCell>
                      <TableCell className="text-xs">{branch.address}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-500">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                          setEditingBranch(branch)
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
