
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  FileText,
  PieChart,
  DollarSign
} from "lucide-react"
import { Button } from "@/components/ui/button"

const ledgerEntries = [
  { id: 1, date: "2023-10-24 14:20", type: "Income", account: "POS Sales", description: "Batch ID #IK-8821", amount: "+45,000" },
  { id: 2, date: "2023-10-24 13:10", type: "Expense", account: "Petty Cash", description: "Office Supplies", amount: "-1,200" },
  { id: 3, date: "2023-10-24 11:45", type: "Income", account: "Credit Payment", description: "Customer: Alpha Ltd", amount: "+12,000" },
  { id: 4, date: "2023-10-23 16:30", type: "Expense", account: "Inventory", description: "Vendor: MedSupply Co", amount: "-85,000" },
]

export default function AccountingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-headline font-bold">Financial Suite</h1>
          <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2 h-9">
            <PieChart className="size-4" /> Generate Report
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Revenue</span>
              <DollarSign className="size-3 text-emerald-500" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-lg font-bold">KES 2.4M</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Expenses</span>
              <ArrowDownLeft className="size-3 text-destructive" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-lg font-bold">KES 1.1M</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Net Profit</span>
              <History className="size-3 text-primary" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-lg font-bold text-emerald-500">KES 1.3M</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="pb-1 pt-3 space-y-0 flex flex-row items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Tax Due</span>
              <FileText className="size-3 text-accent" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-lg font-bold">KES 384k</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card border-none ring-1 ring-border shadow-lg">
            <CardHeader className="py-3">
              <CardTitle className="text-lg font-headline">General Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ledgerEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded flex items-center justify-center ${
                        entry.type === 'Income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {entry.type === 'Income' ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-xs">{entry.account}</p>
                        <p className="text-[9px] text-muted-foreground">{entry.date}</p>
                      </div>
                    </div>
                    <p className={`font-mono font-bold text-xs ${
                      entry.type === 'Income' ? 'text-emerald-500' : 'text-destructive'
                    }`}>
                      {entry.amount}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-none ring-1 ring-border shadow-lg">
            <CardHeader className="py-3">
              <CardTitle className="text-lg font-headline">Chart of Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Current Assets", items: ["Cash on Hand", "Bank Accounts"], color: "text-emerald-500" },
                  { title: "Liabilities", items: ["Accounts Payable", "VAT Payable"], color: "text-destructive" },
                  { title: "Equity", items: ["Owner's Capital", "Retained Earnings"], color: "text-primary" },
                ].map((group) => (
                  <div key={group.title} className="space-y-1">
                    <h3 className={`text-[9px] font-bold uppercase tracking-widest ${group.color}`}>{group.title}</h3>
                    <div className="grid gap-1">
                      {group.items.map((item) => (
                        <div key={item} className="flex justify-between items-center px-2 py-1.5 rounded bg-secondary/20 text-[11px]">
                          <span>{item}</span>
                          <span className="font-mono text-muted-foreground opacity-50">100-20{group.items.indexOf(item)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
