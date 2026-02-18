"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Sparkles, 
  BrainCircuit, 
  RefreshCcw, 
  TrendingUp, 
  Lightbulb, 
  PackageSearch, 
  BarChart3, 
  Wallet, 
  Info,
  ChevronRight,
  AlertCircle,
  Zap,
  ArrowRight
} from "lucide-react"
import { aiFinancialInsights, type AiFinancialInsightsOutput } from "@/ai/flows/ai-financial-insights-flow"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, limit, orderBy, where } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { usePermittedInstitutions } from "@/hooks/use-permitted-institutions"

export default function AIInsightsPage() {
  const db = useFirestore()
  const [selectedInstId, setSelectedInstId] = useState<string>("")
  const [queryInput, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AiFinancialInsightsOutput | null>(null)

  // 1. Data Fetching: Permitted Institutions (Access Control)
  const { institutions, isLoading: instLoading } = usePermittedInstitutions();

  const salesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null
    return query(collection(db, 'institutions', selectedInstId, 'journal_entries'), orderBy('date', 'desc'), limit(20))
  }, [db, selectedInstId])
  const { data: recentTransactions } = useCollection(salesQuery)

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null
    return collection(db, 'institutions', selectedInstId, 'products')
  }, [db, selectedInstId])
  const { data: products } = useCollection(productsQuery)

  const coaQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null
    return collection(db, 'institutions', selectedInstId, 'coa')
  }, [db, selectedInstId])
  const { data: coa } = useCollection(coaQuery)

  const arQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null
    return query(collection(db, 'institutions', selectedInstId, 'invoices'), where('status', '!=', 'Paid'))
  }, [db, selectedInstId])
  const { data: openInvoices } = useCollection(arQuery)

  const apQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null
    return query(collection(db, 'institutions', selectedInstId, 'payables'), where('status', '!=', 'Paid'))
  }, [db, selectedInstId])
  const { data: openBills } = useCollection(apQuery)

  const runAnalysis = async () => {
    if (!selectedInstId) return
    setLoading(true)
    try {
      // 1. Build Sales Context
      const salesContext = recentTransactions?.map(t => ({
        ref: t.reference,
        desc: t.description,
        amount: t.items?.reduce((sum: number, i: any) => i.type === 'Debit' ? sum + i.amount : sum, 0)
      })) || []

      // 2. Build Inventory Context
      const inventoryContext = products?.map(p => ({
        name: p.name,
        stock: p.totalStock,
        reorder: p.reorderLevel,
        price: p.basePrice
      })) || []

      // 3. Build Ledger Context (Balances)
      const accountingContext = coa?.map(a => ({
        name: a.name,
        type: a.type,
        balance: a.balance
      })) || []

      // 4. Build Budget Context
      const budgetContext = coa?.filter(a => a.isTrackedForBudget).map(a => ({
        name: a.name,
        limit: a.monthlyLimit,
        actual: a.balance,
        pct: a.monthlyLimit ? (a.balance / a.monthlyLimit) * 100 : 0
      })) || []

      // 5. Build Aging Context
      const agingContext = {
        receivables: openInvoices?.length || 0,
        payables: openBills?.length || 0,
        totalDueFromCustomers: openInvoices?.reduce((sum, i) => sum + (i.balance || 0), 0) || 0,
        totalDueToSuppliers: openBills?.reduce((sum, b) => sum + (b.balance || 0), 0) || 0,
      }

      const res = await aiFinancialInsights({
        salesData: JSON.stringify(salesContext),
        inventoryData: JSON.stringify(inventoryContext),
        accountingData: JSON.stringify(accountingContext),
        budgetData: JSON.stringify(budgetContext),
        agingData: JSON.stringify(agingContext),
        userQuery: queryInput || "Identify hidden financial risks and suggest tactical re-allocation of capital."
      })
      setResults(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-primary/20 text-primary">
              <BrainCircuit className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">AI Strategist Hub</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Cross-Module Decision Support</p>
            </div>
          </div>

          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold">
              <SelectValue placeholder={instLoading ? "Polling Data..." : "Select Institution"} />
            </SelectTrigger>
            <SelectContent>
              {institutions?.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedInstId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5">
            <Sparkles className="size-16 text-muted-foreground opacity-10 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Select an institution to initialize the AI analysis engine.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Input Panel */}
            <Card className="lg:col-span-4 border-none bg-card ring-1 ring-border shadow-xl h-fit">
              <CardHeader className="pb-3 border-b bg-secondary/10">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Zap className="size-4 text-accent" /> Intelligence Query
                </CardTitle>
                <CardDescription className="text-[10px]">Deep-scan sales, debt, and budget cycles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Textarea 
                  placeholder="e.g., 'How can I optimize my cash position this week?' or 'Analyze the impact of my current debt aging on operations.'"
                  value={queryInput}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[120px] bg-secondary/5 border-none ring-1 ring-border text-xs leading-relaxed focus-visible:ring-primary"
                />
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 gap-2 h-11 text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/20"
                  disabled={loading}
                  onClick={runAnalysis}
                >
                  {loading ? (
                    <>
                      <RefreshCcw className="size-4 animate-spin" />
                      Synthesizing Data...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="size-4" />
                      Engage Strategist
                    </>
                  )}
                </Button>
                
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex gap-3 items-start">
                  <Info className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[9px] text-muted-foreground leading-tight uppercase font-bold">
                    The strategist parses current Aging Reports, live Budgets, and Ledger nodes automatically.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Results Panel */}
            <div className="lg:col-span-8 space-y-6">
              {loading && (
                <div className="space-y-6 py-12 flex flex-col items-center">
                  <div className="size-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin shadow-inner" />
                  <div className="text-center space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest animate-pulse">
                      Analyzing Debt Maturity & Budget Burn
                    </p>
                    <p className="text-[9px] text-muted-foreground/50 font-mono">Connecting to Google Gemini 2.5 Flash...</p>
                  </div>
                </div>
              )}

              {results && !loading && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {/* Executive Strategy Card */}
                  <Card className="bg-card border-none ring-1 ring-border shadow-2xl overflow-hidden">
                    <CardHeader className="bg-primary/10 border-b border-primary/20 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-primary text-white shadow-md">
                          <Lightbulb className="size-4" />
                        </div>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Strategic Directive</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="text-sm leading-relaxed font-medium text-foreground/90 border-l-2 border-primary pl-4 py-1 italic">
                        {results.answerToQuery}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary Grids */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20">
                      <CardHeader className="pb-2 border-b border-emerald-500/10">
                        <CardTitle className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2">
                          <TrendingUp className="size-3" /> Performance Trends
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 text-xs leading-relaxed opacity-80">
                        {results.summaryOfTrends}
                      </CardContent>
                    </Card>

                    <Card className="bg-accent/5 border-none ring-1 ring-accent/20">
                      <CardHeader className="pb-2 border-b border-accent/10">
                        <CardTitle className="text-[10px] font-black uppercase text-accent flex items-center gap-2">
                          <PackageSearch className="size-3" /> Inventory & Logic
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 text-xs leading-relaxed opacity-80">
                        {results.reorderRecommendations}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tactical Actions - THE ACTION KING HUB */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] px-2 flex items-center gap-2">
                      <Zap className="size-3 text-primary" /> Tactical Execution Plan
                    </h3>
                    <div className="grid gap-3">
                      {results.strategicActions?.map((action, idx) => (
                        <Card key={idx} className="bg-secondary/10 border-none ring-1 ring-border/50 hover:ring-primary/30 transition-all group">
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                                action.priority === 'High' ? 'bg-destructive/10 text-destructive' : 
                                action.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                              }`}>
                                <Zap className="size-5" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold">{action.title}</span>
                                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 uppercase font-bold bg-background/50 border-none ring-1 ring-border">
                                    {action.module}
                                  </Badge>
                                  {action.priority === 'High' && (
                                    <span className="animate-pulse size-1.5 rounded-full bg-destructive" />
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-tight">{action.description}</p>
                              </div>
                            </div>
                            <Link href={action.link}>
                              <Button size="sm" variant="ghost" className="h-8 text-[10px] font-bold uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                Execute <ArrowRight className="size-3" />
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!results && !loading && (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-6 text-center px-12">
                  <div className="size-24 rounded-3xl bg-secondary/20 flex items-center justify-center relative">
                    <BarChart3 className="size-10 text-muted-foreground opacity-20" />
                    <div className="absolute -top-2 -right-2 p-2 rounded-full bg-primary/10">
                      <Wallet className="size-4 text-primary" />
                    </div>
                  </div>
                  <div className="max-w-sm space-y-2">
                    <h3 className="font-bold text-lg">System-Wide Intelligence Active</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Select an institution and engaging the strategist to begin. The AI will cross-reference your cash reserves with outstanding debt and budget burn rates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
