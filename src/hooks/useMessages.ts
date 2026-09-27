import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, normalizeMessage, type ChatMessageRecord, type MessageVariant } from '@/lib/db'
import { extractSnippet, type SearchSnippet } from '@/lib/searchSnippet'

export function useMessages(chatId: string | null): ChatMessageRecord[] {
  const raw = useLiveQuery<ChatMessageRecord[]>(
    async () => {
      if (!chatId) return []
      return db.messages.where('chatId').equals(chatId).sortBy('order')
    },
    [chatId],
  )
  return raw?.map(normalizeMessage) ?? []
}

/**
 * For each chat with a matching message (any variant/swipe, not just the active
 * one), returns a short highlighted excerpt from its earliest matching message.
 */
export function useChatMessageMatches(query: string): Map<string, SearchSnippet> | null {
  const q = query.trim()
  return (
    useLiveQuery(
      async () => {
        if (!q) return null
        // Sorting globally by `order` still preserves each chat's own message
        // sequence (order is only ever compared within the same chat here),
        // so the first hit found per chatId is that chat's earliest match.
        const all = await db.messages.orderBy('order').toArray()
        const matches = new Map<string, SearchSnippet>()
        for (const message of all) {
          if (matches.has(message.chatId)) continue
          for (const variant of message.variants ?? []) {
            const snippet = extractSnippet(variant.content ?? '', q)
            if (snippet) {
              matches.set(message.chatId, snippet)
              break
            }
          }
        }
        return matches
      },
      [q],
    ) ?? null
  )
}

function emptyVariant(content = ''): MessageVariant {
  return { content, reasoning: null, cost: null, promptTokens: null, completionTokens: null, createdAt: Date.now() }
}

export async function nextOrder(chatId: string): Promise<number> {
  // .last() would sort by primary key (a random UUID), not by `order` — walk
  // the (small, per-chat) set in memory to find the real max instead.
  const rows = await db.messages.where('chatId').equals(chatId).toArray()
  return rows.reduce((max, r) => Math.max(max, r.order), -1) + 1
}

export async function addUserMessage(chatId: string, content: string): Promise<string> {
  const id = newId()
  const order = await nextOrder(chatId)
  const record: ChatMessageRecord = {
    id,
    chatId,
    role: 'user',
    order,
    variants: [emptyVariant(content)],
    activeVariantIndex: 0,
  }
  await db.messages.put(record)
  return id
}

export async function addAssistantPlaceholder(chatId: string): Promise<string> {
  const id = newId()
  const order = await nextOrder(chatId)
  const record: ChatMessageRecord = {
    id,
    chatId,
    role: 'assistant',
    order,
    variants: [emptyVariant()],
    activeVariantIndex: 0,
  }
  await db.messages.put(record)
  return id
}

export async function finalizeVariant(
  messageId: string,
  variantIndex: number,
  result: {
    content: string
    reasoning: string | null
    cost: number | null
    promptTokens: number | null
    completionTokens: number | null
  },
) {
  const raw = await db.messages.get(messageId)
  if (!raw) return
  const record = normalizeMessage(raw)
  const variants = [...record.variants]
  variants[variantIndex] = { ...variants[variantIndex], ...result }
  await db.messages.put({ ...record, variants, activeVariantIndex: variantIndex })
}

export async function addVariantForRegenerate(messageId: string): Promise<number> {
  const raw = await db.messages.get(messageId)
  if (!raw) return 0
  const record = normalizeMessage(raw)
  const variants = [...record.variants, emptyVariant()]
  const activeVariantIndex = variants.length - 1
  await db.messages.put({ ...record, variants, activeVariantIndex })
  return activeVariantIndex
}

export async function setActiveVariantIndex(messageId: string, index: number) {
  await db.messages.update(messageId, { activeVariantIndex: index })
}

/** Editing (any message) branches into a new variant/swipe rather than overwriting the old one. */
export async function addEditedVariant(messageId: string, content: string): Promise<number> {
  const raw = await db.messages.get(messageId)
  if (!raw) return 0
  const record = normalizeMessage(raw)
  const variants = [...record.variants, emptyVariant(content)]
  const activeVariantIndex = variants.length - 1
  await db.messages.put({ ...record, variants, activeVariantIndex })
  return activeVariantIndex
}

export async function deleteMessage(messageId: string) {
  await db.messages.delete(messageId)
}
