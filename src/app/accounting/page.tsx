
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Calculator, 
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-headline font-bold">Financial Suite</h1>
            <p className="text-muted-foreground">Automated Double-entry Ledger Management.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 gap-2">
            <PieChart className="size-4" /> Generate Report
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-500" /> Total Revenue
              </CardDescription>
              <CardTitle className="text-2xl font-bold">KES 2.4M</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ArrowDownLeft className="size-4 text-destructive" /> Expenses
              </CardDescription>
              <CardTitle className="text-2xl font-bold">KES 1.1M</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <History className="size-4 text-primary" /> Net Profit
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-500">KES 1.3M</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="size-4 text-accent" /> Tax Due (VAT)
              </CardDescription>
              <CardTitle className="text-2xl font-bold">KES 384k</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-card border-none ring-1 ring-border shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">General Ledger</CardTitle>
              <CardDescription>Real-time journal entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ledgerEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-lg flex items-center justify-center ${
                        entry.type === 'Income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {entry.type === 'Income' ? <ArrowUpRight className="size-5" /> : <ArrowDownLeft className="size-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{entry.account}</p>
                        <p className="text-xs text-muted-foreground">{entry.description} • {entry.date}</p>
                      </div>
                    </div>
                    <p className={`font-mono font-bold ${
                      entry.type === 'Income' ? 'text-emerald-500' : 'text-destructive'
                    }`}>
                      KES {entry.amount}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-none ring-1 ring-border shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Chart of Accounts</CardTitle>
              <CardDescription>Hierarchical financial structure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { title: "Current Assets", items: ["Cash on Hand", "Bank Accounts", "Accounts Receivable"], color: "text-emerald-500" },
                  { title: "Liabilities", items: ["Accounts Payable", "Short-term Loans", "VAT Payable"], color: "text-destructive" },
                  { title: "Equity", items: ["Owner's Capital", "Retained Earnings"], color: "text-primary" },
                ].map((group) => (
                  <div key={group.title} className="space-y-2">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${group.color}`}>{group.title}</h3>
                    <div className="grid gap-2">
                      {group.items.map((item) => (
                        <div key={item} className="flex justify-between items-center p-2 rounded-lg bg-secondary/20 text-sm">
                          <span>{item}</span>
                          <span className="font-mono text-muted-foreground">100-20{group.items.indexOf(item)}</span>
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
