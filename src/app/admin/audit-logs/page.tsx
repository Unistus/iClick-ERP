
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FileClock, Search, User, Globe, Shield } from "lucide-react"

const mockLogs = [
  { id: 1, user: "admin@iclick.co.ke", action: "Institution Created", module: "ADMIN", ip: "192.168.1.1", time: "2023-10-24 14:20:00", status: "Success" },
  { id: 2, user: "manager@branch.com", action: "Role Modified", module: "RBAC", ip: "10.0.0.45", time: "2023-10-24 13:10:00", status: "Success" },
  { id: 3, user: "cashier@pos.com", action: "POS Login", module: "AUTH", ip: "172.16.0.12", time: "2023-10-24 08:45:00", status: "Success" },
  { id: 4, user: "unknown", action: "Failed Login Attempt", module: "AUTH", ip: "45.12.33.2", time: "2023-10-23 23:55:00", status: "Failure" },
]

export default function AuditLogs() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-headline font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">Traceability and security monitoring for system-wide actions.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {[
            { label: "Today's Events", value: "1,204", icon: FileClock, color: "text-primary" },
            { label: "Active Users", value: "48", icon: User, color: "text-emerald-500" },
            { label: "Security Alerts", value: "2", icon: Shield, color: "text-destructive" },
            { label: "Global Locations", value: "5", icon: Globe, color: "text-accent" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-none ring-1 ring-border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`size-8 ${stat.color} opacity-20`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none ring-1 ring-border shadow-xl">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search logs by user, action or module..." className="pl-10 h-11 bg-secondary/20 border-none" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono">{log.time}</TableCell>
                    <TableCell className="font-medium text-xs">{log.user}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{log.module}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ip}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'Success' ? 'secondary' : 'destructive'} className="text-[10px]">
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
