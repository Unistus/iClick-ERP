
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Key, Plus, Copy, RefreshCw, ShieldAlert, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function APIManagement() {
  const keys = [
    { name: "Public POS Interface", key: "pk_live_51...f9a2", scopes: "pos:write, products:read", status: "Active" },
    { name: "Mobile App Integration", key: "pk_live_51...x7b8", scopes: "crm:read, sales:read", status: "Active" },
    { name: "Accounting Export", key: "pk_live_51...j2m1", scopes: "ledger:read", status: "Revoked" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-headline font-bold">API Management</h1>
            <p className="text-muted-foreground">Secure your integrations with granular API keys and scopes.</p>
          </div>
          <Button className="gap-2 h-11">
            <Plus className="size-4" /> Create API Key
          </Button>
        </div>

        <div className="grid gap-6">
          {keys.map((k) => (
            <Card key={k.name} className="border-none ring-1 ring-border shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{k.name}</h3>
                      <Badge variant={k.status === 'Active' ? 'secondary' : 'destructive'} className="text-[10px]">
                        {k.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary/30 p-2 rounded">
                      <Zap className="size-3 text-primary" />
                      {k.key}
                      <Button variant="ghost" size="icon" className="size-6 ml-auto"><Copy className="size-3" /></Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 max-w-md">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Scopes</p>
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.split(', ').map(s => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-2">
                      <RefreshCw className="size-4" /> Roll Key
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive gap-2 hover:bg-destructive/10">
                      <ShieldAlert className="size-4" /> Revoke
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
