export type ChatStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
export interface ChatPerson { id: string; displayName: string }
export interface ChatCapabilities {
  canCreate: boolean; canSend?: boolean; reason?: string; attachmentsEnabled: boolean
  maxFileBytes?: number; maxAttachments?: number
}
export interface ChatAttachment { id: string; name: string; mimeType: string; sizeBytes: number }
export interface ChatContextSnapshot {
  source: string; problem?: string; solution?: string; conversationExcerpt?: string
  courseId?: string; groupId?: string; lessonId?: string
}
export interface ChatConversation {
  id: string; title: string; status: ChatStatus; student: ChatPerson; mentor?: ChatPerson
  subjectCategoryId: string; subjectName?: string; lastMessagePreview?: string
  lastSequence: number; lastReadSequence: number; unreadCount: number
  canSend: boolean; sendDisabledReason?: string; assignmentVersion: number
  contextSnapshot?: ChatContextSnapshot
  mentorAvailability?: { isWorkingNow: boolean; label: string }; updatedAt: string
}
// Management endpoints deliberately return metadata, never the transcript or snapshot.
export type ChatManagementConversation = Omit<ChatConversation, 'contextSnapshot' | 'lastMessagePreview' | 'canSend' | 'sendDisabledReason'>
export interface ChatMessage {
  id: string; conversationId: string; sequence: number; senderId: string
  senderName: string; body: string; createdAt: string; attachments: ChatAttachment[]
}
export interface CursorPage<T> { items: T[]; nextCursor: string | null }
export interface ChatConversationFilters {
  cursor?: string; status?: ChatStatus; unread?: boolean; search?: string
  subjectCategoryId?: string; limit?: number
}
export interface CreateChatConversation {
  title: string; subjectCategoryId: string; initialMessage: string; clientRequestId: string
  contextSnapshot?: ChatContextSnapshot; attachmentIds?: string[]
}
export interface SendChatMessage { body: string; clientMessageId: string; attachmentIds?: string[] }
export interface MentorWorkingHours {
  // ISO weekdays 1 (Monday)–7 (Sunday), half-open local intervals.
  // startLocal: 00:00–23:59; endLocal: 00:00–23:59 or 24:00 (day end).
  timezone: string; intervals: { dayOfWeek: number; startLocal: string; endLocal: string }[]
}
export interface ChatUploadReservation {
  attachmentId: string; uploadUrl: string; expiresAt: string; headers?: Record<string, string>
}
export interface ChatEvent {
  type: 'message.created' | 'conversation.assigned' | 'conversation.resolved' | 'message.read' | 'typing'
  eventId?: string; conversationId: string; messageId?: string; sequence?: number
  assignmentVersion?: number; userId?: string; lastReadSequence?: number; isTyping?: boolean
}
