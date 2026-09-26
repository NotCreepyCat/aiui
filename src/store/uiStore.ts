import { create } from 'zustand'

export type View = 'loading' | 'onboarding-key' | 'onboarding-setup' | 'chat'

interface UIState {
  view: View
  setView: (v: View) => void
  activeChatId: string | null
  setActiveChatId: (id: string | null) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  chatSettingsOpen: boolean
  setChatSettingsOpen: (open: boolean) => void
  globalSettingsOpen: boolean
  setGlobalSettingsOpen: (open: boolean) => void
  streamingMessageId: string | null
  setStreamingMessageId: (id: string | null) => void
  abortController: AbortController | null
  setAbortController: (c: AbortController | null) => void
  /** Timestamp (ms) until which the "delete message" confirmation is skipped. */
  deleteConfirmSnoozeUntil: number
  setDeleteConfirmSnoozeUntil: (ts: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  view: 'loading',
  setView: (view) => set({ view }),
  activeChatId: null,
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  chatSettingsOpen: false,
  setChatSettingsOpen: (chatSettingsOpen) => set({ chatSettingsOpen }),
  globalSettingsOpen: false,
  setGlobalSettingsOpen: (globalSettingsOpen) => set({ globalSettingsOpen }),
  streamingMessageId: null,
  setStreamingMessageId: (streamingMessageId) => set({ streamingMessageId }),
  abortController: null,
  setAbortController: (abortController) => set({ abortController }),
  deleteConfirmSnoozeUntil: 0,
  setDeleteConfirmSnoozeUntil: (deleteConfirmSnoozeUntil) => set({ deleteConfirmSnoozeUntil }),
}))
