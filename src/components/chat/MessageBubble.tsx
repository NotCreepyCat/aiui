import { useState } from 'react'
import { Brain, ChevronLeft, ChevronRight, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { activeVariant, type ChatMessageRecord } from '@/lib/db'
import { formatMessageText } from '@/lib/formatText'
import { formatCost } from '@/lib/openrouter'
import { cn } from 'cn'

interface MessageBubbleProps {
  message: ChatMessageRecord
  liveText: string | null
  liveReasoning: string | null
  errorText: string | null
  actionsDisabled: boolean
  isStreamingThis: boolean
  onEdit: (content: string) => void
  onDelete: () => void
  onRegenerate: () => void
  onSwipe: (direction: -1 | 1) => void
}

export function MessageBubble({
  message,
  liveText,
  liveReasoning,
  errorText,
  actionsDisabled,
  isStreamingThis,
  onEdit,
  onDelete,
  onRegenerate,
  onSwipe,
}: MessageBubbleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const variant = activeVariant(message)
  const content = liveText ?? variant?.content ?? ''
  const reasoningText = liveReasoning ?? variant?.reasoning ?? ''
  const isUser = message.role === 'user'
  const variantCount = message.variants.length

  function startEdit() {
    setDraft(content)
    setEditing(true)
  }

  function saveEdit() {
    onEdit(draft)
    setEditing(false)
  }

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      {!isUser && !editing && reasoningText && (
        <details
          className="w-full max-w-[85%] rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground open:pb-2.5"
          open={isStreamingThis || undefined}
        >
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium select-none">
            <Brain className="size-3.5" />
            Reasoning
          </summary>
          <div className="mt-1.5 whitespace-pre-wrap italic opacity-80">{reasoningText}</div>
        </details>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap',
          isUser
            ? 'border border-bubble-user-border bg-bubble-user text-bubble-user-foreground'
            : 'bg-bubble-assistant text-bubble-assistant-foreground',
        )}
      >
        {editing ? (
          <div className="flex min-w-64 flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="min-h-20 bg-background! text-foreground! dark:bg-background!"
            />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit}>
                Save
              </Button>
            </div>
          </div>
        ) : errorText ? (
          <span className="text-destructive">{errorText}</span>
        ) : content ? (
          // While actively streaming, render the raw string — re-tokenizing
          // into a dynamically-keyed node array on every single token and
          // re-diffing it dozens of times a second is what let text land in
          // the wrong spot. Once the message settles, format it properly.
          isStreamingThis ? (
            content
          ) : (
            formatMessageText(content)
          )
        ) : isStreamingThis ? (
          <Loader2 className="size-4 animate-spin opacity-60" />
        ) : null}
      </div>

      {!editing && (
        <div className="flex items-center gap-0.5 px-1 text-muted-foreground">
          {variantCount > 1 && (
            <div className="mr-1 flex items-center gap-0.5">
              <button
                className="rounded p-1 hover:bg-accent disabled:opacity-30"
                disabled={actionsDisabled || message.activeVariantIndex === 0}
                onClick={() => onSwipe(-1)}
                aria-label="Previous variant"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="text-xs tabular-nums">
                {message.activeVariantIndex + 1}/{variantCount}
              </span>
              <button
                className="rounded p-1 hover:bg-accent disabled:opacity-30"
                disabled={actionsDisabled || message.activeVariantIndex === variantCount - 1}
                onClick={() => onSwipe(1)}
                aria-label="Next variant"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}

          <button
            className="rounded p-1 hover:bg-accent disabled:opacity-30"
            disabled={actionsDisabled}
            onClick={startEdit}
            aria-label="Edit"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            className="rounded p-1 hover:bg-accent disabled:opacity-30"
            disabled={actionsDisabled}
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>

          {!isUser && (
            <>
              <button
                className="rounded p-1 hover:bg-accent disabled:opacity-30"
                disabled={actionsDisabled}
                onClick={onRegenerate}
                aria-label="Regenerate"
              >
                <RefreshCw className="size-3.5" />
              </button>
              {variant?.cost != null && (
                <span className="ml-1 text-xs tabular-nums">{formatCost(variant.cost)}</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
