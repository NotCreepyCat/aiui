const BASE_URL = 'https://openrouter.ai/api/v1'

export interface OpenRouterModel {
  id: string
  name: string
  contextLength: number
  maxCompletionTokens: number | null
  pricing: { prompt: number; completion: number }
  supportsReasoning: boolean
}

export interface OpenRouterProviderEndpoint {
  tag: string
  name: string
  providerName: string
  contextLength: number
  maxCompletionTokens: number | null
  pricing: { prompt: number; completion: number }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export async function fetchModels(): Promise<OpenRouterModel[]> {
  const res = await fetch(`${BASE_URL}/models`)
  if (!res.ok) throw new Error(`Failed to load models (${res.status})`)
  const json = await res.json()
  const list = Array.isArray(json.data) ? json.data : []
  return list.map(
    (m: Record<string, unknown>): OpenRouterModel => ({
      id: String(m.id),
      name: typeof m.name === 'string' ? m.name : String(m.id),
      contextLength: toNumber(
        m.context_length ?? (m.top_provider as Record<string, unknown> | undefined)?.context_length ?? 0,
      ),
      maxCompletionTokens:
        (m.top_provider as Record<string, unknown> | undefined)?.max_completion_tokens != null
          ? toNumber((m.top_provider as Record<string, unknown>).max_completion_tokens)
          : null,
      pricing: {
        prompt: toNumber((m.pricing as Record<string, unknown> | undefined)?.prompt ?? 0),
        completion: toNumber((m.pricing as Record<string, unknown> | undefined)?.completion ?? 0),
      },
      supportsReasoning:
        Array.isArray(m.supported_parameters) && (m.supported_parameters as string[]).includes('reasoning'),
    }),
  )
}

export async function fetchModelEndpoints(modelId: string): Promise<OpenRouterProviderEndpoint[]> {
  const res = await fetch(`${BASE_URL}/models/${modelId}/endpoints`)
  if (!res.ok) throw new Error(`Failed to load providers (${res.status})`)
  const json = await res.json()
  const endpoints = Array.isArray(json.data?.endpoints) ? json.data.endpoints : []
  return endpoints.map(
    (e: Record<string, unknown>): OpenRouterProviderEndpoint => ({
      tag: String(e.tag ?? e.provider_name ?? e.name),
      name: String(e.name ?? e.provider_name ?? e.tag),
      providerName: String(e.provider_name ?? e.tag ?? e.name),
      contextLength: toNumber(e.context_length ?? 0),
      maxCompletionTokens: e.max_completion_tokens != null ? toNumber(e.max_completion_tokens) : null,
      pricing: {
        prompt: toNumber((e.pricing as Record<string, unknown> | undefined)?.prompt ?? 0),
        completion: toNumber((e.pricing as Record<string, unknown> | undefined)?.completion ?? 0),
      },
    }),
  )
}

export function formatPricePerMillion(pricePerToken: number): string {
  if (pricePerToken < 0) return 'variable'
  if (pricePerToken === 0) return 'free'
  return `$${(pricePerToken * 1_000_000).toFixed(2)}/M`
}

export function formatCost(costUsd: number): string {
  if (costUsd <= 0) return 'free'
  if (costUsd < 0.01) return `$${costUsd.toFixed(4)}`
  return `$${costUsd.toFixed(2)}`
}

export interface StreamChatOptions {
  apiKey: string
  model: string
  messages: ChatMessage[]
  temperature: number
  maxTokens: number
  providerTag: string | null
  reasoning: boolean
  supportsReasoning: boolean
  signal?: AbortSignal
  onDelta: (chunk: string, fullContentSoFar: string) => void
  onReasoningDelta?: (fullReasoningSoFar: string) => void
}

export interface StreamChatResult {
  content: string
  reasoning: string
  cost: number | null
  promptTokens: number | null
  completionTokens: number | null
}

export async function fetchGenerationCost(apiKey: string, id: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/generation?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return null
    const json = await res.json()
    const cost = json.data?.total_cost
    return typeof cost === 'number' ? cost : null
  } catch {
    return null
  }
}

