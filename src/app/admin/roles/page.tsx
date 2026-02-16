
'use client';

import * as React from 'react';
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, query, addDoc } from "firebase/firestore"
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase"
import { Shield, Plus, Edit2, Lock, UserCog, Search, ChevronRight, ChevronDown, Terminal, Sparkles, User, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { navConfig } from "@/lib/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from '@/hooks/use-toast';

const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'] as const;

export default function RolesManagement() {
  const db = useFirestore()
  const { user: currentUser } = useUser()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isUserEditOpen, setIsUserEditOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [editingUser, setEditingUser] = useState<any>(null)
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

  const handleEditRole = (role: any) => {
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
    if (!selectedInstitutionId || !currentUser) {
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
      assignRoleToUser(currentUser.uid, docRef.id);
      toast({ title: "DevOps Role Created & Assigned", description: `User ${currentUser.email} is now a superuser.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Bootstrap Failed", description: "Insufficient permissions to create role." });
    }
  }

  const handleSubmitRole = (e: React.FormEvent<HTMLFormElement>) => {
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
    
    // 1. Map user to role in the institution context (for Rules)
    setDocumentNonBlocking(
      doc(db, 'institutions', selectedInstitutionId, 'roles', roleId, 'members', userId),
      { active: true, assignedAt: serverTimestamp() },
      { merge: true }
    );

    // 2. Add institution membership record (for Tenancy)
    setDocumentNonBlocking(
      doc(db, 'user_institutions', userId, 'memberships', selectedInstitutionId),
      { 
        institutionId: selectedInstitutionId,
        joinedAt: serverTimestamp(),
        isActive: true 
      },
      { merge: true }
    );

    // 3. Update user profile with the role for UI filtering
    setDocumentNonBlocking(
      doc(db, 'users', userId),
      { 
        [`rolesByInstitution.${selectedInstitutionId}`]: roleId,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    toast({ title: "Role Assigned", description: "User access levels updated." });
  }

  const handleUpdateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      isActive: formData.get('isActive') === 'on',
      updatedAt: serverTimestamp(),
    };

    updateDocumentNonBlocking(doc(db, 'users', editingUser.id), data);
    setIsUserEditOpen(false);
    setEditingUser(null);
    toast({ title: "User Updated" });
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold text-foreground">RBAC & User Management</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-full sm:w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Active Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
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
                  <form onSubmit={handleSubmitRole} className="flex flex-col h-full overflow-hidden">
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
                          <Label htmlFor="name" className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Role Title</Label>
                          <Input id="name" name="name" defaultValue={editingRole?.name} placeholder="e.g. Sales Manager" className="h-9 text-xs bg-background" required />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="description" className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Scope Description</Label>
                          <Input id="description" name="description" defaultValue={editingRole?.description} placeholder="Briefly define the responsibilities" className="h-9 text-xs bg-background" required />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                      <ScrollArea className="h-full">
                        <div className="px-4 md:px-6 py-4">
                          <div className="border rounded-lg ring-1 ring-border bg-card overflow-hidden shadow-sm">
                            <Table className="min-w-[700px] border-collapse">
                              <TableHeader className="bg-secondary/30 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="h-10 text-[10px] font-bold uppercase w-1/3 text-muted-foreground pl-4">Module / Section</TableHead>
                                  <TableHead className="h-10 text-[10px] font-bold uppercase text-center text-muted-foreground">Access</TableHead>
                                  {PERMISSION_ACTIONS.map(action => (
                                    <TableHead key={action} className="h-10 text-[10px] font-bold uppercase text-center text-muted-foreground">{action}</TableHead>
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
                                        <TableCell className="font-bold text-xs flex items-center gap-2 py-3 pl-4">
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
                      <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs h-9 font-medium">Cancel</Button>
                      <Button type="submit" className="text-xs h-9 font-bold bg-primary hover:bg-primary/90 px-8 shadow-lg shadow-primary/20">Commit Changes</Button>
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
            <p className="text-sm font-medium text-muted-foreground px-4 text-center">Select an institution to configure security policies and manage users.</p>
          </div>
        ) : (
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="bg-secondary/30 h-10 mb-4 p-1 w-full justify-start overflow-x-auto overflow-y-hidden border-b rounded-none bg-transparent">
              <TabsTrigger value="users" className="text-xs gap-2 px-6 h-8 shrink-0 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none border-b-2 data-[state=active]:border-primary border-transparent">
                <UserCog className="size-3.5" /> User Management
              </TabsTrigger>
              <TabsTrigger value="roles" className="text-xs gap-2 px-6 h-8 shrink-0 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none border-b-2 data-[state=active]:border-primary border-transparent">
                <Shield className="size-3.5" /> Institutional Roles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roles">
              <Card className="border-none ring-1 ring-border shadow-xl overflow-hidden bg-card">
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[10px] uppercase font-bold pl-6 text-muted-foreground">Role Title</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground">Description</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-bold text-center text-muted-foreground">Active Rules</TableHead>
                        <TableHead className="h-10 text-right text-[10px] uppercase font-bold pr-6 text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isRolesLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs">Analyzing security data...</TableCell></TableRow>
                      ) : roles?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-xs text-muted-foreground">No roles configured for this institution.</TableCell></TableRow>
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
                            <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-500 font-mono tracking-tight">
                              {role.permissionIds?.length || 0} PERMISSIONS
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEditRole(role)}>
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

            <TabsContent value="users">
              <Card className="border-none ring-1 ring-border shadow-xl bg-card">
                <CardHeader className="py-3 px-4 md:px-6 border-b">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input placeholder="Search system users..." className="pl-9 h-9 bg-secondary/20 border-none text-xs" />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {users?.length || 0} Total Records
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="h-10 text-[10px] uppercase font-bold pl-6 text-muted-foreground">User / Identity</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground">Current Status</TableHead>
                        <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground">Institutional Role</TableHead>
                        <TableHead className="h-10 text-right text-[10px] uppercase font-bold pr-6 text-muted-foreground">Change Context</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(member => {
                        const currentRoleId = member.rolesByInstitution?.[selectedInstitutionId];
                        const currentRole = roles?.find(r => r.id === currentRoleId);
                        
                        return (
                          <TableRow key={member.id} className="h-16 hover:bg-secondary/5 transition-colors">
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3">
                                <div className="size-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground border shrink-0">
                                  <User className="size-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs">{member.firstName || 'New'} {member.lastName || 'User'}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">{member.email}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="size-6 text-muted-foreground hover:text-primary"
                                  onClick={() => {
                                    setEditingUser(member);
                                    setIsUserEditOpen(true);
                                  }}
                                >
                                  <Edit2 className="size-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {member.isActive !== false ? (
                                <Badge variant="secondary" className="text-[9px] gap-1 h-5 px-2 bg-emerald-500/10 text-emerald-500 border-none font-bold">
                                  <CheckCircle className="size-2.5" /> ACTIVE
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[9px] gap-1 h-5 px-2 font-bold">
                                  <XCircle className="size-2.5" /> DISABLED
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {currentRole ? (
                                <Badge variant="outline" className="text-[9px] gap-1.5 h-5 px-2 bg-primary/5 border-primary/20 text-primary font-bold">
                                  <Shield className="size-2.5" /> {currentRole.name.toUpperCase()}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] h-5 px-2 text-muted-foreground/50 border-dashed animate-pulse">NO ACCESS GRANTED</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Select 
                                value={currentRoleId || "none"} 
                                onValueChange={(val) => val !== "none" && assignRoleToUser(member.id, val)}
                              >
                                <SelectTrigger className="w-[160px] h-8 text-[10px] font-medium ml-auto bg-background ring-1 ring-border border-none">
                                  <SelectValue placeholder="Assign Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none" className="text-xs text-muted-foreground italic">None (No Access)</SelectItem>
                                  {roles?.map(role => (
                                    <SelectItem key={role.id} value={role.id} className="text-xs font-medium">{role.name}</SelectItem>
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

        {/* User Edit Dialog */}
        <Dialog open={isUserEditOpen} onOpenChange={setIsUserEditOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleUpdateUser}>
              <DialogHeader>
                <DialogTitle>Edit User Profile</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" defaultValue={editingUser?.firstName} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" defaultValue={editingUser?.lastName} required />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="isActive" name="isActive" defaultChecked={editingUser?.isActive !== false} />
                  <Label htmlFor="isActive">Allow account login and system access</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
