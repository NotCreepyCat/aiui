import { useMemo, useState } from 'react'
import { MessageSquarePlus, Search, Settings, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { createChat, deleteChat, deleteChatIfEmpty, useChats } from '@/hooks/useChats'
import { useChatMessageMatches } from '@/hooks/useMessages'
import { useModels } from '@/hooks/useOpenRouterData'
import { useSettings } from '@/hooks/useSettings'
import { extractSnippet, type SearchSnippet } from '@/lib/searchSnippet'
import { cn } from 'cn'
import { useUIStore } from '@/store/uiStore'

function HighlightedText({ text, matchStart, matchLength }: SearchSnippet) {
  const before = text.slice(0, matchStart)
  const match = text.slice(matchStart, matchStart + matchLength)
  const after = text.slice(matchStart + matchLength)
  return (
    <>
      {before}
      <mark className="rounded-sm bg-primary/25 text-inherit">{match}</mark>
      {after}
    </>
  )
}

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const activeChatId = useUIStore((s) => s.activeChatId)
  const setActiveChatId = useUIStore((s) => s.setActiveChatId)
  const setGlobalSettingsOpen = useUIStore((s) => s.setGlobalSettingsOpen)
  const chats = useChats()
  const settings = useSettings()
  const { models } = useModels()
  const [query, setQuery] = useState('')
  const isSearching = query.trim().length > 0
  const messageMatches = useChatMessageMatches(query)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return chats.map((chat) => ({ chat, titleMatch: null, messageMatch: null }) as const)
    return chats
      .map((chat) => ({
        chat,
        titleMatch: extractSnippet(chat.title, q),
        messageMatch: messageMatches?.get(chat.id) ?? null,
      }))
      .filter((entry) => entry.titleMatch || entry.messageMatch)
  }, [chats, query, messageMatches])

  async function handleNewChat() {
    if (!settings) return
    const previousId = activeChatId
    const contextLength = models.find((m) => m.id === settings.defaultModel)?.contextLength
    const id = await createChat(settings.defaultModel, settings.defaultProvider, contextLength)
    setActiveChatId(id)
    setSidebarOpen(false)
    if (previousId) void deleteChatIfEmpty(previousId)
  }

  function handleDeleteClick(e: React.MouseEvent, chatId: string) {
    e.stopPropagation()
    setPendingDeleteId(chatId)
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return
    const chatId = pendingDeleteId
    setPendingDeleteId(null)
    await deleteChat(chatId)
    if (activeChatId === chatId) {
      const next = chats.find((c) => c.id !== chatId)
      setActiveChatId(next?.id ?? null)
    }
  }

  const pendingDeleteChat = chats.find((c) => c.id === pendingDeleteId)

  return (
    <>
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="flex w-3/4 max-w-xs flex-col gap-0 p-0">
          <SheetHeader className="p-3 pb-2">
            <SheetTitle className="sr-only">Chats</SheetTitle>
            <Button className="w-full justify-start gap-2" onClick={handleNewChat}>
              <MessageSquarePlus className="size-4" />
              New chat
            </Button>
          </SheetHeader>

          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats…"
                className="pl-8 pr-8"
              />
              {isSearching && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No chats found.</p>
            )}
            {filtered.map(({ chat, titleMatch, messageMatch }) => (
              <button
                key={chat.id}
                onClick={() => {
                  const previousId = activeChatId
                  setActiveChatId(chat.id)
                  setSidebarOpen(false)
                  if (previousId && previousId !== chat.id) void deleteChatIfEmpty(previousId)
                }}
                className={cn(
                  'group flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent',
                  chat.id === activeChatId && 'bg-accent',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="w-full truncate">
                    {titleMatch ? <HighlightedText {...titleMatch} /> : chat.title}
                  </span>
                  {messageMatch && (
                    <span className="line-clamp-4 w-full text-xs break-words text-muted-foreground">
                      <HighlightedText {...messageMatch} />
                    </span>
                  )}
                </div>
                {!isSearching && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleDeleteClick(e, chat.id)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete chat"
                  >
                    <X className="size-3.5" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => setGlobalSettingsOpen(true)}
            >
              <Settings className="size-4" />
              Settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDeleteChat?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the whole conversation. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
