import { useLiveQuery } from 'dexie-react-hooks'
import { db, normalizeSettings, type Settings } from '@/lib/db'

export function useSettings(): Settings | undefined {
  const raw = useLiveQuery(() => db.settings.get('global'), [])
  return raw ? normalizeSettings(raw) : raw
}

export async function updateSettings(patch: Partial<Settings>) {
  const current = normalizeSettings(await db.settings.get('global'))
  await db.settings.put({ ...current, ...patch, id: 'global' })
}

export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.get('global')
  const complete = normalizeSettings(existing)
  // Write back so a record from an older schema version gets backfilled
  // on disk too, not just patched in memory for this one read.
  await db.settings.put(complete)
  return complete
}

const MAX_RECENT_MODELS = 6

export async function recordRecentModel(modelId: string) {
  if (!modelId) return
  const current = normalizeSettings(await db.settings.get('global'))
  const recentModelIds = [modelId, ...current.recentModelIds.filter((id) => id !== modelId)].slice(
    0,
    MAX_RECENT_MODELS,
  )
  await db.settings.put({ ...current, recentModelIds, id: 'global' })
}
