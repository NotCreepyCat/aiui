import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ModelCombobox } from '@/components/shared/ModelCombobox'
import { ProviderSelect } from '@/components/shared/ProviderSelect'
import { updateChat, useChat } from '@/hooks/useChats'
import { useModels } from '@/hooks/useOpenRouterData'
import type { PromptRole } from '@/lib/db'
import { useUIStore } from '@/store/uiStore'

const ROLES: PromptRole[] = ['system', 'user', 'assistant']

function RoleSelect({ value, onChange }: { value: PromptRole; onChange: (r: PromptRole) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PromptRole)}>
      <SelectTrigger size="sm" className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            {role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ChatSettingsSheet() {
  const open = useUIStore((s) => s.chatSettingsOpen)
  const setOpen = useUIStore((s) => s.setChatSettingsOpen)
  const activeChatId = useUIStore((s) => s.activeChatId)
  const chat = useChat(activeChatId)
  const { models } = useModels()
  const [tempDraft, setTempDraft] = useState(0)
  const [titleDraft, setTitleDraft] = useState('')
  const [contextSizeDraft, setContextSizeDraft] = useState('')
  const [maxTokensDraft, setMaxTokensDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [endOfPromptDraft, setEndOfPromptDraft] = useState('')

  // Drafts are the single source of truth for these inputs' displayed value —
  // re-syncing from `chat` on every keystroke's Dexie echo (instead of only
  // when switching chats) raced with typing and could clobber mid-edit text,
  // especially noticeable when editing from the middle of a longer field.
  useEffect(() => {
    if (!chat) return
    setTempDraft(chat.temperature)
    setTitleDraft(chat.title)
    setContextSizeDraft(String(chat.contextSize))
    setMaxTokensDraft(String(chat.maxTokens))
    setDescriptionDraft(chat.description.text)
    setEndOfPromptDraft(chat.endOfPrompt.text)
  }, [chat?.id, open])

  if (!chat) return null

  function commitTemperature(value: number) {
    const clamped = Math.min(2, Math.max(0, value))
    setTempDraft(clamped)
    updateChat(chat!.id, { temperature: clamped })
  }

  const selectedModel = models.find((m) => m.id === chat.model)
  const modelSupportsReasoning = selectedModel?.supportsReasoning ?? true
  const modelMaxContext = selectedModel?.contextLength || null
  const contextSizeExceeded = modelMaxContext != null && chat.contextSize > modelMaxContext

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-sm"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>Chat settings</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={titleDraft}
              onChange={(e) => {
                setTitleDraft(e.target.value)
                updateChat(chat.id, { title: e.target.value })
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Model</Label>
            <ModelCombobox
              value={chat.model}
              onChange={(model) => updateChat(chat.id, { model, provider: null })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Provider</Label>
            <ProviderSelect
              modelId={chat.model || null}
              value={chat.provider}
              onChange={(provider) => updateChat(chat.id, { provider })}
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Context size</Label>
            <Input
              type="number"
              min={1}
              aria-invalid={contextSizeExceeded}
              value={contextSizeDraft}
              onChange={(e) => {
                setContextSizeDraft(e.target.value)
                updateChat(chat.id, { contextSize: Number(e.target.value) || 0 })
              }}
            />
            {contextSizeExceeded && (
              <p className="text-xs text-destructive">
                Exceeds this model's max context ({modelMaxContext!.toLocaleString()}). Lower it.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Response length</Label>
            <Input
              type="number"
              min={1}
              value={maxTokensDraft}
              onChange={(e) => {
                setMaxTokensDraft(e.target.value)
                updateChat(chat.id, { maxTokens: Number(e.target.value) || 0 })
              }}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature-input">Temperature</Label>
              <Input
                id="temperature-input"
                type="number"
                min={0}
                max={2}
                step={0.01}
                value={tempDraft}
                onChange={(e) => setTempDraft(Number(e.target.value))}
                onBlur={() => commitTemperature(tempDraft)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
                className="h-7 w-20 text-right tabular-nums"
              />
            </div>
            <Slider
              min={0}
              max={2}
              step={0.01}
              value={[tempDraft]}
              onValueChange={([v]) => setTempDraft(v)}
              onValueCommit={([v]) => commitTemperature(v)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="reasoning-toggle">Reasoning</Label>
              <Switch
                id="reasoning-toggle"
                checked={chat.reasoningEnabled}
                onCheckedChange={(checked) => updateChat(chat.id, { reasoningEnabled: checked })}
              />
            </div>
            {!modelSupportsReasoning && (
              <p className="text-xs text-muted-foreground">This model doesn't support reasoning.</p>
            )}
          </div>

          <Separator />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <RoleSelect
                value={chat.description.role}
                onChange={(role) => updateChat(chat.id, { description: { ...chat.description, role } })}
              />
            </div>
            <Textarea
              value={descriptionDraft}
              onChange={(e) => {
                setDescriptionDraft(e.target.value)
                updateChat(chat.id, { description: { ...chat.description, text: e.target.value } })
              }}
              placeholder="Scenario, persona, system instructions…"
              className="min-h-24"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>End of prompt</Label>
              <RoleSelect
                value={chat.endOfPrompt.role}
                onChange={(role) => updateChat(chat.id, { endOfPrompt: { ...chat.endOfPrompt, role } })}
              />
            </div>
            <Textarea
              value={endOfPromptDraft}
              onChange={(e) => {
                setEndOfPromptDraft(e.target.value)
                updateChat(chat.id, { endOfPrompt: { ...chat.endOfPrompt, text: e.target.value } })
              }}
              placeholder="Sent as the last message before the model replies…"
              className="min-h-24"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
