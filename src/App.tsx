import { useEffect, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ApiKeyStep } from '@/components/onboarding/ApiKeyStep'
import { SetupStep } from '@/components/onboarding/SetupStep'
import { useChats } from '@/hooks/useChats'
import { ensureSettings, useSettings } from '@/hooks/useSettings'
import { applyFontFamily, applyFontSize } from '@/lib/appearance'
import { applyTheme } from '@/lib/theme'
import { useUIStore } from '@/store/uiStore'

export default function App() {
  const settings = useSettings()
  const chats = useChats()
  const view = useUIStore((s) => s.view)
  const setView = useUIStore((s) => s.setView)
  const activeChatId = useUIStore((s) => s.activeChatId)
  const setActiveChatId = useUIStore((s) => s.setActiveChatId)
  const initialized = useRef(false)

  useEffect(() => {
    void ensureSettings()
  }, [])

  useEffect(() => {
    if (!settings || initialized.current) return
    initialized.current = true
    applyTheme(settings.theme)
    applyFontFamily(settings.fontFamily)
    applyFontSize(settings.fontSize)
    if (settings.onboarded) {
      setView('chat')
    } else if (settings.apiKey) {
      setView('onboarding-setup')
    } else {
      setView('onboarding-key')
    }
  }, [settings, setView])

  useEffect(() => {
    if (settings) applyTheme(settings.theme)
  }, [settings?.theme])

  useEffect(() => {
    if (settings) applyFontFamily(settings.fontFamily)
  }, [settings?.fontFamily])

  useEffect(() => {
    if (settings) applyFontSize(settings.fontSize)
  }, [settings?.fontSize])

  useEffect(() => {
    if (view === 'chat' && activeChatId === null && chats.length > 0) {
      setActiveChatId(chats[0].id)
    }
  }, [view, activeChatId, chats, setActiveChatId])

  if (view === 'loading') {
    return <div className="h-svh bg-background" />
  }
  if (view === 'onboarding-key') return <ApiKeyStep />
  if (view === 'onboarding-setup') return <SetupStep />
  return <AppShell />
}
