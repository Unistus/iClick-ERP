
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Plus, Building2, Search, Edit2, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function InstitutionsManagement() {
  const db = useFirestore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingInstitution, setEditingInstitution] = useState<any>(null)

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions, isLoading } = useCollection(instCollectionRef)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      country: formData.get('country'),
      taxIdentificationNumber: formData.get('tin'),
      isActive: true,
      updatedAt: serverTimestamp(),
    }

    if (editingInstitution) {
      updateDocumentNonBlocking(doc(db, 'institutions', editingInstitution.id), data)
    } else {
      addDocumentNonBlocking(instCollectionRef, {
        ...data,
        createdAt: serverTimestamp(),
      })
    }
    setIsCreateOpen(false)
    setEditingInstitution(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-headline font-bold">Institutions</h1>
            <p className="text-muted-foreground">Manage multi-tenant business organizations.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEditingInstitution(null)}>
                <Plus className="size-4" /> Add Institution
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingInstitution ? 'Edit' : 'New'} Institution</DialogTitle>
                  <DialogDescription>
                    Enter the legal details for the institution.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Legal Name</Label>
                    <Input id="name" name="name" defaultValue={editingInstitution?.name} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" name="country" defaultValue={editingInstitution?.country} placeholder="e.g. Kenya" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tin">Tax ID Number (PIN/VAT)</Label>
                    <Input id="tin" name="tin" defaultValue={editingInstitution?.taxIdentificationNumber} required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Institution</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none ring-1 ring-border shadow-lg">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search institutions..." className="pl-10 h-11 bg-secondary/20 border-none" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Tax ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading institutions...</TableCell></TableRow>
                ) : institutions?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No institutions found. Create your first tenant.</TableCell></TableRow>
                ) : institutions?.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-bold flex items-center gap-3">
                      <div className="size-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                        <Building2 className="size-4" />
                      </div>
                      {inst.name}
                    </TableCell>
                    <TableCell>{inst.country}</TableCell>
                    <TableCell className="font-mono text-xs">{inst.taxIdentificationNumber}</TableCell>
                    <TableCell>
                      <Badge variant={inst.isActive ? 'secondary' : 'destructive'} className="gap-1">
                        {inst.isActive ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                        {inst.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingInstitution(inst)
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
      </div>
    </DashboardLayout>
  )
}
