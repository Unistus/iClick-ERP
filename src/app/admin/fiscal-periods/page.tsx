
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { CalendarDays, Plus, Lock, Unlock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function FiscalPeriods() {
  const db = useFirestore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const periodsQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'fiscal_periods'))
  }, [db, selectedInstitutionId])
  
  const { data: periods, isLoading } = useCollection(periodsQuery)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedInstitutionId) return

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      status: 'Open',
      institutionId: selectedInstitutionId,
      updatedAt: serverTimestamp(),
    }

    addDocumentNonBlocking(collection(db, 'institutions', selectedInstitutionId, 'fiscal_periods'), {
      ...data,
      createdAt: serverTimestamp(),
    })
    setIsCreateOpen(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold">Fiscal Periods</h1>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[180px] h-9 bg-card border-none ring-1 ring-border text-xs">
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
                  <Plus className="size-4" /> New Period
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>New Fiscal Period</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 text-xs">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Period Name</Label>
                      <Input id="name" name="name" placeholder="e.g. FY 2024" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input id="startDate" name="startDate" type="date" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input id="endDate" name="endDate" type="date" required />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Open Period</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-secondary/5">
            <CalendarDays className="size-10 text-muted-foreground opacity-20 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Select institution to manage cycles.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Period Name</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Date Range</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Status</TableHead>
                    <TableHead className="h-9 text-right text-[10px] uppercase font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs">Loading...</TableCell></TableRow>
                  ) : periods?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">No records.</TableCell></TableRow>
                  ) : periods?.map((p) => (
                    <TableRow key={p.id} className="h-11">
                      <TableCell className="font-bold text-xs flex items-center gap-2">
                        <CalendarDays className="size-3.5 text-accent" />
                        {p.name}
                      </TableCell>
                      <TableCell className="text-[11px] font-mono">{p.startDate} - {p.endDate}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'Open' ? 'secondary' : 'outline'} className={`text-[9px] h-4 ${p.status === 'Open' ? 'bg-emerald-500/10 text-emerald-500' : ''}`}>
                          {p.status === 'Open' ? <Unlock className="size-2.5 mr-1" /> : <Lock className="size-2.5 mr-1" />}
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-7 text-[10px] px-2">
                          Close Period
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
