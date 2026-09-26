import Dexie, { type Table } from 'dexie'
import type { FontFamily, FontSize } from './appearance'

export type PromptRole = 'system' | 'user' | 'assistant'

export interface Settings {
  id: 'global'
  apiKey: string
  onboarded: boolean
  theme: 'light' | 'dark'
  fontFamily: FontFamily
  fontSize: FontSize
  defaultModel: string
  defaultProvider: string | null
  /** Most-recently-picked model ids, newest first — shown at the top of the model picker. */
  recentModelIds: string[]
}

export interface PromptField {
  text: string
  role: PromptRole
}

export interface Chat {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  model: string
  provider: string | null
  contextSize: number
  maxTokens: number
  temperature: number
  reasoningEnabled: boolean
  description: PromptField
  endOfPrompt: PromptField
}

export interface MessageVariant {
  content: string
  reasoning: string | null
  cost: number | null
  promptTokens: number | null
  completionTokens: number | null
  createdAt: number
}

export interface ChatMessageRecord {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  order: number
  variants: MessageVariant[]
  activeVariantIndex: number
}

class AppDatabase extends Dexie {
  settings!: Table<Settings, string>
  chats!: Table<Chat, string>
  messages!: Table<ChatMessageRecord, string>

  constructor() {
    super('aiui')
    this.version(1).stores({
      settings: 'id',
      chats: 'id, updatedAt',
      messages: 'id, chatId, order',
    })
  }
}

export const db = new AppDatabase()

export function makeDefaultSettings(): Settings {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return {
    id: 'global',
    apiKey: '',
    onboarded: false,
    theme: prefersDark ? 'dark' : 'light',
    fontFamily: 'inter',
    fontSize: 'md',
    defaultModel: '',
    defaultProvider: null,
    recentModelIds: [],
  }
}

export function newId(): string {
  // crypto.randomUUID() only exists in secure contexts (https, or localhost) —
  // it's undefined when the app is opened over plain http on a LAN IP (e.g.
  // testing from a phone). crypto.getRandomValues() has no such restriction.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const DEFAULT_CONTEXT_SIZE = 100000

export function chatDefaults(
  modelContextLength?: number,
): Pick<Chat, 'contextSize' | 'maxTokens' | 'temperature' | 'reasoningEnabled' | 'description' | 'endOfPrompt'> {
  const contextSize =
    modelContextLength && modelContextLength > 0 && modelContextLength < DEFAULT_CONTEXT_SIZE
      ? modelContextLength
      : DEFAULT_CONTEXT_SIZE
  return {
    contextSize,
    maxTokens: 100000,
    temperature: 0.8,
    reasoningEnabled: false,
    description: { text: '', role: 'system' },
    endOfPrompt: { text: '', role: 'user' },
  }
}

export function activeVariant(message: ChatMessageRecord): MessageVariant | undefined {
  return message.variants[message.activeVariantIndex]
}
