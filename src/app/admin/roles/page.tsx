
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, query, addDoc } from "firebase/firestore"
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase"
import { Shield, Plus, Edit2, Lock, UserCog, Search, ChevronRight, ChevronDown, Terminal, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { navConfig } from "@/lib/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from '@/hooks/use-toast';

const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'] as const;

export default function RolesManagement() {
  const db = useFirestore()
  const { user } = useUser()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [expandedModules, setExpandedModules] = useState<string[]>([])

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
    const activeModules = navConfig
      .filter(m => role.permissionIds?.some((p: string) => p.startsWith(`${m.id}:`)))
      .map(m => m.id)
    setExpandedModules(activeModules)
    setIsCreateOpen(true)
  }

  const togglePermission = (moduleId: string, submenuId: string | null, action: string) => {
    const permId = `${moduleId}:${submenuId || 'root'}:${action}`;
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    )
  }

  const toggleModuleAccess = (moduleId: string) => {
    const rootReadPerm = `${moduleId}:root:read`;
    const isCurrentlyChecked = selectedPermissions.includes(rootReadPerm);

    if (isCurrentlyChecked) {
      setSelectedPermissions(prev => prev.filter(p => !p.startsWith(`${moduleId}:`)));
      setExpandedModules(prev => prev.filter(id => id !== moduleId));
    } else {
      setSelectedPermissions(prev => [...prev, rootReadPerm]);
      setExpandedModules(prev => [...prev, moduleId]);
    }
  }

  const getAllPermissions = () => {
    const allPerms: string[] = [];
    navConfig.forEach(module => {
      allPerms.push(`${module.id}:root:read`);
      PERMISSION_ACTIONS.forEach(action => {
        allPerms.push(`${module.id}:root:${action}`);
      });
      module.submenus?.forEach(sub => {
        PERMISSION_ACTIONS.forEach(action => {
          allPerms.push(`${module.id}:${sub.id}:${action}`);
        });
      });
    });
    return allPerms;
  }

  const grantAllPermissions = () => {
    setSelectedPermissions(getAllPermissions());
    setExpandedModules(navConfig.map(m => m.id));
  }

  const bootstrapDevOps = async () => {
    if (!selectedInstitutionId || !user) {
      toast({ variant: "destructive", title: "Select an institution first" });
      return;
    }

    const data = {
      name: "DevOps",
      description: "Root superuser with access to all modules and configurations.",
      institutionId: selectedInstitutionId,
      permissionIds: getAllPermissions(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    try {
      const rolesColRef = collection(db, 'institutions', selectedInstitutionId, 'roles');
      const docRef = await addDoc(rolesColRef, data);
      assignRoleToUser(user.uid, docRef.id);
      toast({ title: "DevOps Role Created & Assigned", description: `User ${user.email} is now a superuser.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Bootstrap Failed", description: "Check your permissions." });
    }
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
      setDocumentNonBlocking(doc(rolesColRef), { ...data, createdAt: serverTimestamp() }, { merge: true })
    }
    setIsCreateOpen(false)
    setEditingRole(null)
    setSelectedPermissions([])
    setExpandedModules([])
  }

  const assignRoleToUser = (userId: string, roleId: string) => {
    if (!selectedInstitutionId) return;
    
    setDocumentNonBlocking(
      doc(db, 'institutions', selectedInstitutionId, 'roles', roleId, 'members', userId),
      { active: true, assignedAt: serverTimestamp() },
      { merge: true }
    );

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
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 h-9 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10" 
                disabled={!selectedInstitutionId}
                onClick={bootstrapDevOps}
              >
                <Sparkles className="size-4 text-primary" /> Bootstrap DevOps
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 h-9 text-xs" disabled={!selectedInstitutionId} onClick={() => {
                    setEditingRole(null);
                    setSelectedPermissions([]);
                    setExpandedModules([]);
                  }}>
                    <Plus className="size-4" /> New Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
                  <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader className="p-4 md:p-6 pb-2 shrink-0 border-b">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <DialogTitle className="text-lg md:text-xl font-headline">{editingRole ? 'Edit' : 'Create'} Role</DialogTitle>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="text-[10px] font-bold h-8 gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10"
                          onClick={grantAllPermissions}
                        >
                          <Terminal className="size-3.5" /> Grant All (DevOps Mode)
                        </Button>
                      </div>
                    </DialogHeader>
                    
                    <div className="p-4 md:p-6 pt-4 shrink-0 bg-secondary/5 border-b">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                          <Label htmlFor="name" className="text-[10px] uppercase font-bold text-muted-foreground">Role Name</Label>
                          <Input id="name" name="name" defaultValue={editingRole?.name} placeholder="e.g. DevOps / Admin / Cashier" className="h-9 text-xs bg-background" required />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="description" className="text-[10px] uppercase font-bold text-muted-foreground">Description</Label>
                          <Input id="description" name="description" defaultValue={editingRole?.description} placeholder="Define the scope of this role" className="h-9 text-xs bg-background" required />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                      <ScrollArea className="h-full">
                        <div className="px-4 md:px-6 py-4">
                          <div className="border rounded-lg ring-1 ring-border bg-card overflow-hidden">
                            <Table className="min-w-[700px] border-collapse">
                              <TableHeader className="bg-secondary/30 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="h-10 text-[10px] font-bold uppercase w-1/3">Module / Section</TableHead>
                                  <TableHead className="h-10 text-[10px] font-bold uppercase text-center">Module Access</TableHead>
                                  {PERMISSION_ACTIONS.map(action => (
                                    <TableHead key={action} className="h-10 text-[10px] font-bold uppercase text-center">{action}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {navConfig.map(module => {
                                  const isExpanded = expandedModules.includes(module.id);
                                  const hasRootRead = selectedPermissions.includes(`${module.id}:root:read`);

                                  return (
                                    <React.Fragment key={module.id}>
                                      <TableRow className="bg-secondary/10 border-b-primary/10">
                                        <TableCell className="font-bold text-xs flex items-center gap-2 py-3">
                                          <module.icon className="size-3.5 text-primary" />
                                          {module.title}
                                          {module.submenus && module.submenus.length > 0 && (
                                            <div className="ml-auto opacity-50">
                                              {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                                            </div>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Checkbox 
                                            checked={hasRootRead}
                                            onCheckedChange={() => toggleModuleAccess(module.id)}
                                          />
                                        </TableCell>
                                        {PERMISSION_ACTIONS.map(action => (
                                          <TableCell key={action} className="text-center py-2">
                                            <Checkbox 
                                              disabled={!hasRootRead && action !== 'read'}
                                              checked={selectedPermissions.includes(`${module.id}:root:${action}`)}
                                              onCheckedChange={() => togglePermission(module.id, null, action)}
                                            />
                                          </TableCell>
                                        ))}
                                      </TableRow>
                                      
                                      {isExpanded && module.submenus?.map(sub => (
                                        <TableRow key={`${module.id}-${sub.id}`} className="bg-background/50 hover:bg-secondary/5 border-l-2 border-l-primary/20">
                                          <TableCell className="text-[11px] pl-10 text-muted-foreground py-2">
                                            <div className="flex items-center gap-2">
                                              <sub.icon className="size-3 opacity-50" />
                                              {sub.title}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-center" />
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
                                    </React.Fragment>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </ScrollArea>
                    </div>

                    <DialogFooter className="p-4 md:p-6 border-t bg-secondary/5 shrink-0 flex flex-row justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-9">Cancel</Button>
                      <Button type="submit" className="text-xs h-9 font-bold bg-primary hover:bg-primary/90 px-6">Save Changes</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Lock className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground px-4 text-center">Select an institution to configure security policies.</p>
          </div>
        ) : (
          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="bg-secondary/30 h-10 mb-4 w-full justify-start overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="roles" className="text-xs gap-2 px-4 h-8 shrink-0">
                <Shield className="size-3.5" /> Defined Roles
              </TabsTrigger>
              <TabsTrigger value="assignment" className="text-xs gap-2 px-4 h-8 shrink-0">
                <UserCog className="size-3.5" /> Staff Assignment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roles">
              <Card className="border-none ring-1 ring-border shadow-xl overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[10px] uppercase font-bold pl-6">Role Title</TableHead>
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
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(role)}>
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
                <CardHeader className="py-3 px-4 md:px-6 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input placeholder="Search staff members..." className="pl-9 h-9 bg-secondary/20 border-none text-xs" />
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[600px]">
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
                                <span className="font-bold text-xs">{member.firstName || 'User'} {member.lastName || member.id.slice(0, 4)}</span>
                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">{member.email}</span>
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
                                <SelectTrigger className="w-[140px] h-8 text-[10px] ml-auto">
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
