
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase"
import { Plus, Building2, Search, Edit2, CheckCircle, XCircle, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from '@/hooks/use-toast';

export default function InstitutionsManagement() {
  const db = useFirestore()
  const { user } = useUser()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingInstitution, setEditingInstitution] = useState<any>(null)

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions, isLoading } = useCollection(instCollectionRef)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: any = {
      name: formData.get('name'),
      country: formData.get('country'),
      taxIdentificationNumber: formData.get('tin'),
      isActive: true,
      updatedAt: serverTimestamp(),
    }

    if (editingInstitution) {
      updateDocumentNonBlocking(doc(db, 'institutions', editingInstitution.id), data)
      toast({ title: "Institution Updated" })
    } else {
      addDocumentNonBlocking(instCollectionRef, {
        ...data,
        createdAt: serverTimestamp(),
      }).then((docRef) => {
        if (docRef && user) {
          setDocumentNonBlocking(
            doc(db, 'user_institutions', user.uid, 'memberships', docRef.id),
            { 
              institutionId: docRef.id,
              institutionName: data.name,
              joinedAt: serverTimestamp(),
              role: 'Owner'
            },
            { merge: true }
          )
        }
      })
      toast({ title: "Institution Created" })
    }
    setIsCreateOpen(false)
    setEditingInstitution(null)
  }

  const handleClaimAdmin = () => {
    if (!user) return
    setDocumentNonBlocking(
      doc(db, 'system_admins', user.uid),
      { 
        email: user.email,
        claimedAt: serverTimestamp(),
        isActive: true
      },
      { merge: true }
    )
    toast({ title: "Admin Rights Claimed" })
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-headline font-bold">Institutions</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 h-9 text-xs" onClick={handleClaimAdmin}>
              <ShieldCheck className="size-4" /> Claim Admin
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-9 text-xs" onClick={() => setEditingInstitution(null)}>
                  <Plus className="size-4" /> Add New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingInstitution ? 'Edit' : 'New'} Institution</DialogTitle>
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
                      <Label htmlFor="tin">Tax ID Number</Label>
                      <Input id="tin" name="tin" defaultValue={editingInstitution?.taxIdentificationNumber} required />
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

        <Card className="border-none ring-1 ring-border shadow-lg">
          <CardHeader className="py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 h-9 bg-secondary/20 border-none text-xs" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Institution Name</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Country</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Tax ID</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Status</TableHead>
                  <TableHead className="h-9 text-right text-[10px] uppercase font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-xs">Loading...</TableCell></TableRow>
                ) : institutions?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">No records found.</TableCell></TableRow>
                ) : institutions?.map((inst) => (
                  <TableRow key={inst.id} className="h-11">
                    <TableCell className="font-bold text-xs flex items-center gap-2">
                      <Building2 className="size-3.5 text-primary" />
                      {inst.name}
                    </TableCell>
                    <TableCell className="text-xs">{inst.country}</TableCell>
                    <TableCell className="font-mono text-[10px]">{inst.taxIdentificationNumber}</TableCell>
                    <TableCell>
                      <Badge variant={inst.isActive ? 'secondary' : 'destructive'} className="text-[9px] h-4 gap-1 px-1.5">
                        {inst.isActive ? <CheckCircle className="size-2.5" /> : <XCircle className="size-2.5" />}
                        {inst.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                        setEditingInstitution(inst)
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
      </div>
    </DashboardLayout>
  )
}
