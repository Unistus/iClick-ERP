
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FileClock, Search, User, Globe, Shield } from "lucide-react"

const mockLogs = [
  { id: 1, user: "admin@iclick.co.ke", action: "Institution Created", module: "ADMIN", ip: "192.168.1.1", time: "2023-10-24 14:20:00", status: "Success" },
  { id: 2, user: "manager@branch.com", action: "Role Modified", module: "RBAC", ip: "10.0.0.45", time: "2023-10-24 13:10:00", status: "Success" },
  { id: 3, user: "cashier@pos.com", action: "POS Login", module: "AUTH", ip: "172.16.0.12", time: "2023-10-24 08:45:00", status: "Success" },
]

export default function AuditLogs() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-headline font-bold">Audit Trail</h1>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Events", value: "1,204", icon: FileClock, color: "text-primary" },
            { label: "Users", value: "48", icon: User, color: "text-emerald-500" },
            { label: "Alerts", value: "2", icon: Shield, color: "text-destructive" },
            { label: "Nodes", value: "5", icon: Globe, color: "text-accent" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-none ring-1 ring-border shadow-sm">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold mt-0.5">{stat.value}</p>
                  </div>
                  <stat.icon className={`size-5 ${stat.color} opacity-30`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none ring-1 ring-border shadow-xl">
          <CardHeader className="py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search logs..." className="pl-9 h-9 bg-secondary/20 border-none text-xs" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Time</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">User</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Module</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Action</TableHead>
                  <TableHead className="h-9 text-right text-[10px] uppercase font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLogs.map((log) => (
                  <TableRow key={log.id} className="h-10">
                    <TableCell className="text-[10px] font-mono text-muted-foreground">{log.time}</TableCell>
                    <TableCell className="font-medium text-[10px]">{log.user}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] h-4">{log.module}</Badge></TableCell>
                    <TableCell className="text-[11px]">{log.action}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={log.status === 'Success' ? 'secondary' : 'destructive'} className="text-[9px] h-4">
                        {log.status}
                      </Badge>
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
