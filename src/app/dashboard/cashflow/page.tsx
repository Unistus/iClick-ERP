
'use client';

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Banknote,
  PiggyBank,
  RefreshCcw,
  Search
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const transactions = [
  { id: 1, date: "2023-10-24 14:20", type: "In", account: "POS Sales", amount: "45,000", status: "Cleared" },
  { id: 2, date: "2023-10-24 13:10", type: "Out", account: "Supplier: MedCo", amount: "12,000", status: "Pending" },
  { id: 3, date: "2023-10-24 11:45", type: "In", account: "Credit: Alpha Corp", amount: "125,000", status: "Cleared" },
  { id: 4, date: "2023-10-23 16:30", type: "Out", account: "Utilities (HQ)", amount: "8,500", status: "Cleared" },
]

export default function CashFlowOverview() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-headline font-bold text-foreground">Cash Flow Tracker</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Real-time Liquidity & Settlement</p>
          </div>
          <button className="flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold uppercase shadow-lg shadow-primary/20">
            <RefreshCcw className="size-3.5" /> Reconcile Ledger
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="py-3 px-4 bg-emerald-500/5 flex flex-row items-center justify-between border-b border-emerald-500/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Net Position</span>
              <Wallet className="size-3.5 text-emerald-500" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold font-headline">KES 2.4M</div>
              <div className="flex items-center gap-1.5 mt-1 text-emerald-500 font-bold text-[10px]">
                <ArrowUpRight className="size-3" /> +18.4% SURPLUS
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="py-3 px-4 bg-primary/5 flex flex-row items-center justify-between border-b border-primary/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Unsettled Receivables</span>
              <PiggyBank className="size-3.5 text-primary" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold font-headline">KES 842k</div>
              <div className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">12 Overdue Invoices</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="py-3 px-4 bg-destructive/5 flex flex-row items-center justify-between border-b border-destructive/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-destructive">Payables (30D)</span>
              <Banknote className="size-3.5 text-destructive" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold font-headline">KES 1.1M</div>
              <div className="text-[10px] text-destructive font-bold mt-1 uppercase">Payroll & Suppliers</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-none ring-1 ring-border shadow-xl">
          <CardHeader className="py-4 border-b border-border/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Recent Movement Stream</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input placeholder="Search ledger..." className="pl-8 h-8 text-[10px] bg-secondary/20 border-none" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/10">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between group hover:bg-secondary/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`size-8 rounded flex items-center justify-center ${tx.type === 'In' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                      {tx.type === 'In' ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold leading-none">{tx.account}</p>
                      <p className="text-[9px] text-muted-foreground font-mono mt-1 uppercase tracking-tight">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[11px] font-bold font-mono ${tx.type === 'In' ? 'text-emerald-500' : 'text-destructive'}`}>
                      {tx.type === 'In' ? '+' : '-'} KES {tx.amount}
                    </p>
                    <Badge variant="ghost" className="text-[8px] h-4 mt-1 font-bold bg-background/50 uppercase tracking-tighter">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
