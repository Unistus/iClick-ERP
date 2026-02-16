
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
import { collection, doc, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Percent, Plus, Edit2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function TaxManagement() {
  const db = useFirestore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTax, setEditingTax] = useState<any>(null)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")

  const instCollectionRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instCollectionRef)

  const taxQuery = useMemoFirebase(() => {
    if (!selectedInstitutionId) return null
    return query(collection(db, 'institutions', selectedInstitutionId, 'tax_settings'))
  }, [db, selectedInstitutionId])
  
  const { data: taxSettings, isLoading } = useCollection(taxQuery)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedInstitutionId) return

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      rate: parseFloat(formData.get('rate') as string) / 100,
      type: formData.get('type'),
      countryCode: formData.get('countryCode'),
      institutionId: selectedInstitutionId,
      isActive: true,
      updatedAt: serverTimestamp(),
    }

    const taxColRef = collection(db, 'institutions', selectedInstitutionId, 'tax_settings')

    if (editingTax) {
      updateDocumentNonBlocking(doc(taxColRef, editingTax.id), data)
    } else {
      addDocumentNonBlocking(taxColRef, { ...data, createdAt: serverTimestamp() })
    }
    setIsCreateOpen(false)
    setEditingTax(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold">Tax Config</h1>
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
                <Button size="sm" className="gap-2 h-9 text-xs" disabled={!selectedInstitutionId} onClick={() => setEditingTax(null)}>
                  <Plus className="size-4" /> Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingTax ? 'Edit' : 'Add'} Tax</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Tax Name</Label>
                      <Input id="name" name="name" defaultValue={editingTax?.name} placeholder="e.g. VAT 16%" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="rate">Rate (%)</Label>
                        <Input id="rate" name="rate" type="number" step="0.01" defaultValue={editingTax ? editingTax.rate * 100 : ''} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Type</Label>
                        <Select name="type" defaultValue={editingTax?.type || "VAT"}>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VAT" className="text-xs">VAT</SelectItem>
                            <SelectItem value="SalesTax" className="text-xs">Sales Tax</SelectItem>
                            <SelectItem value="Withholding" className="text-xs">Withholding</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="countryCode">ISO Country Code</Label>
                      <Input id="countryCode" name="countryCode" defaultValue={editingTax?.countryCode || "KE"} required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-secondary/5">
            <Percent className="size-10 text-muted-foreground opacity-20 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Select institution to manage tax settings.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Tax Name</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Type</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Rate</TableHead>
                    <TableHead className="h-9 text-[10px] uppercase font-bold">Country</TableHead>
                    <TableHead className="h-9 text-right text-[10px] uppercase font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-xs">Loading...</TableCell></TableRow>
                  ) : taxSettings?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">No records found.</TableCell></TableRow>
                  ) : taxSettings?.map((tax) => (
                    <TableRow key={tax.id} className="h-11">
                      <TableCell className="font-bold text-xs flex items-center gap-2">
                        <Percent className="size-3.5 text-accent" />
                        {tax.name}
                      </TableCell>
                      <TableCell className="text-[11px]">{tax.type}</TableCell>
                      <TableCell className="font-mono text-xs font-bold">{(tax.rate * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-[11px]">{tax.countryCode}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                          setEditingTax(tax)
                          setIsCreateOpen(true)
                        }}>
                          <Edit2 className="size-3.5" />
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
