
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  TrendingDown, 
  AlertTriangle, 
  RefreshCw, 
  Clock,
  ArrowRight,
  ShieldCheck
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function InventorySnapshot() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-headline font-bold">Inventory Snapshot</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">Real-time Stock Assets & Turnover</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card border-none ring-1 ring-border shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-primary/10 text-primary">
                  <Package className="size-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">Active SKUs</p>
                  <p className="text-lg font-bold">14,204</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 text-destructive">
                <div className="p-2 rounded bg-destructive/10">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase opacity-70">Out of Stock</p>
                  <p className="text-lg font-bold">42</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 text-amber-500">
                <div className="p-2 rounded bg-amber-500/10">
                  <Clock className="size-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase opacity-70">Low Re-order</p>
                  <p className="text-lg font-bold">156</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 text-emerald-500">
                <div className="p-2 rounded bg-emerald-500/10">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase opacity-70">Healthy Stock</p>
                  <p className="text-lg font-bold">98.4%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card border-none ring-1 ring-border shadow-xl">
            <CardHeader className="py-4 border-b border-border/10 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Fast Moving Consumables</CardTitle>
              <Badge variant="outline" className="text-[8px] h-4">TOP 5</Badge>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {[
                { name: "Paracetamol 500mg", turnover: 85, value: "KES 420k" },
                { name: "Surgical Masks", turnover: 72, value: "KES 180k" },
                { name: "Hand Sanitizer (50ml)", turnover: 64, value: "KES 92k" },
                { name: "Zinc Effervescent", turnover: 58, value: "KES 115k" },
                { name: "Amoxicillin 250mg", turnover: 45, value: "KES 340k" },
              ].map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>{item.name}</span>
                    <span className="text-primary">{item.value}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={item.turnover} className="h-1.5 bg-secondary" />
                    <span className="text-[9px] font-mono text-muted-foreground w-10 text-right">{item.turnover}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-none ring-1 ring-border shadow-xl">
            <CardHeader className="py-4 border-b border-border/10">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-destructive">Dead Stock Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/10">
                {[
                  { name: "Vintage Stethoscope", lastSale: "184 days ago", loss: "KES 12,000" },
                  { name: "Specialized Ortho-Brace", lastSale: "92 days ago", loss: "KES 45,000" },
                  { name: "Trial Lab Kits", lastSale: "75 days ago", loss: "KES 8,000" },
                  { name: "Rare Chem Reagents", lastSale: "210 days ago", loss: "KES 64,000" },
                ].map((item) => (
                  <div key={item.name} className="p-4 flex items-center justify-between hover:bg-secondary/5 transition-colors">
                    <div>
                      <p className="text-[11px] font-bold">{item.name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase flex items-center gap-1 mt-0.5">
                        <Clock className="size-2.5" /> No activity for {item.lastSale}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-destructive">{item.loss}</p>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground opacity-50">Stagnant Value</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-secondary/10 border-t border-border/10">
                <button className="text-[10px] font-bold uppercase text-primary flex items-center gap-2 hover:gap-3 transition-all">
                  Generate Liquidation Report <ArrowRight className="size-3" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
