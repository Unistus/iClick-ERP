'use server';
/**
 * @fileOverview AI agent for inventory loss prevention.
 * Analyzes expiring stock batches and suggests liquidation markdowns or transfers.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiInventoryLiquidationInputSchema = z.object({
  productName: z.string().describe('Name of the expiring product.'),
  batchNumber: z.string().describe('The specific LOT/Batch number.'),
  quantityAtRisk: z.number().describe('Units remaining in this batch.'),
  daysToExpiry: z.number().describe('Calendar days until expiration.'),
  costPrice: z.number().describe('The unit cost of the item.'),
  currentSellingPrice: z.number().describe('Standard retail price.'),
});
export type AiInventoryLiquidationInput = z.infer<typeof AiInventoryLiquidationInputSchema>;

const AiInventoryLiquidationOutputSchema = z.object({
  recommendedMarkdownPct: z.number().describe('Suggested price reduction percentage (0-100).'),
  suggestedAction: z.string().describe('Short tactical action (e.g. "Flash Sale", "BOGO", "Transfer to High-Traffic Branch").'),
  strategicReason: z.string().describe('Why this markdown is optimal.'),
  estimatedRecoveryValue: z.number().describe('Projected revenue after markdown.'),
  urgencyLevel: z.enum(['Low', 'Medium', 'High', 'Critical']),
});
export type AiInventoryLiquidationOutput = z.infer<typeof AiInventoryLiquidationOutputSchema>;

export async function aiInventoryLiquidation(input: AiInventoryLiquidationInput): Promise<AiInventoryLiquidationOutput> {
  return aiInventoryLiquidationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiInventoryLiquidationPrompt',
  input: { schema: AiInventoryLiquidationInputSchema },
  output: { schema: AiInventoryLiquidationOutputSchema },
  prompt: `You are the "Inventory Optimization Bot" for iClick ERP. 
Your goal is to minimize financial loss for an institution by liquidating stock before it expires.

### BATCH CONTEXT:
- PRODUCT: {{{productName}}}
- BATCH: {{{batchNumber}}}
- QTY AT RISK: {{{quantityAtRisk}}} units
- DAYS LEFT: {{{daysToExpiry}}} days
- COST BASIS: {{{costPrice}}}
- CURRENT PRICE: {{{currentSellingPrice}}}

### STRATEGY GUIDELINES:
1. If days > 60: Suggest conservative markdowns (5-10%) or prominent shelf placement.
2. If days 30-60: Suggest "Bundle" offers or 20% markdowns.
3. If days < 30: Suggest "Flash Sale" or 40-60% markdowns to recover at least the cost price.
4. If days < 7: Suggest immediate internal transfer or disposal if clinical/perishable.

Provide your output in the structured JSON format specified.`,
});

const aiInventoryLiquidationFlow = ai.defineFlow(
  {
    name: 'aiInventoryLiquidationFlow',
    inputSchema: AiInventoryLiquidationInputSchema,
    outputSchema: AiInventoryLiquidationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);