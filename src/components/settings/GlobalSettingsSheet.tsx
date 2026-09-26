import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Moon, Pencil, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ModelCombobox } from '@/components/shared/ModelCombobox'
import { ProviderSelect } from '@/components/shared/ProviderSelect'
import { updateSettings, useSettings } from '@/hooks/useSettings'
import {
  applyFontFamily,
  applyFontSize,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  type FontFamily,
  type FontSize,
} from '@/lib/appearance'
import { applyTheme, type Theme } from '@/lib/theme'
import { useUIStore } from '@/store/uiStore'

export function GlobalSettingsSheet() {
  const open = useUIStore((s) => s.globalSettingsOpen)
  const setOpen = useUIStore((s) => s.setGlobalSettingsOpen)
  const settings = useSettings()
  const [editingKey, setEditingKey] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [visible, setVisible] = useState(false)

  if (!settings) return null

  function cancelKeyEdit() {
    setEditingKey(false)
    setNewKey('')
    setVisible(false)
  }

  function saveKey() {
    if (!newKey.trim()) return
    updateSettings({ apiKey: newKey.trim() })
    cancelKeyEdit()
  }

  function chooseTheme(theme: Theme) {
    applyTheme(theme)
    updateSettings({ theme })
  }

  function chooseFontFamily(fontFamily: FontFamily) {
    applyFontFamily(fontFamily)
    updateSettings({ fontFamily })
  }

  function chooseFontSize(fontSize: FontSize) {
    applyFontSize(fontSize)
    updateSettings({ fontSize })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-sm"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6">
          <div className="space-y-1.5">
            <Label>OpenRouter API key</Label>
            {editingKey ? (
              <>
                <InputGroup>
                  <InputGroupInput
                    type={visible ? 'text' : 'password'}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="sk-or-v1-…"
                    autoFocus
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      onClick={() => setVisible((v) => !v)}
                      aria-label={visible ? 'Hide key' : 'Show key'}
                    >
                      {visible ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="ghost" onClick={cancelKeyEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" disabled={!newKey.trim()} onClick={saveKey}>
                    Save
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 font-mono text-sm text-muted-foreground select-none">
                  <KeyRound className="size-3.5 shrink-0" />
                  <span className="truncate">{settings.apiKey ? '•••••••••••••' : 'Not set'}</span>
                </span>
                {settings.apiKey ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => setEditingKey(true)}
                        aria-label="Replace key"
                      >
                        <Pencil />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Replace key</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => setEditingKey(true)}>
                    Add key
                  </Button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Stored only in your browser.</p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Default model</Label>
            <ModelCombobox
              value={settings.defaultModel}
              onChange={(defaultModel) => updateSettings({ defaultModel, defaultProvider: null })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Default provider</Label>
            <ProviderSelect
              modelId={settings.defaultModel || null}
              value={settings.defaultProvider}
              onChange={(defaultProvider) => updateSettings({ defaultProvider })}
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Theme</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={settings.theme === 'light' ? 'default' : 'outline'}
                onClick={() => chooseTheme('light')}
                className="justify-center gap-2"
              >
                <Sun className="size-4" /> Light
              </Button>
              <Button
                type="button"
                variant={settings.theme === 'dark' ? 'default' : 'outline'}
                onClick={() => chooseTheme('dark')}
                className="justify-center gap-2"
              >
                <Moon className="size-4" /> Dark
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Font</Label>
            <Select value={settings.fontFamily} onValueChange={(v) => chooseFontFamily(v as FontFamily)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILY_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.stack }}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Font size</Label>
            <div className="grid grid-cols-3 gap-2">
              {FONT_SIZE_OPTIONS.map((size) => (
                <Button
                  key={size.value}
                  type="button"
                  variant={settings.fontSize === size.value ? 'default' : 'outline'}
                  onClick={() => chooseFontSize(size.value)}
                  className="justify-center"
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
