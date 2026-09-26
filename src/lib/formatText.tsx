import type { ReactNode } from 'react'

// RP-chat conventions: ***bold italic***, **bold**, *italic* (actions/narration),
// "quoted" (dialogue). Builds React nodes directly (no dangerouslySetInnerHTML),
// so arbitrary model/user text can never inject markup.
const INLINE_PATTERN = /\*\*\*([^*\n]+?)\*\*\*|\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|"([^"\n]+?)"/g

export function formatMessageText(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index))

    const [full, boldItalic, bold, italic, quoted] = match
    if (boldItalic !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold italic">
          {boldItalic}
        </strong>,
      )
    } else if (bold !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {bold}
        </strong>,
      )
    } else if (italic !== undefined) {
      nodes.push(
        <em key={key++} className="italic opacity-75">
          {italic}
        </em>,
      )
    } else if (quoted !== undefined) {
      nodes.push(<span key={key++} className="font-medium">"{quoted}"</span>)
    }
    lastIndex = index + full.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))

  return nodes
}
