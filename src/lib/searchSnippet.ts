export interface SearchSnippet {
  text: string
  matchStart: number
  matchLength: number
}

// Display clamps the snippet to ~4 lines by rendered height, not character
// count. A long "before" side alone can already fill all the lines and push
// the match (and all "after" text) past the clamp, making it invisible — so
// the leading context stays short and the trailing side gets the big budget.
const BEFORE_CONTEXT_CHARS = 20
const AFTER_CONTEXT_CHARS = 220

/** Finds the first case-insensitive match of `query` in `content` and returns a
 * short excerpt of surrounding context, with the match position relative to
 * the returned (already truncated/flattened) excerpt — ready to highlight. */
export function extractSnippet(rawContent: string, query: string): SearchSnippet | null {
  const q = query.trim()
  if (!q) return null

  const flat = rawContent.replace(/\s+/g, ' ')
  const idx = flat.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return null

  const start = Math.max(0, idx - BEFORE_CONTEXT_CHARS)
  const end = Math.min(flat.length, idx + q.length + AFTER_CONTEXT_CHARS)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < flat.length ? '…' : ''

  return {
    text: prefix + flat.slice(start, end) + suffix,
    matchStart: prefix.length + (idx - start),
    matchLength: q.length,
  }
}
