
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
import { Checkbox } from "@/components/ui/checkbox"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase"
import { Shield, Plus, Edit2, Check, Lock, UserCog, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { navConfig } from "@/lib/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'] as const;

export default function RolesManagement() {
  const db = useFirestore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const rolesQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'roles'))
  }, [db, selectedInstitutionId])
  
  const { data: roles, isLoading: isRolesLoading } = useCollection(rolesQuery)

  const usersQuery = useMemoFirebase(() => {
    return query(collection(db, 'users'))
  }, [db])
  const { data: users } = useCollection(usersQuery)

  const handleEdit = (role: any) => {
    setEditingRole(role)
    setSelectedPermissions(role.permissionIds || [])
    setIsCreateOpen(true)
  }

  const togglePermission = (moduleId: string, submenuId: string | null, action: string) => {
    const permId = `${moduleId}:${submenuId || 'root'}:${action}`;
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
      addDocumentNonBlocking(rolesColRef, { ...data, createdAt: serverTimestamp() })
    }
    setIsCreateOpen(false)
    setEditingRole(null)
    setSelectedPermissions([])
  }

  const assignRoleToUser = (userId: string, roleId: string) => {
    if (!selectedInstitutionId) return;
    
    // Update membership path for security rules
    setDocumentNonBlocking(
      doc(db, 'institutions', selectedInstitutionId, 'roles', roleId, 'members', userId),
      { active: true, assignedAt: serverTimestamp() },
      { merge: true }
    );

    // Update user profile for UI filtering
    setDocumentNonBlocking(
      doc(db, 'users', userId),
      { 
        [`rolesByInstitution.${selectedInstitutionId}`]: roleId,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold">Roles & Permissions</h1>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[200px] h-9 bg-card border-none ring-1 ring-border text-xs">
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
                  <Plus className="size-4" /> New Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                  <DialogHeader className="p-6 pb-2">
                    <DialogTitle>{editingRole ? 'Edit' : 'Create'} Role</DialogTitle>
                  </DialogHeader>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label htmlFor="name" className="text-[10px] uppercase font-bold text-muted-foreground">Role Name</Label>
                        <Input id="name" name="name" defaultValue={editingRole?.name} className="h-9 text-xs" required />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="description" className="text-[10px] uppercase font-bold text-muted-foreground">Description</Label>
                        <Input id="description" name="description" defaultValue={editingRole?.description} className="h-9 text-xs" required />
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden ring-1 ring-border">
                      <Table>
                        <TableHeader className="bg-secondary/30">
                          <TableRow>
                            <TableHead className="h-9 text-[10px] font-bold uppercase w-1/3">Module / Section</TableHead>
                            {PERMISSION_ACTIONS.map(action => (
                              <TableHead key={action} className="h-9 text-[10px] font-bold uppercase text-center">{action}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {navConfig.map(module => (
                            <>
                              <TableRow key={module.id} className="bg-secondary/10">
                                <TableCell className="font-bold text-xs flex items-center gap-2 py-2">
                                  <module.icon className="size-3.5 text-primary" />
                                  {module.title}
                                </TableCell>
                                {PERMISSION_ACTIONS.map(action => (
                                  <TableCell key={action} className="text-center py-2">
                                    <Checkbox 
                                      checked={selectedPermissions.includes(`${module.id}:root:${action}`)}
                                      onCheckedChange={() => togglePermission(module.id, null, action)}
                                    />
                                  </TableCell>
                                ))}
                              </TableRow>
                              {module.submenus?.map(sub => (
                                <TableRow key={`${module.id}-${sub.id}`}>
                                  <TableCell className="text-[11px] pl-8 text-muted-foreground py-1.5">
                                    {sub.title}
                                  </TableCell>
                                  {PERMISSION_ACTIONS.map(action => (
                                    <TableCell key={action} className="text-center py-1.5">
                                      <Checkbox 
                                        checked={selectedPermissions.includes(`${module.id}:${sub.id}:${action}`)}
                                        onCheckedChange={() => togglePermission(module.id, sub.id, action)}
                                      />
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <DialogFooter className="p-6 pt-2 border-t bg-secondary/5">
                    <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs">Cancel</Button>
                    <Button type="submit" className="text-xs">Save Configuration</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Lock className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to configure security policies.</p>
          </div>
        ) : (
          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="bg-secondary/30 h-10 mb-4">
              <TabsTrigger value="roles" className="text-xs gap-2 px-4 h-8">
                <Shield className="size-3.5" /> Defined Roles
              </TabsTrigger>
              <TabsTrigger value="assignment" className="text-xs gap-2 px-4 h-8">
                <UserCog className="size-3.5" /> Staff Assignment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roles">
              <Card className="border-none ring-1 ring-border shadow-xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[10px] uppercase font-bold">Role Title</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-bold">Scope Description</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-bold text-center">Perms Count</TableHead>
                        <TableHead className="h-10 text-right text-[10px] uppercase font-bold pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isRolesLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs">Analyzing security data...</TableCell></TableRow>
                      ) : roles?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs text-muted-foreground">No roles configured.</TableCell></TableRow>
                      ) : roles?.map((role) => (
                        <TableRow key={role.id} className="hover:bg-secondary/10 group h-14">
                          <TableCell className="font-bold text-xs pl-6">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Shield className="size-4" />
                              </div>
                              {role.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground max-w-xs truncate">{role.description}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-500 font-mono">
                              {role.permissionIds?.length || 0} ACTIVE
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="icon" className="size-8 group-hover:bg-background" onClick={() => handleEdit(role)}>
                              <Edit2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assignment">
              <Card className="border-none ring-1 ring-border shadow-xl">
                <CardHeader className="py-3 px-6 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input placeholder="Search staff members..." className="pl-9 h-9 bg-secondary/20 border-none text-xs" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Staff Member</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-bold">Current Assigned Role</TableHead>
                        <TableHead className="h-10 text-right text-[10px] uppercase font-bold pr-6">Change Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(member => {
                        const currentRoleId = member.rolesByInstitution?.[selectedInstitutionId];
                        const currentRole = roles?.find(r => r.id === currentRoleId);
                        
                        return (
                          <TableRow key={member.id} className="h-14">
                            <TableCell className="pl-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-xs">{member.firstName} {member.lastName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{member.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {currentRole ? (
                                <Badge variant="outline" className="text-[9px] gap-1.5 h-5 px-2 bg-primary/5 border-primary/20 text-primary">
                                  <Shield className="size-2.5" /> {currentRole.name}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[9px] h-5 px-2 animate-pulse">NO ROLE ASSIGNED</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Select 
                                value={currentRoleId || ""} 
                                onValueChange={(val) => assignRoleToUser(member.id, val)}
                              >
                                <SelectTrigger className="w-[160px] h-8 text-[10px] ml-auto">
                                  <SelectValue placeholder="Assign Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles?.map(role => (
                                    <SelectItem key={role.id} value={role.id} className="text-xs">{role.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  )
}
