import { useLiveQuery } from 'dexie-react-hooks'
import { chatDefaults, db, newId, type Chat } from '@/lib/db'

export function useChats() {
  return useLiveQuery(() => db.chats.orderBy('updatedAt').reverse().toArray(), []) ?? []
}

export function useChat(chatId: string | null) {
  return useLiveQuery(() => (chatId ? db.chats.get(chatId) : undefined), [chatId])
}

export async function createChat(
  model: string,
  provider: string | null,
  modelContextLength?: number,
): Promise<string> {
  const id = newId()
  const now = Date.now()
  const chat: Chat = {
    id,
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    model,
    provider,
    ...chatDefaults(modelContextLength),
  }
  await db.chats.put(chat)
  return id
}

export async function updateChat(chatId: string, patch: Partial<Chat>) {
  await db.chats.update(chatId, { ...patch, updatedAt: Date.now() })
}

export async function touchChat(chatId: string) {
  await db.chats.update(chatId, { updatedAt: Date.now() })
}

export async function deleteChat(chatId: string) {
  await db.transaction('rw', db.chats, db.messages, async () => {
    await db.messages.where('chatId').equals(chatId).delete()
    await db.chats.delete(chatId)
  })
}

/** Chats with no messages are drafts, not history — drop them once you navigate away. */
export async function deleteChatIfEmpty(chatId: string) {
  const count = await db.messages.where('chatId').equals(chatId).count()
  if (count === 0) await deleteChat(chatId)
}
