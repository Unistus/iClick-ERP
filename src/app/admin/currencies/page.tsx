
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Coins, Plus, Edit2, Search, CheckCircle, XCircle } from "lucide-react"
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
      id: formData.get('code'), // ID used as code e.g. USD
      name: formData.get('name'),
      symbol: formData.get('symbol'),
      exchangeRateToBase: parseFloat(formData.get('rate') as string),
      isBaseCurrency: formData.get('isBase') === 'on',
      updatedAt: serverTimestamp(),
    }

    if (editingCurrency) {
      updateDocumentNonBlocking(doc(db, 'currencies', editingCurrency.id), data)
    } else {
      // Use setDoc for currencies because ID is the code
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-headline font-bold">Currencies</h1>
            <p className="text-muted-foreground">Manage multi-currency exchange rates and base configuration.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEditingCurrency(null)}>
                <Plus className="size-4" /> Add Currency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingCurrency ? 'Edit' : 'New'} Currency</DialogTitle>
                  <DialogDescription>
                    Configure currency code and its exchange rate relative to system base.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="code">Currency Code (ISO)</Label>
                      <Input id="code" name="code" defaultValue={editingCurrency?.id} placeholder="e.g. USD, KES" required disabled={!!editingCurrency} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="symbol">Symbol</Label>
                      <Input id="symbol" name="symbol" defaultValue={editingCurrency?.symbol} placeholder="e.g. $, KSh" required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Currency Name</Label>
                    <Input id="name" name="name" defaultValue={editingCurrency?.name} placeholder="e.g. US Dollar" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rate">Exchange Rate (to Base)</Label>
                    <Input id="rate" name="rate" type="number" step="0.0001" defaultValue={editingCurrency?.exchangeRateToBase} placeholder="1.0" required />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch id="isBase" name="isBase" defaultChecked={editingCurrency?.isBaseCurrency} />
                    <Label htmlFor="isBase">Set as Base Currency</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Currency</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none ring-1 ring-border shadow-lg">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search currencies..." className="pl-10 h-11 bg-secondary/20 border-none" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Rate to Base</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : currencies?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No currencies configured.</TableCell></TableRow>
                ) : currencies?.map((curr) => (
                  <TableRow key={curr.id}>
                    <TableCell className="font-bold">{curr.id}</TableCell>
                    <TableCell>{curr.name}</TableCell>
                    <TableCell className="font-mono">{curr.symbol}</TableCell>
                    <TableCell className="font-mono">{curr.exchangeRateToBase}</TableCell>
                    <TableCell>
                      {curr.isBaseCurrency ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">Base Currency</Badge>
                      ) : (
                        <Badge variant="outline">Foreign</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingCurrency(curr)
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
      </div>
    </DashboardLayout>
  )
}