export async function streamChatCompletion(opts: StreamChatOptions): Promise<StreamChatResult> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    stream: true,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  }
  if (opts.providerTag) {
    body.provider = { order: [opts.providerTag], allow_fallbacks: false }
  }
  if (opts.reasoning && opts.supportsReasoning) {
    body.reasoning = { effort: 'medium' }
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
      'X-Title': 'AI UI',
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  if (!res.ok || !res.body) {
    let detail = ''
    try {
      const errJson = await res.json()
      detail = errJson?.error?.message ?? ''
    } catch {
      // ignore parse failure, fall back to status text
    }
    throw new Error(detail || `OpenRouter error ${res.status}: ${res.statusText}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let cost: number | null = null
  let promptTokens: number | null = null
  let completionTokens: number | null = null
  let generationId: string | null = null

  // Reasoning can arrive as a plain string OR as structured, independently
  // indexed blocks (providers vary) — never both at once for the same
  // stream, and blocks must be joined by index, not by chunk arrival order,
  // or concurrent blocks come out interleaved into a garbled mess.
  let plainReasoning = ''
  let usesStructuredReasoning = false
  const reasoningBlocks = new Map<number, string>()

  function currentReasoning(): string {
    if (!usesStructuredReasoning) return plainReasoning
    return [...reasoningBlocks.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, text]) => text)
      .join('\n\n')
  }

  // Some models (DeepSeek R1 and similar) don't use the reasoning/reasoning_details
  // fields at all — they inline their thinking as <think>...</think> right inside
  // `content`. Strip it out of the visible answer and route it into `plainReasoning`
  // instead, buffering across chunk boundaries in case a tag is split mid-stream.
  let insideThink = false
  let thinkBuffer = ''

  function longestTagPrefixOverlap(text: string, tag: string): number {
    const max = Math.min(text.length, tag.length - 1)
    for (let len = max; len > 0; len--) {
      if (text.endsWith(tag.slice(0, len))) return len
    }
    return 0
  }

  function consumeContentDelta(raw: string) {
    thinkBuffer += raw
    for (;;) {
      const tag = insideThink ? '</think>' : '<think>'
      const idx = thinkBuffer.indexOf(tag)
      if (idx === -1) {
        const hold = longestTagPrefixOverlap(thinkBuffer, tag)
        const emit = thinkBuffer.slice(0, thinkBuffer.length - hold)
        thinkBuffer = thinkBuffer.slice(thinkBuffer.length - hold)
        if (!emit) return
        if (insideThink) {
          plainReasoning += emit
          if (opts.reasoning && !usesStructuredReasoning) opts.onReasoningDelta?.(plainReasoning)
        } else {
          content += emit
          opts.onDelta(emit, content)
        }
        return
      }
      const before = thinkBuffer.slice(0, idx)
      thinkBuffer = thinkBuffer.slice(idx + tag.length)
      if (insideThink) {
        plainReasoning += before
        if (opts.reasoning && !usesStructuredReasoning) opts.onReasoningDelta?.(plainReasoning)
      } else if (before) {
        content += before
        opts.onDelta(before, content)
      }
      insideThink = !insideThink
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]' || data.length === 0) continue
      let json: Record<string, unknown>
      try {
        json = JSON.parse(data)
      } catch {
        continue
      }
      if (typeof json.id === 'string') generationId = json.id
      const choices = json.choices as Array<Record<string, unknown>> | undefined
      const delta = choices?.[0]?.delta as Record<string, unknown> | undefined
      const contentDelta = delta?.content
      if (typeof contentDelta === 'string' && contentDelta.length > 0) {
        consumeContentDelta(contentDelta)
      }
      const reasoningDetails = delta?.reasoning_details as Array<Record<string, unknown>> | undefined
      if (Array.isArray(reasoningDetails) && reasoningDetails.length > 0) {
        usesStructuredReasoning = true
        for (const block of reasoningDetails) {
          const text = block.type === 'reasoning.summary' ? block.summary : block.text
          if (typeof text !== 'string' || text.length === 0) continue
          const index = typeof block.index === 'number' ? block.index : 0
          reasoningBlocks.set(index, (reasoningBlocks.get(index) ?? '') + text)
        }
        if (opts.reasoning) opts.onReasoningDelta?.(currentReasoning())
      } else if (!usesStructuredReasoning && typeof delta?.reasoning === 'string' && delta.reasoning.length > 0) {
        plainReasoning += delta.reasoning
        if (opts.reasoning) opts.onReasoningDelta?.(plainReasoning)
      }
      const usage = json.usage as Record<string, unknown> | undefined
      if (usage) {
        if (typeof usage.cost === 'number') cost = usage.cost
        if (typeof usage.prompt_tokens === 'number') promptTokens = usage.prompt_tokens
        if (typeof usage.completion_tokens === 'number') completionTokens = usage.completion_tokens
      }
    }
  }

  if (cost === null && generationId) {
    cost = await fetchGenerationCost(opts.apiKey, generationId)
  }

  return { content, reasoning: opts.reasoning ? currentReasoning() : '', cost, promptTokens, completionTokens }
}
