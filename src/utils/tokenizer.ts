import { getEncoding } from 'js-tiktoken';

// Use cl100k_base (GPT-4/Claude tokenizer approximation)
let encoder: ReturnType<typeof getEncoding> | null = null;

function getEncoder() {
  if (!encoder) {
    encoder = getEncoding('cl100k_base');
  }
  return encoder;
}

/**
  * Count tokens using the cl100k_base tokenizer.
  * This gives a stable, reproducible approximation for coding-agent context costs.
 */
export function countTokens(text: string): number {
  return getEncoder().encode(text).length;
}

/**
 * Estimate monthly token cost given usage assumptions.
 */
export function estimateMonthlyCost(params: {
  tokenCount: number;
  dailyInvocations: number;
  costPer1kTokens: number;
  workingDaysPerMonth?: number;
}): number {
  const days = params.workingDaysPerMonth ?? 22;
  const monthlyTokens = params.tokenCount * params.dailyInvocations * days;
  return (monthlyTokens / 1000) * params.costPer1kTokens;
}

/**
 * Calculate potential savings from reducing token count.
 */
export function estimateSavings(params: {
  currentTokens: number;
  reducedTokens: number;
  dailyInvocations: number;
  costPer1kTokens: number;
}): { tokensSaved: number; monthlySavings: number } {
  const tokensSaved = params.currentTokens - params.reducedTokens;
  const monthlySavings = estimateMonthlyCost({
    tokenCount: tokensSaved,
    dailyInvocations: params.dailyInvocations,
    costPer1kTokens: params.costPer1kTokens,
  });
  return { tokensSaved, monthlySavings };
}
