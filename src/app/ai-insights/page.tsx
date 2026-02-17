
"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, BrainCircuit, RefreshCcw, TrendingUp, Lightbulb, PackageSearch, BarChart3, Wallet, Info } from "lucide-react"
import { aiFinancialInsights, type AiFinancialInsightsOutput } from "@/ai/flows/ai-financial-insights-flow"
import { Progress } from "@/components/ui/progress"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, limit, orderBy } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AIInsightsPage() {
  const db = useFirestore()
  const [selectedInstId, setSelectedInstId] = useState<string>("")
  const [queryInput, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AiFinancialInsightsOutput | null>(null)

  // Data Fetching
  const instColRef = useMemoFirebase(() => collection(db, 'institutions'), [db])
  const { data: institutions } = useCollection(instColRef)

  const salesQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null
    return query(collection(db, 'institutions', selectedInstId, 'journal_entries'), orderBy('date', 'desc'), limit(20))
  }, [db, selectedInstId])
  const { data: recentTransactions } = useCollection(salesQuery)

  const productsQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null
    return collection(db, 'institutions', selectedInstId, 'inventory', 'products')
  }, [db, selectedInstId])
  const { data: products } = useCollection(productsQuery)

  const coaQuery = useMemoFirebase(() => {
    if (!selectedInstId) return null
    return collection(db, 'institutions', selectedInstId, 'coa')
  }, [db, selectedInstId])
  const { data: coa } = useCollection(coaQuery)

  const runAnalysis = async () => {
    if (!selectedInstId) return
    setLoading(true)
    try {
      // Aggregate real system data
      const salesContext = recentTransactions?.map(t => ({
        ref: t.reference,
        desc: t.description,
        amount: t.items?.reduce((sum: number, i: any) => i.type === 'Debit' ? sum + i.amount : sum, 0)
      })) || []

      const inventoryContext = products?.map(p => ({
        name: p.name,
        stock: p.totalStock,
        reorder: p.reorderLevel,
        price: p.basePrice
      })) || []

      const accountingContext = coa?.map(a => ({
        name: a.name,
        type: a.type,
        balance: a.balance
      })) || []

      const res = await aiFinancialInsights({
        salesData: JSON.stringify(salesContext),
        inventoryData: JSON.stringify(inventoryContext),
        accountingData: JSON.stringify(accountingContext),
        userQuery: queryInput || "Analyze current system-wide health and suggest 3 strategic actions."
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-primary/20 text-primary">
              <BrainCircuit className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">AI Business Strategist</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">System-Wide Intelligence Layer</p>
            </div>
          </div>

          <Select value={selectedInstId} onValueChange={setSelectedInstId}>
            <SelectTrigger className="w-[240px] h-10 bg-card border-none ring-1 ring-border text-xs font-bold">
              <SelectValue placeholder="Select Data Context" />
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" /> Strategist Input
                </CardTitle>
                <CardDescription className="text-[10px]">Ask specific questions about sales, inventory, or margins.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder="e.g., Why is my cash flow tightening despite high sales? or Predict stock needs for next month."
                  value={queryInput}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[150px] bg-secondary/10 border-none ring-1 ring-border text-xs leading-relaxed"
                />
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 gap-2 h-11 text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/20"
                  disabled={loading}
                  onClick={runAnalysis}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      Analyzing Live Data...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="size-4" />
                      Run Analysis
                    </>
                  )}
                </Button>
                
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex gap-3 items-start">
                  <Info className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    The strategist automatically scans recent sales, stock levels, and ledger health before answering.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Results Panel */}
            <div className="lg:col-span-8 space-y-6">
              {loading && (
                <div className="space-y-4 py-12 flex flex-col items-center">
                  <div className="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <p className="text-[10px] text-center text-muted-foreground uppercase font-black tracking-widest animate-pulse">
                    Parsing System Metrics & Identifying Trends
                  </p>
                </div>
              )}

              {results && !loading && (
                <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-emerald-500/5 border-none ring-1 ring-emerald-500/20 relative overflow-hidden">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Trend Synthesis</CardTitle>
                        <TrendingUp className="size-4 text-emerald-500" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs leading-relaxed text-foreground/80">{results.summaryOfTrends}</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-accent/5 border-none ring-1 ring-accent/20 relative overflow-hidden">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-black uppercase text-accent tracking-widest">Re-order & Logistics</CardTitle>
                        <PackageSearch className="size-4 text-accent" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs leading-relaxed text-foreground/80">{results.reorderRecommendations}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-card border-none ring-1 ring-border shadow-2xl overflow-hidden">
                    <CardHeader className="bg-secondary/20 border-b border-border/50 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-primary text-white shadow-md">
                          <Lightbulb className="size-4" />
                        </div>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest">Strategic Recommendation</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="p-6 rounded-2xl bg-secondary/10 text-base leading-relaxed italic border-l-4 border-primary relative">
                        <span className="absolute -top-4 -left-2 text-6xl text-primary/10 font-serif">"</span>
                        {results.answerToQuery}
                        <span className="absolute -bottom-10 -right-2 text-6xl text-primary/10 font-serif rotate-180">"</span>
                      </div>
                    </CardContent>
                    <div className="px-6 py-4 bg-secondary/5 border-t border-border/30 flex justify-between items-center">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Generated via Google Gemini 2.5 Flash</p>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-primary">
                        Apply to Workflow
                      </Button>
                    </div>
                  </Card>
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
                    <h3 className="font-bold text-lg">System-Wide Intelligence</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Click the analysis button to process institutional data. The strategist identifies anomalies in sales cycles, inventory turnover, and fiscal health.
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
