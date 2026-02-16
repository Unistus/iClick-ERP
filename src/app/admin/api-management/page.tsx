
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Copy, 
  RefreshCw, 
  ShieldAlert, 
  Zap, 
  Key, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Lock,
  Globe,
  Eye,
  EyeOff
} from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, query, serverTimestamp, deleteDoc } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { logSystemEvent } from "@/lib/audit-service"
import { toast } from "@/hooks/use-toast"

const SCOPES = [
  { id: 'pos:write', label: 'POS: Process Sales' },
  { id: 'pos:read', label: 'POS: View Sales' },
  { id: 'inventory:read', label: 'Inventory: View Stock' },
  { id: 'inventory:write', label: 'Inventory: Adjust Stock' },
  { id: 'crm:read', label: 'CRM: View Customers' },
  { id: 'accounting:read', label: 'Accounting: View Ledger' },
];

export default function APIManagement() {
  const db = useFirestore()
  const { user } = useUser()
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [showSecretId, setShowSecretId] = useState<string | null>(null)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const keysQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'api_keys'))
  }, [db, selectedInstitutionId])
  
  const { data: keys, isLoading } = useCollection(keysQuery)

  const generateRandomString = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const handleCreateKey = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedInstitutionId) return

    const formData = new FormData(e.currentTarget)
    const newKey = `pk_live_${generateRandomString(24)}`
    const newSecret = `sk_live_${generateRandomString(32)}`
    
    const data = {
      name: formData.get('name') as string,
      key: newKey,
      secret: newSecret,
      scopes: selectedScopes,
      status: 'Active',
      institutionId: selectedInstitutionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    addDocumentNonBlocking(collection(db, 'institutions', selectedInstitutionId, 'api_keys'), data)
    
    logSystemEvent(
      db, 
      selectedInstitutionId, 
      user, 
      'API', 
      'Key Created', 
      `New API key '${data.name}' generated with ${selectedScopes.length} scopes.`
    )

    toast({ title: "API Key Generated", description: "The secret key is only shown once." })
    setIsCreateOpen(false)
    setSelectedScopes([])
  }

  const handleRollKey = (keyId: string, keyName: string) => {
    if (!selectedInstitutionId) return
    
    const newSecret = `sk_live_${generateRandomString(32)}`
    const docRef = doc(db, 'institutions', selectedInstitutionId, 'api_keys', keyId)
    
    updateDocumentNonBlocking(docRef, {
      secret: newSecret,
      updatedAt: serverTimestamp()
    })

    logSystemEvent(
      db, 
      selectedInstitutionId, 
      user, 
      'API', 
      'Key Rotated', 
      `Credentials for '${keyName}' were rolled.`
    )

    toast({ title: "Key Secret Rotated" })
  }

  const handleRevokeKey = (keyId: string, keyName: string) => {
    if (!selectedInstitutionId) return
    
    const docRef = doc(db, 'institutions', selectedInstitutionId, 'api_keys', keyId)
    updateDocumentNonBlocking(docRef, { status: 'Revoked', updatedAt: serverTimestamp() })

    logSystemEvent(
      db, 
      selectedInstitutionId, 
      user, 
      'API', 
      'Key Revoked', 
      `API key '${keyName}' access was terminated.`
    )

    toast({ variant: "destructive", title: "Key Revoked" })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied to clipboard" })
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-primary/20 text-primary">
              <Key className="size-5" />
            </div>
            <h1 className="text-2xl font-headline font-bold">API Management</h1>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-9 text-xs" disabled={!selectedInstitutionId}>
                  <Plus className="size-4" /> Generate Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <form onSubmit={handleCreateKey}>
                  <DialogHeader>
                    <DialogTitle>New API Access Key</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 text-xs">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Identifier Name</Label>
                      <Input id="name" name="name" placeholder="e.g. Mobile POS Hub" required className="h-9" />
                    </div>
                    <div className="space-y-3">
                      <Label>Authorized Scopes</Label>
                      <div className="grid grid-cols-1 gap-2 p-3 bg-secondary/20 rounded-lg border">
                        {SCOPES.map(scope => (
                          <div key={scope.id} className="flex items-center gap-2">
                            <Checkbox 
                              id={scope.id} 
                              checked={selectedScopes.includes(scope.id)}
                              onCheckedChange={(checked) => {
                                setSelectedScopes(prev => checked ? [...prev, scope.id] : prev.filter(id => id !== scope.id))
                              }}
                            />
                            <Label htmlFor={scope.id} className="text-[10px] uppercase font-bold text-muted-foreground">{scope.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full">Initialize Credentials</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Lock className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Choose an institution to manage its integration hub.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="size-8 animate-spin text-primary opacity-20" />
              </div>
            ) : keys?.length === 0 ? (
              <Card className="border-none ring-1 ring-border shadow bg-card/50">
                <CardContent className="py-16 text-center text-muted-foreground space-y-2">
                  <Globe className="size-10 mx-auto opacity-10" />
                  <p className="text-xs uppercase font-bold tracking-widest">No active integrations found.</p>
                </CardContent>
              </Card>
            ) : keys?.map((k) => (
              <Card key={k.id} className={`border-none ring-1 ring-border shadow-sm hover:ring-primary/30 transition-all ${k.status === 'Revoked' ? 'opacity-60 grayscale' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Zap className={`size-4 ${k.status === 'Active' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h3 className="font-bold text-sm">{k.name}</h3>
                        <Badge variant={k.status === 'Active' ? 'secondary' : 'destructive'} className="text-[8px] h-4 px-1.5 font-bold uppercase tracking-tight">
                          {k.status === 'Active' ? <CheckCircle2 className="size-2 mr-1" /> : <XCircle className="size-2 mr-1" />}
                          {k.status}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Public Key (Identifier)</p>
                          <div className="flex items-center gap-2 bg-secondary/30 p-2 rounded border font-mono text-[10px]">
                            <span className="truncate max-w-[200px]">{k.key}</span>
                            <Button variant="ghost" size="icon" className="size-5 ml-auto text-muted-foreground hover:text-primary" onClick={() => copyToClipboard(k.key)}>
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </div>

                        {k.status === 'Active' && (
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Secret Key (Confidential)</p>
                            <div className="flex items-center gap-2 bg-secondary/10 p-2 rounded border border-dashed font-mono text-[10px]">
                              <span className="truncate max-w-[200px]">
                                {showSecretId === k.id ? k.secret : '••••••••••••••••••••••••••••••••'}
                              </span>
                              <div className="flex items-center gap-1 ml-auto">
                                <Button variant="ghost" size="icon" className="size-5 text-muted-foreground hover:text-primary" onClick={() => setShowSecretId(showSecretId === k.id ? null : k.id)}>
                                  {showSecretId === k.id ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="size-5 text-muted-foreground hover:text-primary" onClick={() => copyToClipboard(k.secret)}>
                                  <Copy className="size-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-between items-start lg:items-end gap-4 min-w-[240px]">
                      <div className="flex flex-wrap lg:justify-end gap-1.5">
                        {k.scopes?.map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[8px] h-4 px-1.5 bg-primary/5 border-primary/20 text-primary lowercase font-mono">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2 w-full">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-8 text-[10px] gap-1.5 font-bold uppercase bg-background"
                          disabled={k.status === 'Revoked'}
                          onClick={() => handleRollKey(k.id, k.name)}
                        >
                          <RefreshCw className="size-3" /> Roll
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 h-8 text-[10px] text-destructive gap-1.5 font-bold uppercase hover:bg-destructive/10"
                          disabled={k.status === 'Revoked'}
                          onClick={() => handleRevokeKey(k.id, k.name)}
                        >
                          <ShieldAlert className="size-3" /> Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
