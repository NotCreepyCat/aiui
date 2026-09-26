import { ChevronDown, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '@/hooks/useChats'
import { useUIStore } from '@/store/uiStore'

export function TopBar() {
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const setChatSettingsOpen = useUIStore((s) => s.setChatSettingsOpen)
  const activeChatId = useUIStore((s) => s.activeChatId)
  const chat = useChat(activeChatId)

  return (
    <header className="flex h-13 shrink-0 items-center gap-1 border-b bg-background/80 px-2 backdrop-blur-sm">
      <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>
      <Button
        variant="ghost"
        className="min-w-0 flex-1 justify-start gap-1 px-2 font-medium"
        disabled={!chat}
        onClick={() => setChatSettingsOpen(true)}
      >
        <span className="truncate">{chat?.title ?? 'AI UI'}</span>
        {chat && <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />}
      </Button>
    </header>
  )
}
