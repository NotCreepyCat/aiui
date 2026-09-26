import { useEffect, useState } from 'react'
import {
  fetchModelEndpoints,
  fetchModels,
  type OpenRouterModel,
  type OpenRouterProviderEndpoint,
} from '@/lib/openrouter'

let modelsCache: OpenRouterModel[] | null = null
let modelsInflight: Promise<OpenRouterModel[]> | null = null

export function useModels() {
  const [models, setModels] = useState<OpenRouterModel[] | null>(modelsCache)
  const [loading, setLoading] = useState(!modelsCache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (modelsCache) {
      setModels(modelsCache)
      setLoading(false)
      return
    }
    let cancelled = false
    if (!modelsInflight) {
      modelsInflight = fetchModels().then((m) => {
        modelsCache = m
        return m
      })
    }
    setLoading(true)
    modelsInflight
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
  }, [])

  return { models: models ?? [], loading, error }
}

const endpointsCache = new Map<string, OpenRouterProviderEndpoint[]>()

export function useModelEndpoints(modelId: string | null) {
  const [endpoints, setEndpoints] = useState<OpenRouterProviderEndpoint[]>(
    modelId ? (endpointsCache.get(modelId) ?? []) : [],
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!modelId) {
      setEndpoints([])
      return
    }
    const cached = endpointsCache.get(modelId)
    if (cached) {
      setEndpoints(cached)
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
  }, [modelId])

  return { endpoints, loading, error }
}
