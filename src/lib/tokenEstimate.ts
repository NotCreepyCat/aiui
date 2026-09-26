// Rough estimate only — OpenRouter fans out to many different tokenizers,
// so exact counts aren't knowable client-side without pulling in a
// per-model tokenizer. ~4 chars/token is the standard ballpark for
// trimming history to fit a context budget.
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

export function estimateMessageTokens(content: string): number {
  return estimateTokens(content) + 4
}
