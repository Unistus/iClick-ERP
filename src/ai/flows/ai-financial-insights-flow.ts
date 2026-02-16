'use server';
/**
 * @fileOverview An AI-powered financial insights tool that analyzes sales, inventory, and accounting data
 * to provide business trend summaries, re-order point predictions, and answers to specific operational questions.
 *
 * - aiFinancialInsights - A function that orchestrates the AI financial insights generation process.
 * - AiFinancialInsightsInput - The input type for the aiFinancialInsights function.
 * - AiFinancialInsightsOutput - The return type for the aiFinancialInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiFinancialInsightsInputSchema = z.object({
  salesData: z
    .string()
    .describe('Serialized sales data, e.g., JSON array or summary of sales records.'),
  inventoryData: z
    .string()
    .describe(
      'Serialized inventory data, e.g., JSON array or summary of inventory items with quantities and re-order levels.'
    ),
  accountingData: z
    .string()
    .describe(
      'Serialized accounting data, e.g., JSON representation of ledger entries or financial statements.'
    ),
  userQuery: z.string().describe('The specific business question the user wants answered.'),
});
export type AiFinancialInsightsInput = z.infer<typeof AiFinancialInsightsInputSchema>;

const AiFinancialInsightsOutputSchema = z.object({
  summaryOfTrends: z
    .string()
    .describe('A comprehensive summary of key business trends identified from the provided data.'),
  reorderRecommendations: z
    .string()
    .describe('Actionable recommendations for optimal re-order points for inventory items.'),
  answerToQuery: z.string().describe('The precise answer to the specific operational question asked by the user.'),
});
export type AiFinancialInsightsOutput = z.infer<typeof AiFinancialInsightsOutputSchema>;

export async function aiFinancialInsights(input: AiFinancialInsightsInput): Promise<AiFinancialInsightsOutput> {
  return aiFinancialInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiFinancialInsightsPrompt',
  input: { schema: AiFinancialInsightsInputSchema },
  output: { schema: AiFinancialInsightsOutputSchema },
  prompt: `You are an expert financial analyst and business strategist. Your goal is to provide insightful summaries and actionable recommendations based on the provided business data.

Here is the data for analysis:

Sales Data:
{{{salesData}}}

Inventory Data:
{{{inventoryData}}}

Accounting Data:
{{{accountingData}}}

Based on this data, perform the following tasks:
1.  **Summarize Business Trends**: Identify and summarize key business trends, including sales performance, cost fluctuations, and profitability.
2.  **Predict Optimal Re-order Points**: Analyze the inventory data to suggest optimal re-order points for items that might be running low or have high turnover.
3.  **Answer User Query**: Address the following specific operational question: "{{{userQuery}}}"

Provide your output in a structured JSON format as described by the output schema.`,
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
