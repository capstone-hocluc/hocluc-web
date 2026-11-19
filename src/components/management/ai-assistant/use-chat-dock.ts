import { useState } from 'react'

const STORAGE_KEY = 'hocluc.aiAssistant.chatDock'

/** Where the AI assistant sits: a panel beside the paper, or a bar floating at the bottom of it. */
export type ChatDock = 'side' | 'bottom'

function remembered(): ChatDock {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'bottom' ? 'bottom' : 'side'
  } catch {
    // Storage unavailable: the panel beside the paper.
    return 'side'
  }
}

/** The dock the viewer chose, kept between visits as a word processor keeps where its assistant sits. */
export function useChatDock() {
  const [dock, setDock] = useState<ChatDock>(remembered)
  const change = (next: ChatDock) => {
    setDock(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not kept for the next visit; this visit still uses it.
    }
  }
  return [dock, change] as const
}
