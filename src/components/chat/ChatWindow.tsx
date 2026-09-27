import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { DeleteMessageDialog } from './DeleteMessageDialog'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { updateChat, touchChat, useChat } from '@/hooks/useChats'
import {
  addAssistantPlaceholder,
  addEditedVariant,
  addUserMessage,
  addVariantForRegenerate,
  deleteMessage,
  finalizeVariant,
  setActiveVariantIndex,
  useMessages,
} from '@/hooks/useMessages'
import { useModels } from '@/hooks/useOpenRouterData'
import { useSettings } from '@/hooks/useSettings'
import { activeVariant, type ChatMessageRecord } from '@/lib/db'
import { streamChatCompletion, type ChatMessage } from '@/lib/openrouter'
import { buildPromptMessages } from '@/lib/promptBuilder'
import { useUIStore } from '@/store/uiStore'

export function ChatWindow() {
  const activeChatId = useUIStore((s) => s.activeChatId)
  const chat = useChat(activeChatId)
  const settings = useSettings()
  const messages = useMessages(activeChatId)
  const { models } = useModels()

  const streamingMessageId = useUIStore((s) => s.streamingMessageId)
  const setStreamingMessageId = useUIStore((s) => s.setStreamingMessageId)
  const setAbortController = useUIStore((s) => s.setAbortController)
  const abortController = useUIStore((s) => s.abortController)
  const deleteConfirmSnoozeUntil = useUIStore((s) => s.deleteConfirmSnoozeUntil)
  const setDeleteConfirmSnoozeUntil = useUIStore((s) => s.setDeleteConfirmSnoozeUntil)

  const [liveText, setLiveText] = useState('')
  const liveTextRef = useRef('')
  const liveTextFrameRef = useRef<number | null>(null)
  const [liveReasoning, setLiveReasoning] = useState('')
  const liveReasoningRef = useRef('')
  const liveReasoningFrameRef = useRef<number | null>(null)

  // Fast models can fire many delta chunks per frame — pushing a React state
  // update on every single one is what caused the live preview to visibly
  // scramble. Coalesce to at most one state update per animation frame.
  function scheduleLiveTextUpdate() {
    if (liveTextFrameRef.current != null) return
    liveTextFrameRef.current = requestAnimationFrame(() => {
      liveTextFrameRef.current = null
      setLiveText(liveTextRef.current)
    })
  }
  function scheduleLiveReasoningUpdate() {
    if (liveReasoningFrameRef.current != null) return
    liveReasoningFrameRef.current = requestAnimationFrame(() => {
      liveReasoningFrameRef.current = null
      setLiveReasoning(liveReasoningRef.current)
    })
  }
  function cancelScheduledLiveUpdates() {
    if (liveTextFrameRef.current != null) {
      cancelAnimationFrame(liveTextFrameRef.current)
      liveTextFrameRef.current = null
    }
    if (liveReasoningFrameRef.current != null) {
      cancelAnimationFrame(liveReasoningFrameRef.current)
      liveReasoningFrameRef.current = null
    }
  }
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [contextBannerDismissedFor, setContextBannerDismissedFor] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distanceFromBottom < 80
  }

  // A new message (send, regenerate, edit-branch, delete…) is something the
  // user just triggered — snap to bottom for it regardless of scroll position.
  useEffect(() => {
    stickToBottomRef.current = true
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])

  // Token-by-token streaming updates should only follow the bottom if the
  // user hasn't scrolled away to read something else during generation.
  useEffect(() => {
    if (!stickToBottomRef.current) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [liveText, liveReasoning])

  const isStreaming = streamingMessageId !== null

  async function runGeneration(messageId: string, variantIndex: number, history: ChatMessage[]) {
    if (!chat || !settings) return
    setErrors((e) => ({ ...e, [messageId]: '' }))
    const controller = new AbortController()
    setAbortController(controller)
    setStreamingMessageId(messageId)
    cancelScheduledLiveUpdates()
    liveTextRef.current = ''
    setLiveText('')
    liveReasoningRef.current = ''
    setLiveReasoning('')

    const model = models.find((m) => m.id === chat.model)

    try {
      const { messages: promptMessages } = buildPromptMessages({
        description: chat.description,
        endOfPrompt: chat.endOfPrompt,
        history,
        contextSize: chat.contextSize,
      })
      const result = await streamChatCompletion({
        apiKey: settings.apiKey,
        model: chat.model,
        messages: promptMessages,
        temperature: chat.temperature,
        maxTokens: chat.maxTokens,
        providerTag: chat.provider,
        reasoning: chat.reasoningEnabled,
        supportsReasoning: model?.supportsReasoning ?? true,
        signal: controller.signal,
        onDelta: (_chunk, fullText) => {
          liveTextRef.current = fullText
          scheduleLiveTextUpdate()
        },
        onReasoningDelta: (fullReasoning) => {
          liveReasoningRef.current = fullReasoning
          scheduleLiveReasoningUpdate()
        },
      })
      await finalizeVariant(messageId, variantIndex, { ...result, reasoning: result.reasoning || null })
    } catch (err) {
      if (controller.signal.aborted || liveTextRef.current) {
        await finalizeVariant(messageId, variantIndex, {
          content: liveTextRef.current,
          reasoning: liveReasoningRef.current || null,
          cost: null,
          promptTokens: null,
          completionTokens: null,
        })
      } else {
        const message = err instanceof Error ? err.message : String(err)
        setErrors((e) => ({ ...e, [messageId]: message }))
      }
    } finally {
      cancelScheduledLiveUpdates()
      setStreamingMessageId(null)
      setAbortController(null)
      liveTextRef.current = ''
      setLiveText('')
      liveReasoningRef.current = ''
      setLiveReasoning('')
    }
  }

  function historyBefore(order: number): ChatMessage[] {
    return messages
      .filter((m) => m.order < order)
      .map((m) => ({ role: m.role, content: activeVariant(m)?.content ?? '' }))
  }

  async function handleSend(text: string) {
    if (!chat) return
    await addUserMessage(chat.id, text)
    if (chat.title === 'New chat') {
      await updateChat(chat.id, { title: text.slice(0, 40) })
    } else {
      await touchChat(chat.id)
    }
    const assistantId = await addAssistantPlaceholder(chat.id)
    const history: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: activeVariant(m)?.content ?? '' })),
      { role: 'user' as const, content: text },
    ]
    await runGeneration(assistantId, 0, history)
  }

  async function handleRegenerate(message: ChatMessageRecord) {
    if (isStreaming) return
    const variantIndex = await addVariantForRegenerate(message.id)
    await runGeneration(message.id, variantIndex, historyBefore(message.order))
  }

  async function handleEditUserMessage(message: ChatMessageRecord, content: string) {
    await addEditedVariant(message.id, content)
    if (isStreaming) return
    await touchChat(message.chatId)
    const history: ChatMessage[] = [...historyBefore(message.order), { role: 'user', content }]
    const index = messages.findIndex((m) => m.id === message.id)
    const next = index >= 0 ? messages[index + 1] : undefined
    if (next && next.role === 'assistant') {
      const variantIndex = await addVariantForRegenerate(next.id)
      await runGeneration(next.id, variantIndex, history)
    } else {
      const assistantId = await addAssistantPlaceholder(message.chatId)
      await runGeneration(assistantId, 0, history)
    }
  }

  async function handleSwipe(message: ChatMessageRecord, direction: -1 | 1) {
    const next = message.activeVariantIndex + direction
    if (next < 0 || next >= message.variants.length) return
    await setActiveVariantIndex(message.id, next)
  }

  function handleStop() {
    abortController?.abort()
  }

  function handleDeleteClick(messageId: string) {
    if (Date.now() < deleteConfirmSnoozeUntil) {
      void deleteMessage(messageId)
      return
    }
    setPendingDeleteId(messageId)
  }

  function handleConfirmDelete(snoozeUntil: number | null) {
    if (pendingDeleteId) void deleteMessage(pendingDeleteId)
    if (snoozeUntil) setDeleteConfirmSnoozeUntil(snoozeUntil)
    setPendingDeleteId(null)
  }

  if (!chat || !settings) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>
    )
  }

  const currentHistory: ChatMessage[] = messages.map((m) => ({
    role: m.role,
    content: activeVariant(m)?.content ?? '',
  }))
  const { truncated: historyTruncated } = buildPromptMessages({
    description: chat.description,
    endOfPrompt: chat.endOfPrompt,
    history: currentHistory,
    contextSize: chat.contextSize,
  })
  const modelMaxContext = models.find((m) => m.id === chat.model)?.contextLength || null
  const canRaiseContext = modelMaxContext == null || chat.contextSize < modelMaxContext
  const showContextBanner = historyTruncated && contextBannerDismissedFor !== chat.id

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showContextBanner && (
        <div className="flex items-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="flex-1">
            Older messages don't fit and are being left out.
            {canRaiseContext && ' Raise Context size in chat settings.'}
          </span>
          <button
            onClick={() => setContextBannerDismissedFor(chat.id)}
            className="shrink-0 rounded p-0.5 hover:bg-amber-500/20"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              Start the conversation…
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              liveText={message.id === streamingMessageId ? liveText : null}
              liveReasoning={message.id === streamingMessageId ? liveReasoning : null}
              errorText={errors[message.id] || null}
              actionsDisabled={isStreaming}
              isStreamingThis={message.id === streamingMessageId}
              onEdit={(content) =>
                message.role === 'user'
                  ? void handleEditUserMessage(message, content)
                  : void addEditedVariant(message.id, content)
              }
              onDelete={() => handleDeleteClick(message.id)}
              onRegenerate={() => void handleRegenerate(message)}
              onSwipe={(direction) => void handleSwipe(message, direction)}
            />
          ))}
        </div>
      </div>
      <MessageInput
        disabled={isStreaming || !settings.apiKey}
        isStreaming={isStreaming}
        onSend={(text) => void handleSend(text)}
        onStop={handleStop}
      />
      <DeleteMessageDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
