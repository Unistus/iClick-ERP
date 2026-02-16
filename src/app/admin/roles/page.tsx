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
import { Checkbox } from "@/components/ui/checkbox"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Shield, Plus, Edit2, Search, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function RolesManagement() {
  const db = useFirestore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const permissionsCollectionRef = useMemoFirebase(() => collection(db, 'permissions'), [db])
  const { data: permissions } = useCollection(permissionsCollectionRef)

  const rolesQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'roles'))
  }, [db, selectedInstitutionId])
  
  const { data: roles, isLoading: isRolesLoading } = useCollection(rolesQuery)

  const handleEdit = (role: any) => {
    setEditingRole(role)
    setSelectedPermissions(role.permissionIds || [])
    setIsCreateOpen(true)
  }

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedInstitutionId) return

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      institutionId: selectedInstitutionId,
      permissionIds: selectedPermissions,
      updatedAt: serverTimestamp(),
    }

    const rolesColRef = collection(db, 'institutions', selectedInstitutionId, 'roles')

    if (editingRole) {
      updateDocumentNonBlocking(doc(rolesColRef, editingRole.id), data)
    } else {
      addDocumentNonBlocking(rolesColRef, {
        ...data,
        createdAt: serverTimestamp(),
      })
    }
    setIsCreateOpen(false)
    setEditingRole(null)
    setSelectedPermissions([])
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Roles & Permissions</h1>
            <p className="text-muted-foreground">Define access levels and responsibilities for institution staff.</p>
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
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (!open) {
                setEditingRole(null)
                setSelectedPermissions([])
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-11" disabled={!selectedInstitutionId}>
                  <Plus className="size-4" /> New Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingRole ? 'Edit' : 'Create'} Role</DialogTitle>
                    <DialogDescription>
                      Assign specific permissions to this role for {institutions?.find(i => i.id === selectedInstitutionId)?.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Role Name</Label>
                      <Input id="name" name="name" defaultValue={editingRole?.name} placeholder="e.g. Branch Manager" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" defaultValue={editingRole?.description} placeholder="Responsible for daily operations..." required />
                    </div>
                    <div className="space-y-4">
                      <Label>Granted Permissions</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {permissions?.map(perm => (
                          <div key={perm.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
                            <Checkbox 
                              id={perm.id} 
                              checked={selectedPermissions.includes(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <div className="grid gap-1 leading-none">
                              <label htmlFor={perm.id} className="text-sm font-bold cursor-pointer">
                                {perm.name}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {perm.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save Role</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-secondary/10">
            <Shield className="size-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium">Please select an institution to manage roles.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl">
            <CardHeader>
              <CardTitle>Defined Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRolesLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Loading roles...</TableCell></TableRow>
                  ) : roles?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No roles defined for this institution.</TableCell></TableRow>
                  ) : roles?.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-bold flex items-center gap-3">
                        <div className="size-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                          <Shield className="size-4" />
                        </div>
                        {role.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{role.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {role.permissionIds?.length || 0} Permissions
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(role)}>
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
