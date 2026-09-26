import { ChatWindow } from '@/components/chat/ChatWindow'
import { ChatSettingsSheet } from '@/components/settings/ChatSettingsSheet'
import { GlobalSettingsSheet } from '@/components/settings/GlobalSettingsSheet'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  return (
    <div className="flex h-svh flex-col bg-background">
      <TopBar />
      <ChatWindow />
      <Sidebar />
      <ChatSettingsSheet />
      <GlobalSettingsSheet />
    </div>
  )
}
