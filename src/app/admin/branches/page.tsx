
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
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { MapPin, Search, Edit2, Store } from "lucide-react"

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
  
  const { data: branches, isLoading: isBranchesLoading } = useCollection(branchQuery)

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
      addDocumentNonBlocking(branchColRef, {
        ...data,
        createdAt: serverTimestamp(),
      })
    }
    setIsCreateOpen(false)
    setEditingBranch(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Branch Management</h1>
            <p className="text-muted-foreground">Configure physical locations for your institutions.</p>
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
                <Button className="gap-2 h-11" disabled={!selectedInstitutionId} onClick={() => setEditingBranch(null)}>
                  <MapPin className="size-4" /> New Branch
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingBranch ? 'Edit' : 'Add'} Branch</DialogTitle>
                    <DialogDescription>
                      Assign this branch to {institutions?.find(i => i.id === selectedInstitutionId)?.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="branch-name">Branch Name</Label>
                      <Input id="branch-name" name="name" defaultValue={editingBranch?.name} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address">Physical Address</Label>
                      <Input id="address" name="address" defaultValue={editingBranch?.address} required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Deploy Branch</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-secondary/10">
            <Store className="size-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium">Please select an institution to manage branches.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl">
            <CardHeader>
              <CardTitle>Branch List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isBranchesLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Loading branches...</TableCell></TableRow>
                  ) : branches?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No branches registered for this institution.</TableCell></TableRow>
                  ) : branches?.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-bold flex items-center gap-3">
                        <div className="size-8 rounded bg-accent/10 text-accent flex items-center justify-center">
                          <MapPin className="size-4" />
                        </div>
                        {branch.name}
                      </TableCell>
                      <TableCell>{branch.address}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingBranch(branch)
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
