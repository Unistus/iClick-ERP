
"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  ShoppingCart, 
  User, 
  Plus, 
  Minus, 
  Trash2, 
  ScanLine, 
  Stethoscope,
  UtensilsCrossed,
  Tag,
  CreditCard,
  Smartphone,
  Banknote
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

const products = [
  { id: 1, name: "Paracetamol 500mg", price: 450, category: "Pharmacy", code: "PH-001" },
  { id: 2, name: "Amoxicillin 250mg", price: 1200, category: "Pharmacy", code: "PH-002" },
  { id: 3, name: "Cough Syrup", price: 350, category: "Pharmacy", code: "PH-003" },
  { id: 4, name: "Chicken Burger", price: 650, category: "Restaurant", code: "FD-001" },
  { id: 5, name: "French Fries", price: 250, category: "Restaurant", code: "FD-002" },
  { id: 6, name: "Coca Cola 500ml", price: 100, category: "Drinks", code: "DR-001" },
]

export default function POSPage() {
  const [cart, setCart] = useState<{product: typeof products[0], qty: number}[]>([])
  const [mode, setMode] = useState<"quick" | "pharmacy" | "restaurant">("quick")

  const addToCart = (product: typeof products[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      }
      return [...prev, { product, qty: 1 }]
    })
  }

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.product.id !== id))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0)
  const tax = subtotal * 0.16
  const total = subtotal + tax

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full gap-4">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-headline font-bold">iClick POS</h1>
            <p className="text-sm text-muted-foreground">Session: Cashier #01-A (Active)</p>
          </div>
          
          <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full md:w-auto">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="quick" className="gap-2">
                <ShoppingCart className="size-4" /> Quick
              </TabsTrigger>
              <TabsTrigger value="pharmacy" className="gap-2">
                <Stethoscope className="size-4" /> Pharmacy
              </TabsTrigger>
              <TabsTrigger value="restaurant" className="gap-2">
                <UtensilsCrossed className="size-4" /> Restaurant
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-14rem)]">
          {/* Product Grid */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search item or scan barcode..." className="pl-10 h-12 bg-card ring-1 ring-border/50 border-none" />
              </div>
              <Button size="icon" variant="secondary" className="h-12 w-12 shrink-0">
                <ScanLine className="size-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2">
              {products.map(p => (
                <Card 
                  key={p.id} 
                  className="group cursor-pointer hover:ring-2 hover:ring-primary transition-all bg-card border-none shadow-md"
                  onClick={() => addToCart(p)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      {p.category === 'Pharmacy' ? <Stethoscope /> : p.category === 'Restaurant' ? <UtensilsCrossed /> : <Tag />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm line-clamp-1">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{p.code}</p>
                    </div>
                    <p className="text-accent font-bold mt-auto">KES {p.price.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="w-full lg:w-[400px] flex flex-col bg-card rounded-xl ring-1 ring-border/50 overflow-hidden shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <ShoppingCart className="size-5 text-primary" /> Current Cart
              </h2>
              <Badge variant="outline" className="font-mono">{cart.length} Items</Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <ShoppingCart className="size-12 opacity-20" />
                  <p>Cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{item.product.name}</h4>
                      <p className="text-xs text-muted-foreground">KES {item.product.price.toLocaleString()} / unit</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="size-7 h-7 w-7 rounded-full bg-secondary">
                        <Minus className="size-3" />
                      </Button>
                      <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="size-7 h-7 w-7 rounded-full bg-secondary">
                        <Plus className="size-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="size-7 h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-secondary/30 border-t space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>KES {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (16%)</span>
                <span>KES {tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Amount</span>
                <span className="text-primary">KES {total.toLocaleString()}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="gap-2 h-12">
                  <User className="size-4" /> Customer
                </Button>
                <Button variant="outline" className="gap-2 h-12">
                  <Tag className="size-4" /> Discounts
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="flex-col gap-1 h-16 bg-card">
                  <Smartphone className="size-4 text-emerald-500" />
                  <span className="text-[10px]">M-PESA</span>
                </Button>
                <Button variant="outline" className="flex-col gap-1 h-16 bg-card">
                  <CreditCard className="size-4 text-blue-500" />
                  <span className="text-[10px]">CARD</span>
                </Button>
                <Button variant="outline" className="flex-col gap-1 h-16 bg-card">
                  <Banknote className="size-4 text-amber-500" />
                  <span className="text-[10px]">CASH</span>
                </Button>
              </div>

              <Button 
                className="w-full h-14 text-lg font-bold bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20"
                onClick={() => {
                  toast({ title: "Order Processed", description: "Payment recorded successfully." })
                  setCart([])
                }}
              >
                COMPLETE SALE
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
