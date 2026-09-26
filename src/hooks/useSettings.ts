import { useLiveQuery } from 'dexie-react-hooks'
import { db, makeDefaultSettings, type Settings } from '@/lib/db'

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get('global'), [])
}

export async function updateSettings(patch: Partial<Settings>) {
  const current = (await db.settings.get('global')) ?? makeDefaultSettings()
  await db.settings.put({ ...current, ...patch, id: 'global' })
}

export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.get('global')
  if (existing) return existing
  const defaults = makeDefaultSettings()
  await db.settings.put(defaults)
  return defaults
}

const MAX_RECENT_MODELS = 6

export async function recordRecentModel(modelId: string) {
  if (!modelId) return
  const current = (await db.settings.get('global')) ?? makeDefaultSettings()
  const existing = current.recentModelIds ?? []
  const recentModelIds = [modelId, ...existing.filter((id) => id !== modelId)].slice(0, MAX_RECENT_MODELS)
  await db.settings.put({ ...current, recentModelIds, id: 'global' })
}
