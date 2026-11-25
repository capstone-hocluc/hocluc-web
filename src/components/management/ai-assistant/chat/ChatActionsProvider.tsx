import type { ReactNode } from 'react'
import { ChatActionsContext, type ChatActions } from './chat-actions'

export function ChatActionsProvider({ value, children }: { value: ChatActions; children: ReactNode }) {
  return <ChatActionsContext.Provider value={value}>{children}</ChatActionsContext.Provider>
}
