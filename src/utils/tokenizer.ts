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
  * This gives a stable, reproducible approximation for coding-agent context size.
 */
export function countTokens(text: string): number {
  return getEncoder().encode(text).length;
}
