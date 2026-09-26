import type { ChatMessage } from './openrouter'
import type { PromptField } from './db'
import { estimateMessageTokens } from './tokenEstimate'

export interface BuildPromptArgs {
  description: PromptField
  endOfPrompt: PromptField
  history: ChatMessage[]
  contextSize: number
}

export interface BuildPromptResult {
  messages: ChatMessage[]
  /** True when some of the oldest history had to be dropped to fit the context budget. */
  truncated: boolean
}

/**
 * Assembles [description] + trimmed history + [end-of-prompt] within the context budget.
 *
 * `contextSize` alone governs how much history/prompt content is kept. It is deliberately
 * independent of `maxTokens` (the response length cap sent to the API) — the app's defaults
 * set both to 100000, and treating them as one shared budget left zero room for any history.
 */
export function buildPromptMessages(args: BuildPromptArgs): BuildPromptResult {
  const head: ChatMessage[] = args.description.text.trim()
    ? [{ role: args.description.role, content: args.description.text }]
    : []
  const tail: ChatMessage[] = args.endOfPrompt.text.trim()
    ? [{ role: args.endOfPrompt.role, content: args.endOfPrompt.text }]
    : []

  const reserved =
    head.reduce((n, m) => n + estimateMessageTokens(m.content), 0) +
    tail.reduce((n, m) => n + estimateMessageTokens(m.content), 0)
  let budget = Math.max(args.contextSize - reserved, 0)

  const kept: ChatMessage[] = []
  for (let i = args.history.length - 1; i >= 0; i--) {
    const message = args.history[i]
    const cost = estimateMessageTokens(message.content)
    if (kept.length > 0 && cost > budget) break
    budget -= cost
    kept.unshift(message)
  }

  return { messages: [...head, ...kept, ...tail], truncated: kept.length < args.history.length }
}
