import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { updateSettings } from '@/hooks/useSettings'
import { useUIStore } from '@/store/uiStore'

export function ApiKeyStep() {
  const [key, setKey] = useState('')
  const [visible, setVisible] = useState(false)
  const setView = useUIStore((s) => s.setView)

  const canContinue = key.trim().length > 0

  async function handleContinue() {
    if (!canContinue) return
    await updateSettings({ apiKey: key.trim() })
    setView('onboarding-setup')
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="size-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Connect OpenRouter</h1>
            <p className="text-sm text-muted-foreground">
              Get your API key at{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                openrouter.ai/keys
              </a>
              . It's stored only in your browser.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <InputGroup>
            <InputGroupInput
              type={visible ? 'text' : 'password'}
              placeholder="sk-or-v1-…"
              value={key}
              autoFocus
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleContinue()
              }}
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

          <Button className="w-full" disabled={!canContinue} onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
