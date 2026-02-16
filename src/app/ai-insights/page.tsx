
"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
      // Dummy data representing current state
      const mockSalesData = JSON.stringify([
        { date: '2023-10-01', amount: 45000 },
        { date: '2023-10-02', amount: 52000 },
        { date: '2023-10-03', amount: 38000 },
      ])
      const mockInventoryData = JSON.stringify([
        { item: 'Panadol', stock: 12, reorder: 50 },
        { item: 'Amoxil', stock: 5, reorder: 20 },
      ])
      const mockAccountingData = JSON.stringify({ cashOnHand: 42000, receivables: 150000 })

      const res = await aiFinancialInsights({
        salesData: mockSalesData,
        inventoryData: mockInventoryData,
        accountingData: mockAccountingData,
        userQuery: query || "What are the top 3 items to re-order and how is my profitability trending?"
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
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <BrainCircuit className="size-6" />
            </div>
            <h1 className="text-3xl font-headline font-bold">AI Analysis</h1>
          </div>
          <p className="text-muted-foreground">Ask intelligent questions about your business data.</p>
        </div>

        <Card className="border-none bg-card ring-1 ring-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Business Strategist</CardTitle>
            <CardDescription>Enter a specific operational question or use the default trend analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="e.g., Should I increase my order for Painkillers next month based on seasonal trends?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[120px] bg-secondary/20 border-none ring-1 ring-border focus-visible:ring-primary"
            />
            <Button 
              className="w-full bg-primary hover:bg-primary/90 gap-2 h-12"
              disabled={loading}
              onClick={runAnalysis}
            >
              {loading ? (
                <>
                  <RefreshCcw className="size-4 animate-spin" />
                  Analyzing business data...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate AI Insights
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {loading && (
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground animate-pulse">Running complex financial cross-referencing...</p>
            <Progress value={45} className="h-1 bg-secondary" />
          </div>
        )}

        {results && (
          <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-primary/5 border-none ring-1 ring-primary/20 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-primary">
                    <TrendingUp className="size-5" />
                    <CardTitle className="text-base font-headline">Business Trends</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{results.summaryOfTrends}</p>
                </CardContent>
              </Card>

              <Card className="bg-accent/5 border-none ring-1 ring-accent/20 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-accent">
                    <PackageSearch className="size-5" />
                    <CardTitle className="text-base font-headline">Re-order Recommendations</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{results.reorderRecommendations}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-none ring-1 ring-border shadow-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-primary">
                  <Lightbulb className="size-5" />
                  <CardTitle className="text-lg font-headline">Strategic Answer</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-xl bg-secondary/30 text-lg leading-relaxed italic text-foreground/90">
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
