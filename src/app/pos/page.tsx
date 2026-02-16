
"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
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
      <div className="flex flex-col h-full gap-3">
        <header className="flex flex-col md:flex-row items-center justify-between gap-3">
          <h1 className="text-2xl font-headline font-bold">iClick POS</h1>
          
          <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full md:w-auto">
            <TabsList className="bg-secondary/50 h-9">
              <TabsTrigger value="quick" className="gap-1.5 text-xs h-7 px-3">
                <ShoppingCart className="size-3.5" /> Quick
              </TabsTrigger>
              <TabsTrigger value="pharmacy" className="gap-1.5 text-xs h-7 px-3">
                <Stethoscope className="size-3.5" /> Pharmacy
              </TabsTrigger>
              <TabsTrigger value="restaurant" className="gap-1.5 text-xs h-7 px-3">
                <UtensilsCrossed className="size-3.5" /> Restaurant
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-10rem)]">
          {/* Product Grid */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search or scan..." className="pl-10 h-10 bg-card ring-1 ring-border/50 border-none text-sm" />
              </div>
              <Button size="icon" variant="secondary" className="h-10 w-10 shrink-0">
                <ScanLine className="size-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 custom-scrollbar">
              {products.map(p => (
                <Card 
                  key={p.id} 
                  className="group cursor-pointer hover:ring-1 hover:ring-primary transition-all bg-card border-none shadow"
                  onClick={() => addToCart(p)}
                >
                  <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                    <div className="size-12 rounded bg-primary/10 flex items-center justify-center text-primary">
                      {p.category === 'Pharmacy' ? <Stethoscope className="size-6" /> : p.category === 'Restaurant' ? <UtensilsCrossed className="size-6" /> : <Tag className="size-6" />}
                    </div>
                    <div className="min-h-[2.5rem]">
                      <h3 className="font-bold text-xs line-clamp-2 leading-tight">{p.name}</h3>
                      <p className="text-[9px] text-muted-foreground uppercase">{p.code}</p>
                    </div>
                    <p className="text-accent font-bold text-xs mt-auto">KES {p.price.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="w-full lg:w-[320px] flex flex-col bg-card rounded-lg ring-1 ring-border/50 overflow-hidden shadow-xl">
            <div className="px-4 py-2.5 border-b flex items-center justify-between bg-secondary/10">
              <h2 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                <ShoppingCart className="size-3.5 text-primary" /> Cart
              </h2>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">{cart.length}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 opacity-30">
                  <ShoppingCart className="size-10" />
                  <p className="text-[10px] uppercase font-bold tracking-tighter">Cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2 rounded bg-secondary/10">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-bold truncate leading-none mb-1">{item.product.name}</h4>
                      <p className="text-[9px] text-muted-foreground">KES {item.product.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon" className="size-5 h-5 w-5 rounded bg-secondary">
                        <Minus className="size-2.5" />
                      </Button>
                      <span className="text-[11px] font-bold w-3 text-center">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="size-5 h-5 w-5 rounded bg-secondary">
                        <Plus className="size-2.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="size-5 h-5 w-5 text-destructive hover:bg-destructive/10"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-secondary/30 border-t space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>KES {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">VAT (16%)</span>
                  <span>KES {tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border/20 pt-1">
                  <span className="uppercase text-[10px] pt-0.5">Total</span>
                  <span className="text-primary">KES {total.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="outline" className="gap-1.5 h-8 text-[10px] px-2">
                  <User className="size-3" /> Customer
                </Button>
                <Button variant="outline" className="gap-1.5 h-8 text-[10px] px-2">
                  <Tag className="size-3" /> Discounts
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <Button variant="outline" className="flex-col gap-1 h-12 bg-card p-0">
                  <Smartphone className="size-3.5 text-emerald-500" />
                  <span className="text-[8px] font-bold">M-PESA</span>
                </Button>
                <Button variant="outline" className="flex-col gap-1 h-12 bg-card p-0">
                  <CreditCard className="size-3.5 text-blue-500" />
                  <span className="text-[8px] font-bold">CARD</span>
                </Button>
                <Button variant="outline" className="flex-col gap-1 h-12 bg-card p-0">
                  <Banknote className="size-3.5 text-amber-500" />
                  <span className="text-[8px] font-bold">CASH</span>
                </Button>
              </div>

              <Button 
                className="w-full h-10 text-xs font-bold bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 uppercase tracking-widest"
                onClick={() => {
                  toast({ title: "Order Processed" })
                  setCart([])
                }}
              >
                Complete Sale
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
