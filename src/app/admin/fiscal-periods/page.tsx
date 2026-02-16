
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { CalendarDays, Plus, Lock, Unlock, Search } from "lucide-react"
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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Fiscal Periods</h1>
            <p className="text-muted-foreground">Manage financial years and period closing for automated accounting.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="w-[200px] h-11 bg-card border-none ring-1 ring-border">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-11" disabled={!selectedInstitutionId}>
                  <Plus className="size-4" /> New Period
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>New Fiscal Period</DialogTitle>
                    <DialogDescription>Define a new financial reporting period.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
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
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-secondary/10">
            <CalendarDays className="size-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium">Select an institution to manage fiscal cycles.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl">
            <CardHeader>
              <CardTitle>Financial Periods</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period Name</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : periods?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No fiscal periods defined.</TableCell></TableRow>
                  ) : periods?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold flex items-center gap-3">
                        <div className="size-8 rounded bg-accent/10 text-accent flex items-center justify-center">
                          <CalendarDays className="size-4" />
                        </div>
                        {p.name}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{p.startDate} to {p.endDate}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'Open' ? 'secondary' : 'outline'} className={p.status === 'Open' ? 'bg-emerald-500/10 text-emerald-500' : ''}>
                          {p.status === 'Open' ? <Unlock className="size-3 mr-1" /> : <Lock className="size-3 mr-1" />}
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Lock className="size-3" /> Close Period
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
