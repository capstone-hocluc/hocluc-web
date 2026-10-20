import { request } from '../lib/api'

export interface UserNotification {
  id: string
  type: string
  title: string
  message: string | null
  entityType: string | null
  entityId: string | null
  read: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationPage {
  content: UserNotification[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  last?: boolean
}

const prefix = '/api/v1/notifications'
const options = { auth: true, guardIdentity: true } as const

export async function getNotifications(page = 0): Promise<NotificationPage> {
  const response = await request<NotificationPage>(`${prefix}?page=${page}&size=20`, options)
  const data = response.data
  if (!data || !Array.isArray(data.content) || !Number.isInteger(data.pageNumber) || data.pageNumber < 0 ||
    !Number.isInteger(data.totalPages) || data.totalPages < 0 || typeof data.totalElements !== 'number' ||
    data.content.some(item => !item || typeof item.id !== 'string' || !item.id || typeof item.title !== 'string' ||
      typeof item.read !== 'boolean' || typeof item.createdAt !== 'string' ||
      (item.message !== null && typeof item.message !== 'string'))) {
    throw new Error('Không nhận được danh sách thông báo hợp lệ.')
  }
  return data
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await request<{ unread: number }>(`${prefix}/unread-count`, options)
  const count = response.data?.unread
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    throw new Error('Không thể tải số thông báo chưa đọc.')
  }
  return count
}

export async function markNotificationRead(id: string): Promise<UserNotification> {
  const response = await request<UserNotification>(`${prefix}/${encodeURIComponent(id)}/read`, {
    ...options, method: 'PATCH',
  })
  if (!response.data || response.data.id !== id || response.data.read !== true) {
    throw new Error('Chưa xác nhận được trạng thái đã đọc. Vui lòng tải lại thông báo.')
  }
  return response.data
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await request<{ marked: number }>(`${prefix}/read-all`, { ...options, method: 'PATCH' })
  if (typeof response.data?.marked !== 'number' || response.data.marked < 0) {
    throw new Error('Chưa xác nhận được trạng thái đã đọc tất cả. Vui lòng tải lại thông báo.')
  }
}
