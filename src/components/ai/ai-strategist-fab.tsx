
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  BrainCircuit, 
  X, 
  Zap, 
  Sparkles, 
  Send, 
  Loader2, 
  ChevronRight, 
  MessageSquare,
  RefreshCw,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { aiFinancialInsights, type AiFinancialInsightsOutput } from '@/ai/flows/ai-financial-insights-flow';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export function AIStrategistFab() {
  const pathname = usePathname();
  const db = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AiFinancialInsightsOutput | null>(null);
  const [userQuery, setUserQuery] = useState("");

  // Contextual Data Detection based on Path
  const isHR = pathname.startsWith('/hr') || pathname.startsWith('/payroll');
  const isInventory = pathname.startsWith('/inventory') || pathname.startsWith('/purchases');
  const isAccounting = pathname.startsWith('/accounting');

  // Generic data pull for context (limited for token efficiency)
  const coaQuery = useMemoFirebase(() => query(collection(db, 'institutions', 'SYSTEM', 'coa'), limit(5)), [db]);
  const { data: coa } = useCollection(coaQuery);

  const runAnalysis = async (customQuery?: string) => {
    setIsAnalyzing(true);
    try {
      const context = `Current Page: ${pathname}. Data Context: ${JSON.stringify(coa || [])}`;
      const res = await aiFinancialInsights({
        salesData: "[]",
        inventoryData: "[]",
        accountingData: context,
        budgetData: "[]",
        agingData: "[]",
        userQuery: customQuery || `Analyze the current ${pathname} node and identify operational risks.`
      });
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isOpen && !results) {
      runAnalysis();
    }
  }, [isOpen]);

  return (
    <div className="fixed bottom-12 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-[380px] h-[550px] shadow-2xl border-none ring-1 ring-primary/30 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="bg-primary p-4 text-white shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12"><BrainCircuit className="size-24" /></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md shadow-inner">
                  <BrainCircuit className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest">iClick Strategist</CardTitle>
                  <p className="text-[10px] opacity-70 uppercase font-bold tracking-tighter">
                    {isHR ? 'HR & Talent Mode' : isInventory ? 'Supply Chain Mode' : 'Financial Mode'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="size-8 text-white hover:bg-white/10" onClick={() => setIsOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 bg-card p-4">
            {isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                <div className="size-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] animate-pulse">Scanning Page State...</p>
              </div>
            ) : results ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase text-primary tracking-widest">
                    <Sparkles className="size-3" /> Synthesis
                  </div>
                  <p className="text-xs leading-relaxed italic border-l-2 border-primary/30 pl-3">
                    {results.answerToQuery}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase opacity-40 tracking-widest">Strategic Actions</h4>
                  <div className="grid gap-2">
                    {results.strategicActions?.map((a, i) => (
                      <div key={i} className="p-3 rounded-xl bg-secondary/10 border border-border/50 group hover:ring-1 hover:ring-primary/30 transition-all cursor-default">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold leading-tight">{a.title}</span>
                          <Badge variant="outline" className="text-[7px] h-3.5 px-1 uppercase font-black bg-primary/5">{a.priority}</Badge>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-2 py-20">
                <MessageSquare className="size-12 mx-auto" />
                <p className="text-[10px] font-black uppercase">Start a new analysis</p>
              </div>
            )}
          </ScrollArea>

          <div className="p-4 bg-secondary/10 border-t border-border/50 shrink-0">
            <form 
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                runAnalysis(userQuery);
                setUserQuery("");
              }}
            >
              <Input 
                placeholder="Ask about this page..." 
                className="h-9 text-xs bg-background"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
              <Button type="submit" size="icon" className="size-9 shrink-0 shadow-lg" disabled={isAnalyzing || !userQuery}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}

      <Button 
        size="icon" 
        className={cn(
          "size-14 rounded-2xl shadow-2xl ring-4 ring-primary/10 transition-all active:scale-95 group",
          isOpen ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="size-6" /> : <BrainCircuit className="size-7 group-hover:scale-110 transition-transform" />}
      </Button>
    </div>
  );
}
