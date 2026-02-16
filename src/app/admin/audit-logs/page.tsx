
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileClock, Search, User, Globe, Shield, Activity, RefreshCw } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { format } from "date-fns"

export default function AuditLogs() {
  const db = useFirestore()
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
  const [searchTerm, setSearchByTerm] = useState("")

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const logsQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(
      collection(db, 'institutions', selectedInstitutionId, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(100)
    )
  }, [db, selectedInstitutionId])
  
  const { data: logs, isLoading } = useCollection(logsQuery)

  const filteredLogs = logs?.filter(log => 
    log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.module?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const stats = [
    { label: "Total Events", value: logs?.length || 0, icon: FileClock, color: "text-primary" },
    { label: "Unique Users", value: new Set(logs?.map(l => l.userId)).size || 0, icon: User, color: "text-emerald-500" },
    { label: "Failures", value: logs?.filter(l => l.status === 'Failure').length || 0, icon: Shield, color: "text-destructive" },
    { label: "Real-time", value: "Active", icon: Activity, color: "text-accent" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold">Audit Trail</h1>
          <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
            <SelectTrigger className="w-full md:w-[220px] h-9 bg-card border-none ring-1 ring-border text-xs">
              <SelectValue placeholder="Select Institution" />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
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

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-secondary/5">
            <FileClock className="size-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to monitor live events.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl bg-card">
            <CardHeader className="py-3 px-4 border-b border-border/50">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Filter by user, action, or module..." 
                  className="pl-9 h-9 bg-secondary/20 border-none text-xs" 
                  value={searchTerm}
                  onChange={(e) => setSearchByTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-9 text-[10px] uppercase font-bold pl-4">Timestamp</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">User Identity</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Module</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Action / Details</TableHead>
                    <TableHead className="h-9 text-right text-[10px] uppercase font-bold pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <RefreshCw className="size-6 animate-spin mx-auto text-primary opacity-20 mb-2" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Listening for events...</span>
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground uppercase font-bold">No activity recorded yet.</TableCell></TableRow>
                  ) : filteredLogs.map((log) => (
                    <TableRow key={log.id} className="h-12 hover:bg-secondary/10 transition-colors border-b-border/30">
                      <TableCell className="text-[10px] font-mono text-muted-foreground pl-4">
                        {log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss dd/MM') : 'Pending...'}
                      </TableCell>
                      <TableCell className="font-bold text-[10px]">
                        <div className="flex flex-col">
                          <span>{log.userEmail?.split('@')[0]}</span>
                          <span className="text-[8px] font-normal opacity-50 truncate max-w-[120px]">{log.userEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] h-4 bg-primary/5 border-primary/20 text-primary">
                          {log.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px]">
                        <p className="font-bold leading-none mb-0.5">{log.action}</p>
                        <p className="text-[9px] text-muted-foreground truncate max-w-[200px]">{log.details}</p>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Badge variant={log.status === 'Success' ? 'secondary' : 'destructive'} className="text-[9px] h-4 font-bold">
                          {log.status === 'Success' ? 'OK' : 'FAIL'}
                        </Badge>
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
