import type { AiReadingPermission, AiReadingPermissionAnswer, AiReadingPermissionConfig } from '../../../../services/aiAssistantService'
import type { AiChatMessage } from '../exam-format'

type PermissionMessage = Pick<AiChatMessage, 'id' | 'role' | 'permission'>
export type ReadingPermissionState = 'actionable' | 'inert' | AiReadingPermissionAnswer

export interface ReadingPermissionPart {
  messageId: string
  parts: string[]
  state: ReadingPermissionState
}

/** A newer teacher turn invalidates old requests, including when an earlier branch is on screen. */
export function latestReadingPermissionId(shown: readonly PermissionMessage[], all: readonly PermissionMessage[] = shown): string | null {
  const known = new Set(all.map(({ id }) => id))
  const messages = [...all, ...shown.filter(({ id }) => !known.has(id))]
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message.role === 'user') return null
    if (message.permission?.kind === 'READING_PASSAGES') return message.permission.answer ? null : message.id
  }
  return null
}

export function readingPermissionState(message: PermissionMessage, latestId: string | null, busy = false): ReadingPermissionState {
  if (message.permission?.answer) return message.permission.answer
  return !busy && message.id === latestId ? 'actionable' : 'inert'
}

export function readingPermissionReply(
  message: { id: string; permission: AiReadingPermission },
  allow: boolean,
) {
  const { id, permission } = message
  const config: AiReadingPermissionConfig = {
    ...(permission.config ?? {}),
    confirmed: true,
    agreed: true,
    permissionMessageId: id,
    allowReadingPassages: allow,
  }
  return { content: permission.request, mode: permission.mode, parentId: id, config }
}

export function markReadingPermissionAnswered(message: AiChatMessage, config: AiReadingPermissionConfig): AiChatMessage {
  if (message.id !== config.permissionMessageId || !message.permission || message.permission.answer) return message
  return { ...message, permission: { ...message.permission, answer: config.allowReadingPassages ? 'ALLOWED' : 'DECLINED' } }
}
