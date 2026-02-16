
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Coins, Plus, Edit2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

export default function CurrenciesManagement() {
  const db = useFirestore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<any>(null)

  const curCollectionRef = useMemoFirebase(() => collection(db, 'currencies'), [db])
  const { data: currencies, isLoading } = useCollection(curCollectionRef)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      id: formData.get('code'),
      name: formData.get('name'),
      symbol: formData.get('symbol'),
      exchangeRateToBase: parseFloat(formData.get('rate') as string),
      isBaseCurrency: formData.get('isBase') === 'on',
      updatedAt: serverTimestamp(),
    }

    if (editingCurrency) {
      updateDocumentNonBlocking(doc(db, 'currencies', editingCurrency.id), data)
    } else {
      setDocumentNonBlocking(doc(db, 'currencies', data.id as string), {
        ...data,
        createdAt: serverTimestamp(),
      }, { merge: true })
    }
    setIsCreateOpen(false)
    setEditingCurrency(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-headline font-bold">Currencies</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 h-9 text-xs" onClick={() => setEditingCurrency(null)}>
                <Plus className="size-4" /> Add Currency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingCurrency ? 'Edit' : 'New'} Currency</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="code">ISO Code</Label>
                      <Input id="code" name="code" defaultValue={editingCurrency?.id} placeholder="e.g. USD" required disabled={!!editingCurrency} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="symbol">Symbol</Label>
                      <Input id="symbol" name="symbol" defaultValue={editingCurrency?.symbol} required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" defaultValue={editingCurrency?.name} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rate">Rate to Base</Label>
                    <Input id="rate" name="rate" type="number" step="0.0001" defaultValue={editingCurrency?.exchangeRateToBase} required />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch id="isBase" name="isBase" defaultChecked={editingCurrency?.isBaseCurrency} />
                    <Label htmlFor="isBase">Set as Base</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none ring-1 ring-border shadow-lg">
          <CardHeader className="py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 h-9 bg-secondary/20 border-none text-xs" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Code</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Name</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Symbol</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Rate</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Type</TableHead>
                  <TableHead className="h-9 text-right text-[10px] uppercase font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-xs">Loading...</TableCell></TableRow>
                ) : currencies?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">No records.</TableCell></TableRow>
                ) : currencies?.map((curr) => (
                  <TableRow key={curr.id} className="h-11">
                    <TableCell className="font-bold text-xs">{curr.id}</TableCell>
                    <TableCell className="text-[11px]">{curr.name}</TableCell>
                    <TableCell className="font-mono text-xs">{curr.symbol}</TableCell>
                    <TableCell className="font-mono text-xs">{curr.exchangeRateToBase}</TableCell>
                    <TableCell>
                      {curr.isBaseCurrency ? (
                        <Badge variant="secondary" className="text-[9px] h-4 bg-primary/10 text-primary">Base</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] h-4">Foreign</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                        setEditingCurrency(curr)
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
      </div>
    </DashboardLayout>
  )
}
