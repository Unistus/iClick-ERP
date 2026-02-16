
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Copy, RefreshCw, ShieldAlert, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function APIManagement() {
  const keys = [
    { name: "Public POS Interface", key: "pk_live_51...f9a2", scopes: "pos:write, products:read", status: "Active" },
    { name: "Mobile App", key: "pk_live_51...x7b8", scopes: "crm:read, sales:read", status: "Active" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-headline font-bold">API Management</h1>
          <Button size="sm" className="gap-2 h-9 text-xs">
            <Plus className="size-4" /> Create Key
          </Button>
        </div>

        <div className="grid gap-3">
          {keys.map((k) => (
            <Card key={k.name} className="border-none ring-1 ring-border shadow-sm hover:ring-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs">{k.name}</h3>
                      <Badge variant={k.status === 'Active' ? 'secondary' : 'destructive'} className="text-[8px] h-3.5 px-1">
                        {k.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground bg-secondary/30 p-1.5 rounded">
                      <Zap className="size-3 text-primary" />
                      {k.key}
                      <Button variant="ghost" size="icon" className="size-5 ml-auto"><Copy className="size-2.5" /></Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.split(', ').map(s => (
                        <Badge key={s} variant="outline" className="text-[8px] h-3.5 px-1">{s}</Badge>
                      ))}
                    </div>
                    <div className="h-6 w-px bg-border/50 mx-1" />
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2">
                      <RefreshCw className="size-3" /> Roll
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive gap-1 px-2 hover:bg-destructive/10">
                      <ShieldAlert className="size-3" /> Revoke
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
