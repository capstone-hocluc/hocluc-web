import { createContext, useContext } from 'react'
import type { NotificationPage, UserNotification } from '../services/notificationService'

export interface NotificationFeed {
  page: NotificationPage | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string
  unread: number | null
  countError: boolean
  busy: string | null
  mutationError: string
  loadPage: (page?: number) => Promise<void>
  refreshCount: () => Promise<void>
  markRead: (notification: UserNotification) => Promise<void>
  markAllRead: () => Promise<void>
}

export const NotificationContext = createContext<NotificationFeed | null>(null)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('NotificationProvider is required.')
  return context
}
