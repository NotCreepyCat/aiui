import { useEffect, useState } from 'react'
import {
  fetchModelEndpoints,
  fetchModels,
  type OpenRouterModel,
  type OpenRouterProviderEndpoint,
} from '@/lib/openrouter'

let modelsCache: OpenRouterModel[] | null = null
let modelsInflight: Promise<OpenRouterModel[]> | null = null

function loadModels(): Promise<OpenRouterModel[]> {
  if (!modelsInflight) {
    modelsInflight = fetchModels()
      .then((m) => {
        modelsCache = m
        return m
      })
      .catch((e) => {
        // Don't leave a permanently-rejected promise cached — otherwise one
        // transient network hiccup breaks model loading for the whole
        // session, since nothing would ever attempt the fetch again.
        modelsInflight = null
        throw e
      })
  }
  return modelsInflight
}

export function useModels() {
  const [models, setModels] = useState<OpenRouterModel[] | null>(modelsCache)
  const [loading, setLoading] = useState(!modelsCache)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (modelsCache) {
      setModels(modelsCache)
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    loadModels()
      .then((m) => {
        if (!cancelled) setModels(m)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [retryKey])

  return { models: models ?? [], loading, error, retry: () => setRetryKey((k) => k + 1) }
}

const endpointsCache = new Map<string, OpenRouterProviderEndpoint[]>()

export function useModelEndpoints(modelId: string | null) {
  const [endpoints, setEndpoints] = useState<OpenRouterProviderEndpoint[]>(
    modelId ? (endpointsCache.get(modelId) ?? []) : [],
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!modelId) {
      setEndpoints([])
      setError(null)
      return
    }
    const cached = endpointsCache.get(modelId)
    if (cached) {
      setEndpoints(cached)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchModelEndpoints(modelId)
      .then((e) => {
        endpointsCache.set(modelId, e)
        if (!cancelled) setEndpoints(e)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [modelId, retryKey])

  return { endpoints, loading, error, retry: () => setRetryKey((k) => k + 1) }
}
