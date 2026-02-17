'use server';
/**
 * @fileOverview An advanced AI-powered business strategist.
 * Analyzes live ERP data (Sales, Inventory, Accounting, Budgets, Aging) 
 * to provide trend summaries, re-order predictions, and specific tactical actions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiFinancialInsightsInputSchema = z.object({
  salesData: z.string().describe('Serialized recent sales/transaction data.'),
  inventoryData: z.string().describe('Serialized stock levels and reorder points.'),
  accountingData: z.string().describe('Serialized ledger balances.'),
  budgetData: z.string().describe('Serialized budget utilization metrics.'),
  agingData: z.string().describe('Serialized accounts receivable and payable aging reports.'),
  userQuery: z.string().describe('The specific business question the user wants answered.'),
});
export type AiFinancialInsightsInput = z.infer<typeof AiFinancialInsightsInputSchema>;

const AiFinancialInsightsOutputSchema = z.object({
  summaryOfTrends: z.string().describe('Executive summary of business performance.'),
  reorderRecommendations: z.string().describe('Specific inventory procurement advice.'),
  answerToQuery: z.string().describe('Direct response to the user query.'),
  strategicActions: z.array(z.object({
    title: z.string().describe('Short name of the action.'),
    description: z.string().describe('Why this action is needed.'),
    module: z.string().describe('The ERP module this relates to (e.g. Accounting, Inventory).'),
    priority: z.enum(['High', 'Medium', 'Low']),
    link: z.string().describe('The internal path to execute this action (e.g. /accounting/ap).')
  })).describe('A list of specific, clickable tactical actions the user should take in the ERP.')
});
export type AiFinancialInsightsOutput = z.infer<typeof AiFinancialInsightsOutputSchema>;

export async function aiFinancialInsights(input: AiFinancialInsightsInput): Promise<AiFinancialInsightsOutput> {
  return aiFinancialInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiFinancialInsightsPrompt',
  input: { schema: AiFinancialInsightsInputSchema },
  output: { schema: AiFinancialInsightsOutputSchema },
  prompt: `You are the "Senior Strategist" for iClick ERP, a high-performance business management system.
Your goal is to provide deep financial insight and tactical ERP actions based on real-time data.

### DATA CONTEXT:
---
SALES: {{{salesData}}}
INVENTORY: {{{inventoryData}}}
LEDGER: {{{accountingData}}}
BUDGETS: {{{budgetData}}}
AGING DEBT: {{{agingData}}}
---

### MISSION:
1. **Trend Synthesis**: Identify patterns in revenue vs. expense. Are we overspending? Is cash flow healthy?
2. **Inventory Optimization**: Find items that need urgent re-ordering OR items that are "dead stock" tying up capital.
3. **Budget Control**: Highlight specific budget nodes that are in danger of being breached.
4. **Tactical Action Plan**: Provide 3-5 specific "One-Click Actions" the user can take in this ERP to improve the situation. 
   - Map actions to modules like: "Accounting", "Inventory", "POS", "Admin".
   - Assign priorities based on financial risk.

### USER QUERY:
"{{{userQuery}}}"

Provide your output in the structured JSON format specified.`,
});

const aiFinancialInsightsFlow = ai.defineFlow(
  {
    name: 'aiFinancialInsightsFlow',
    inputSchema: AiFinancialInsightsInputSchema,
    outputSchema: AiFinancialInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
