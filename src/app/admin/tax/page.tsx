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
import { Percent, Plus, Edit2, Search, CheckCircle } from "lucide-react"
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
  
  const { data: taxSettings, isLoading: isTaxLoading } = useCollection(taxQuery)

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
      addDocumentNonBlocking(taxColRef, {
        ...data,
        createdAt: serverTimestamp(),
      })
    }
    setIsCreateOpen(false)
    setEditingTax(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Tax Configuration</h1>
            <p className="text-muted-foreground">Manage VAT, Sales Tax, and withholding tax rules.</p>
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
                <Button className="gap-2 h-11" disabled={!selectedInstitutionId} onClick={() => setEditingTax(null)}>
                  <Plus className="size-4" /> New Tax Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingTax ? 'Edit' : 'Add'} Tax Setting</DialogTitle>
                    <DialogDescription>
                      Configure tax rules for {institutions?.find(i => i.id === selectedInstitutionId)?.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="tax-name">Tax Name</Label>
                      <Input id="tax-name" name="name" defaultValue={editingTax?.name} placeholder="e.g. VAT 16%" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="rate">Rate (%)</Label>
                        <Input id="rate" name="rate" type="number" step="0.01" defaultValue={editingTax ? editingTax.rate * 100 : ''} placeholder="16" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Tax Type</Label>
                        <Select name="type" defaultValue={editingTax?.type || "VAT"}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VAT">VAT</SelectItem>
                            <SelectItem value="SalesTax">Sales Tax</SelectItem>
                            <SelectItem value="Withholding">Withholding</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="countryCode">ISO Country Code</Label>
                      <Input id="countryCode" name="countryCode" defaultValue={editingTax?.countryCode || "KE"} placeholder="KE" required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save Configuration</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-secondary/10">
            <Percent className="size-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium">Please select an institution to manage tax settings.</p>
          </div>
        ) : (
          <Card className="border-none ring-1 ring-border shadow-xl">
            <CardHeader>
              <CardTitle>Tax Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isTaxLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading tax settings...</TableCell></TableRow>
                  ) : taxSettings?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tax rules defined.</TableCell></TableRow>
                  ) : taxSettings?.map((tax) => (
                    <TableRow key={tax.id}>
                      <TableCell className="font-bold flex items-center gap-3">
                        <div className="size-8 rounded bg-accent/10 text-accent flex items-center justify-center">
                          <Percent className="size-4" />
                        </div>
                        {tax.name}
                      </TableCell>
                      <TableCell>{tax.type}</TableCell>
                      <TableCell className="font-mono font-bold">{(tax.rate * 100).toFixed(1)}%</TableCell>
                      <TableCell>{tax.countryCode}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingTax(tax)
                          setIsCreateOpen(true)
                        }}>
                          <Edit2 className="size-4" />
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
