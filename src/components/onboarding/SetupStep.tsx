import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ModelCombobox } from '@/components/shared/ModelCombobox'
import { ProviderSelect } from '@/components/shared/ProviderSelect'
import { createChat } from '@/hooks/useChats'
import { useModels } from '@/hooks/useOpenRouterData'
import { updateSettings } from '@/hooks/useSettings'
import { applyTheme, type Theme } from '@/lib/theme'
import { useUIStore } from '@/store/uiStore'

export function SetupStep() {
  const { models } = useModels()
  const [model, setModel] = useState('')
  const [provider, setProvider] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setView = useUIStore((s) => s.setView)
  const setActiveChatId = useUIStore((s) => s.setActiveChatId)

  function chooseTheme(next: Theme) {
    setTheme(next)
    applyTheme(next)
  }

  async function handleFinish() {
    if (!model || saving) return
    setSaving(true)
    setError(null)
    try {
      await updateSettings({
        onboarded: true,
        theme,
        defaultModel: model,
        defaultProvider: provider,
      })
      const contextLength = models.find((m) => m.id === model)?.contextLength
      const chatId = await createChat(model, provider, contextLength)
      setActiveChatId(chatId)
      setView('chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-foreground">Set your defaults</h1>
          <p className="text-sm text-muted-foreground">You can change these later in settings.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Default model</Label>
            <ModelCombobox
              value={model}
              onChange={(id) => {
                setModel(id)
                setProvider(null)
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Provider</Label>
            <ProviderSelect modelId={model || null} value={provider} onChange={setProvider} />
          </div>

          <div className="space-y-1.5">
            <Label>Theme</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => chooseTheme('light')}
                className="justify-center gap-2"
              >
                <Sun className="size-4" /> Light
              </Button>
              <Button
                type="button"
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => chooseTheme('dark')}
                className="justify-center gap-2"
              >
                <Moon className="size-4" /> Dark
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" disabled={!model || saving} onClick={handleFinish}>
            {saving ? 'Setting up…' : 'Finish setup'}
          </Button>
        </div>
      </div>
    </div>
  )
}
