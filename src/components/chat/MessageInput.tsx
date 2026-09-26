import { useRef, useState } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface MessageInputProps {
  disabled: boolean
  isStreaming: boolean
  onSend: (text: string) => void
  onStop: () => void
}

export function MessageInput({ disabled, isStreaming, onSend, onStop }: MessageInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    requestAnimationFrame(autoGrow)
  }

  return (
    <div className="shrink-0 border-t bg-background p-3">
      <div className="flex items-end gap-2 rounded-2xl border bg-muted/40 p-1.5 pl-3.5 focus-within:ring-2 focus-within:ring-ring/50">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            autoGrow()
          }}
          rows={1}
          className="max-h-50 min-h-9 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
        {isStreaming ? (
          <Button size="icon" className="shrink-0 rounded-full" onClick={onStop} aria-label="Stop">
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="shrink-0 rounded-full"
            disabled={disabled || !text.trim()}
            onClick={handleSend}
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
