
"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, BrainCircuit, RefreshCcw, TrendingUp, Lightbulb, PackageSearch } from "lucide-react"
import { aiFinancialInsights, type AiFinancialInsightsOutput } from "@/ai/flows/ai-financial-insights-flow"
import { Progress } from "@/components/ui/progress"

export default function AIInsightsPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AiFinancialInsightsOutput | null>(null)

  const runAnalysis = async () => {
    setLoading(true)
    try {
      const mockSalesData = JSON.stringify([{ date: '2023-10-01', amount: 45000 }])
      const mockInventoryData = JSON.stringify([{ item: 'Panadol', stock: 12, reorder: 50 }])
      const mockAccountingData = JSON.stringify({ cashOnHand: 42000 })

      const res = await aiFinancialInsights({
        salesData: mockSalesData,
        inventoryData: mockInventoryData,
        accountingData: mockAccountingData,
        userQuery: query || "Generate trend analysis."
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
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-primary/20 text-primary">
            <BrainCircuit className="size-5" />
          </div>
          <h1 className="text-2xl font-headline font-bold">AI Analysis</h1>
        </div>

        <Card className="border-none bg-card ring-1 ring-border shadow-lg">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Business Strategist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <Textarea 
              placeholder="e.g., Should I increase my order for Painkillers?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[100px] bg-secondary/10 border-none ring-1 ring-border text-xs"
            />
            <Button 
              className="w-full bg-primary hover:bg-primary/90 gap-2 h-10 text-xs font-bold uppercase tracking-widest"
              disabled={loading}
              onClick={runAnalysis}
            >
              {loading ? (
                <>
                  <RefreshCcw className="size-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Generate Insights
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {loading && (
          <div className="space-y-2 py-4">
            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold animate-pulse">Computing trends...</p>
            <Progress value={45} className="h-1 bg-secondary" />
          </div>
        )}

        {results && (
          <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20">
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center gap-2 text-primary">
                    <TrendingUp className="size-3.5" />
                    <CardTitle className="text-xs font-bold uppercase">Trends</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-[11px] leading-relaxed opacity-80">{results.summaryOfTrends}</p>
                </CardContent>
              </Card>

              <Card className="bg-accent/5 border-none ring-1 ring-accent/20">
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center gap-2 text-accent">
                    <PackageSearch className="size-3.5" />
                    <CardTitle className="text-xs font-bold uppercase">Re-order</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-[11px] leading-relaxed opacity-80">{results.reorderRecommendations}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-none ring-1 ring-border shadow-xl">
              <CardHeader className="py-2 px-4 border-b border-border/50">
                <div className="flex items-center gap-2 text-primary">
                  <Lightbulb className="size-4" />
                  <CardTitle className="text-sm font-bold uppercase">Strategy</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="p-4 rounded-lg bg-secondary/20 text-sm leading-relaxed italic border-l-2 border-primary">
                  "{results.answerToQuery}"
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
