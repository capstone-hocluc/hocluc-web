import { API_BASE_URL, request, requestBlob } from '../lib/api'
import type {
  ChatAttachment, ChatCapabilities, ChatConversation, ChatConversationFilters,
  ChatManagementConversation, ChatMessage, ChatPerson, ChatUploadReservation,
  CreateChatConversation, CursorPage, MentorWorkingHours, SendChatMessage,
} from '../types/chat'

const PREFIX = '/api/v1/chat'
const part = encodeURIComponent
function query(values: object = {}) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  return params.size ? `?${params}` : ''
}
const conversation = (id: string) => `${PREFIX}/conversations/${part(id)}`

async function downloadAttachmentContent(conversationId: string, attachmentId: string): Promise<Blob> {
  const response = await request<{ downloadUrl: string; expiresAt: string }>(
    `${conversation(conversationId)}/attachments/${part(attachmentId)}/download-url`,
    { auth: true }
  )
  let url: URL
  try { url = new URL(response.data?.downloadUrl ?? '', API_BASE_URL) }
  catch { throw new Error('Đường dẫn tệp không hợp lệ.') }
  const expectedPath = `${conversation(conversationId)}/attachments/${part(attachmentId)}/content`
  if (url.origin !== new URL(API_BASE_URL).origin || url.pathname !== expectedPath || url.search || url.hash) {
    throw new Error('Đường dẫn tệp không hợp lệ.')
  }
  return requestBlob(url.pathname, { auth: true })
}

export const chatService = {
  listSubjects: () => request<{ id: string; name: string }[]>(`${PREFIX}/subjects`, { auth: true }),
  capabilities: () => request<ChatCapabilities>(`${PREFIX}/capabilities`, { auth: true }),
  listConversations: (filters: ChatConversationFilters = {}) =>
    request<CursorPage<ChatConversation>>(`${PREFIX}/conversations${query(filters)}`, { auth: true }),
  getConversation: (id: string) => request<ChatConversation>(conversation(id), { auth: true }),
  listMessages: (id: string, paging: { afterSequence?: number; beforeSequence?: number; limit?: number } = {}) => {
    if (paging.afterSequence !== undefined && paging.beforeSequence !== undefined) {
      throw new Error('Chỉ được dùng một hướng tải lịch sử.')
    }
    return request<CursorPage<ChatMessage>>(`${conversation(id)}/messages${query(paging)}`, { auth: true })
  },
  createConversation: (body: CreateChatConversation) =>
    request<ChatConversation>(`${PREFIX}/conversations`, { method: 'POST', auth: true, body }),
  sendMessage: (id: string, body: SendChatMessage) =>
    request<ChatMessage>(`${conversation(id)}/messages`, { method: 'POST', auth: true, body }),
  markRead: (id: string, lastReadSequence: number) =>
    request<void>(`${conversation(id)}/read`, { method: 'PUT', auth: true, body: { lastReadSequence } }),
  resolve: (id: string) => request<ChatConversation>(`${conversation(id)}/status`, {
    method: 'PATCH', auth: true, body: { status: 'RESOLVED' },
  }),
  listManagementConversations: (filters: ChatConversationFilters = {}) =>
    request<CursorPage<ChatManagementConversation>>(`${PREFIX}/management/conversations${query(filters)}`, { auth: true }),
  getManagementConversation: (id: string) =>
    request<ChatManagementConversation>(`${PREFIX}/management/conversations/${part(id)}`, { auth: true }),
  listMentors: (filters: { conversationId: string; cursor?: string; search?: string; limit?: number }) =>
    request<CursorPage<ChatPerson>>(`${PREFIX}/management/mentors${query(filters)}`, { auth: true }),
  assign: (id: string, body: { mentorId: string; expectedAssignmentVersion: number; reason: string }) =>
    request<ChatManagementConversation>(`${PREFIX}/management/conversations/${part(id)}/assignment`, { method: 'PUT', auth: true, body }),
  getWorkingHours: (mentorId: string) =>
    request<MentorWorkingHours>(`${PREFIX}/mentors/${part(mentorId)}/working-hours`, { auth: true }),
  updateWorkingHours: (mentorId: string, body: MentorWorkingHours) =>
    request<MentorWorkingHours>(`${PREFIX}/mentors/${part(mentorId)}/working-hours`, { method: 'PUT', auth: true, body }),
  reserveAttachment: (id: string, file: { name: string; mimeType: string; sizeBytes: number }) =>
    request<ChatUploadReservation>(`${conversation(id)}/attachments/upload-url`, { method: 'POST', auth: true, body: file }),
  completeAttachment: (id: string, attachmentId: string) =>
    request<ChatAttachment>(`${conversation(id)}/attachments/${part(attachmentId)}/complete`, { method: 'POST', auth: true }),
  getAttachmentDownload: (id: string, attachmentId: string) =>
    request<{ downloadUrl: string; expiresAt: string }>(`${conversation(id)}/attachments/${part(attachmentId)}/download-url`, { auth: true }),
  downloadAttachmentContent,
  uploadAttachment: async (reservation: ChatUploadReservation, file: File) => {
    const url = new URL(reservation.uploadUrl)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Đường dẫn tải tệp không hợp lệ.')
    const response = await fetch(reservation.uploadUrl, { method: 'PUT', headers: reservation.headers, body: file })
    if (!response.ok) throw new Error('Tải tệp không thành công. Vui lòng thử lại.')
  },
}
