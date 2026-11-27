import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ExportedMessageRepository,
  MessageNotSentError,
  useExternalStoreRuntime,
  type AppendMessage,
  type AttachmentAdapter,
  type CompleteAttachment,
  type ThreadMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react'
import { getAiSuggestions, type AiAttachment } from '../../../../services/aiAssistantService'
import type { AiChatMessage, AiTraceStage } from '../exam-format'
import { parentsOf } from '../../../../hooks/useAiAssistant'
import { READING_ID, type ReadingTurn } from '../reading-turn'
import { latestReadingPermissionId, readingPermissionState, type ReadingPermissionPart, type ReadingPermissionState } from './reading-permission'
import { stageHeads, stageParts, traceParts } from './run-parts'

/** The id of the turn that shows a run's progress while it goes on; it is never a message of the conversation. */
export const PROGRESS_ID = 'run-progress'

/** The turns only the page shows (a run going on, a paper being read): never a version of the conversation. */
const ownTurn = (id: string) => id !== PROGRESS_ID && id !== READING_ID

/** Where the reading's turn goes among the shown messages; its words come from the reading itself. */
const READING_PLACE: AiChatMessage = { id: READING_ID, role: 'assistant', body: '', createdAt: '' }

/**
 * The paper being read beside the chat, as the assistant's turn: what it is and where its reading is, then its stages
 * and steps, timed like a run's. It is no reply, so it offers nothing to copy, regenerate or switch, and a failed
 * reading is loaded again from its own button, never by "Thử lại".
 */
function readingMessage(turn: ReadingTurn): ThreadMessageLike {
  return {
    id: READING_ID,
    role: 'assistant',
    status: turn.running
      ? { type: 'running' }
      : turn.error
        ? { type: 'incomplete', reason: 'other' }
        : { type: 'complete', reason: 'stop' },
    metadata: {
      custom: { reading: turn, actionsHidden: true, stageHeads: stageHeads(turn.stages), runTime: turn.runTime },
    },
    content: [{ type: 'data-reading', data: null }, ...stageParts(turn.stages, undefined, undefined, false)],
  }
}

/**
 * A run that put questions on the paper (compose, mock exam, a revision) offers the exam's files under its reply; an
 * error, a question, or a run that added none does not. A reply read back from the server does not say what its run
 * added, so it keeps offering them. Where the assistant changes the exam (`examCard` off), a compose or revise reply
 * offers only the files the teacher asked it for.
 */
export function offersExam(message: AiChatMessage, examCard = true) {
  return (
    (examCard || message.mode === 'mock-exam') &&
    !message.error &&
    !message.subjectChoices &&
    !message.permission &&
    (message.mode === 'compose' || message.mode === 'mock-exam' || message.mode === 'revise') &&
    (message.addedItemIds === undefined || message.addedItemIds.length > 0)
  )
}

/** The page's message behind a turn assistant-ui renders. */
export function sourceOf(custom: Record<string, unknown> | undefined): AiChatMessage | null {
  return (custom?.source as AiChatMessage | undefined) ?? null
}

/**
 * The steps a reply took: its run's stages (timed from the request at `askedAt` until the reply, `time`), or an ask
 * run's lines read back.
 */
function stepParts(message: AiChatMessage, askedAt: number, time?: { completedAt?: number }) {
  if (message.stages?.length) {
    return stageParts(message.stages, Number.isFinite(askedAt) ? askedAt : undefined, time?.completedAt)
  }
  return message.trace?.length ? traceParts(message.trace) : []
}

/**
 * How long a reply's task took: from the teacher's request (`askedAt`, NaN when the reply follows none) until the
 * reply, or until now while its run goes on.
 */
function taskTime(askedAt: number, repliedAt?: string) {
  if (!Number.isFinite(askedAt)) return undefined
  const completedAt = repliedAt === undefined ? NaN : Date.parse(repliedAt)
  return { startedAt: askedAt, ...(Number.isFinite(completedAt) ? { completedAt: Math.max(askedAt, completedAt) } : {}) }
}

/**
 * One message of the conversation as assistant-ui reads it. A reply's steps come first as reasoning and tool-call
 * parts, which the thread groups as it does any agent's; then its words (a text part, copied by "Sao chép"); then
 * what it adds besides them, as data parts: the subjects to choose from, a stopped run's chip, the exam's files. An
 * error is a reply that did not finish: the thread shows its words as the error, with its "Thử lại". `askedAt` is
 * when the request a reply answers was sent.
 */
function convertMessage(message: AiChatMessage, examCard: boolean, askedAt: number, permissionState: ReadingPermissionState): ThreadMessageLike {
  if (message.id === PROGRESS_ID) {
    return {
      id: PROGRESS_ID,
      role: 'assistant',
      status: { type: 'running' },
      metadata: { custom: { stageHeads: stageHeads(message.stages) } },
      content: [...stepParts(message, askedAt), ...(message.body ? [{ type: 'text' as const, text: message.body }] : [])],
    }
  }
  const runTime = taskTime(askedAt, message.createdAt)
  const createdAt = message.createdAt ? new Date(message.createdAt) : undefined
  if (message.role === 'user') {
    return {
      id: message.id,
      role: 'user',
      createdAt,
      // The request the assistant proposed and the teacher agreed to is the assistant's words, said in its reply.
      ...(message.agreed ? { metadata: { custom: { hidden: true } } } : {}),
      content: [{ type: 'text', text: message.body }],
      attachments: (message.attachments ?? []).map(attachedFile),
    }
  }
  if (message.error) {
    return {
      id: message.id,
      role: 'assistant',
      createdAt,
      status: { type: 'incomplete', reason: 'error', error: message.body },
      metadata: { custom: { source: message, stageHeads: stageHeads(message.stages) } },
      content: stepParts(message, askedAt, runTime),
    }
  }
  // Stopped before any question was written, or with no exam card to say it: the chip says so.
  const exam = offersExam(message, examCard)
  const stoppedChip = Boolean(message.stopped) && (!exam || (message.addedItemIds?.length ?? 0) === 0)
  return {
    id: message.id,
    role: 'assistant',
    createdAt,
    status: { type: 'complete', reason: 'stop' },
    metadata: { custom: { source: message, stageHeads: stageHeads(message.stages) } },
    content: [
      ...stepParts(message, askedAt, runTime),
      ...(message.body ? [{ type: 'text' as const, text: message.body }] : []),
      ...(message.permission?.kind === 'READING_PASSAGES' ? [{
        type: 'data-reading-permission' as const,
        data: { messageId: message.id, parts: message.permission.parts ?? [], state: permissionState } satisfies ReadingPermissionPart,
      }] : []),
      ...(message.subjectChoices && !message.subjectChoices.answered ? [{ type: 'data-subjects' as const, data: null }] : []),
      ...(stoppedChip ? [{ type: 'data-stopped' as const, data: null }] : []),
      ...(exam ? [{ type: 'data-exam' as const, data: null }] : []),
      ...(message.files ?? []).map((file) => ({ type: 'data-file' as const, data: file })),
    ],
  }
}

export interface AssistantChatOptions {
  /** The open conversation, which the follow-up questions are asked of; none for a new exam. */
  conversationId: string | null
  messages: readonly AiChatMessage[]
  /** A send is on its way or a run goes on: the thread ends with its progress, and the composer stops it. */
  running: boolean
  /** The open exam's conversation is being read. */
  loading: boolean
  /** Nothing can be sent yet (a mock exam with no paper chosen); the words can still be typed. */
  sendBlocked: boolean
  /**
   * Sends the composer's words, with the files attached to them. Resolves false when they were not sent (the page
   * asks first, or the request was refused): the composer then gets them back.
   */
  onSend: (text: string, attachments: AiAttachment[]) => Promise<boolean>
  /** Stores a file the teacher attaches; only an ask question takes files, so other modes leave this out. */
  onAttach?: (file: File) => Promise<AiAttachment>
  onCancel: () => void
  /** "Tạo lại" on the last reply, or "Thử lại" on a failed one. */
  onRegenerate: () => void
  /** Every message of the conversation in every branch; `messages` is the branch shown. */
  allMessages: readonly AiChatMessage[]
  /** Shows the branch the thread switched to, by the ids of its messages. */
  onShowBranch: (ids: readonly string[]) => void
  /**
   * Asks a question again in other words, as another version of it: it follows `after`, the message the first
   * version followed (null: the conversation's start). Resolves false when it was not sent.
   */
  onEdit: (text: string, after: string | null) => Promise<boolean>
  /**
   * A finished exam run offers the exam's files under its reply. Off where the assistant changes the exam: it prepares
   * a file when the teacher asks for one.
   */
  examCard: boolean
}

/**
 * The assistant-ui runtime over the page's own conversation: the messages and the run stay in `useAiAssistant`
 * (the server, the stream, the exam beside), and the thread, composer and message actions are assistant-ui's.
 * `stages` and `answer` are the run going on (its steps, and the words of an ask answer being written): its turn is
 * rebuilt from them, so only the chat follows them.
 */
export function useAssistantChatRuntime({
  conversationId,
  messages,
  running,
  loading,
  sendBlocked,
  onSend,
  onCancel,
  onRegenerate,
  onAttach,
  allMessages,
  onShowBranch,
  onEdit,
  examCard,
  stages,
  answer,
  reading,
}: AssistantChatOptions & { stages: readonly AiTraceStage[]; answer: string; reading: ReadingTurn | null }) {
  // A paper being read follows the conversation; a run going on comes last.
  const reads = reading !== null
  const shown = useMemo(() => {
    const read = reads ? [READING_PLACE] : []
    if (!running) return [...messages, ...read]
    const progress: AiChatMessage = { id: PROGRESS_ID, role: 'assistant', body: answer, createdAt: '', stages: [...stages] }
    return [...messages, ...read, progress]
  }, [messages, reads, running, stages, answer])
  const repository = useMemo(
    () => branchesOf(shown, allMessages, examCard, reading, running || loading),
    [shown, allMessages, examCard, reading, running, loading]
  )

  // Where the assistant changes the exam (no exam card) it also answers every message.
  const suggestions = useFollowUps(conversationId, messages, running, !examCard)
  // The files stored for the composer's attachments, by the id the composer knows each by.
  const stored = useRef(new Map<string, AiAttachment>())
  const attach = useRef(onAttach)
  useEffect(() => {
    attach.current = onAttach
  }, [onAttach])
  const adapter = useMemo<AttachmentAdapter>(
    () => ({
      accept: 'image/png,image/jpeg,image/webp,application/pdf',
      async add({ file }) {
        return {
          id: crypto.randomUUID(),
          type: file.type.startsWith('image/') ? 'image' : 'document',
          name: file.name,
          contentType: file.type,
          file,
          status: { type: 'requires-action', reason: 'composer-send' },
        }
      },
      async send(attachment) {
        const upload = attach.current
        if (!upload) throw new Error('Chỉ câu hỏi ở chế độ Hỏi đáp mới đính kèm được tệp.')
        const file = await upload(attachment.file)
        stored.current.set(attachment.id, file)
        const preview = attachment.type === 'image' ? [{ type: 'image' as const, image: await dataUrlOf(attachment.file) }] : []
        return { ...attachment, status: { type: 'complete' }, content: preview } satisfies CompleteAttachment
      },
      async remove(attachment) {
        stored.current.delete(attachment.id)
      },
    }),
    []
  )

  return useExternalStoreRuntime<ThreadMessage>({
    messageRepository: repository,
    // Switching versions (the "‹ 1 / 2 ›" of a turn) shows that branch on the page too.
    setMessages: (branch) => onShowBranch(branch.map((message) => message.id).filter(ownTurn)),
    unstable_onBranchChange: ({ visibleMessageIds }) => onShowBranch(visibleMessageIds.filter(ownTurn)),
    suggestions,
    isRunning: running,
    isLoading: loading,
    isSendDisabled: sendBlocked,
    adapters: onAttach ? { attachments: adapter } : undefined,
    onNew: async (message: AppendMessage) => {
      const text = message.content
        .map((part) => (part.type === 'text' ? part.text : ''))
        .join('\n')
        .trim()
      if (!text) return
      const files = (message.attachments ?? []).flatMap((attachment) => {
        const file = stored.current.get(attachment.id)
        return file ? [file] : []
      })
      if (!(await onSend(text, files))) throw new MessageNotSentError()
    },
    onEdit: async (message: AppendMessage) => {
      const text = message.content
        .map((part) => (part.type === 'text' ? part.text : ''))
        .join('\n')
        .trim()
      if (!text) return
      if (!(await onEdit(text, message.parentId))) throw new MessageNotSentError()
    },
    onCancel: async () => onCancel(),
    onReload: async () => onRegenerate(),
  })
}

/**
 * The conversation as the thread's branches. A message shown follows the one shown before it; any other follows its
 * parent. They are listed in the order they were written, so the versions of a turn count up from the first, and the
 * messages only the page holds (the question being sent, the run going on) come last. The head is the last shown.
 */
function branchesOf(
  shown: readonly AiChatMessage[],
  all: readonly AiChatMessage[],
  examCard: boolean,
  reading: ReadingTurn | null,
  permissionBusy: boolean,
): ExportedMessageRepository {
  const before = new Map(shown.map((message, index) => [message.id, index === 0 ? null : shown[index - 1].id]))
  const parents = parentsOf(all)
  const kept = new Set(all.map((message) => message.id))
  const shownById = new Map(shown.map((message) => [message.id, message]))
  const ordered = [...all.map((message) => shownById.get(message.id) ?? message), ...shown.filter((message) => !kept.has(message.id))]
  const byId = new Map(ordered.map((message) => [message.id, message]))
  const permissionId = latestReadingPermissionId(shown, all)
  const items = ordered.map((message) => {
    const parentId = before.has(message.id) ? (before.get(message.id) ?? null) : (parents.get(message.id) ?? null)
    // A reply answers the request it follows ("Tạo lại" sends that request again, so each version has its own).
    const request = parentId === null ? undefined : byId.get(parentId)
    const askedAt = request?.role === 'user' ? Date.parse(request.createdAt) : NaN
    return {
      message: message.id === READING_ID && reading
        ? readingMessage(reading)
        : convertMessage(message, examCard, askedAt, readingPermissionState(message, permissionId, permissionBusy)),
      parentId,
    }
  })
  return { ...ExportedMessageRepository.fromBranchableArray(items), headId: shown.at(-1)?.id ?? null }
}

/**
 * An answer the server keeps that the teacher may follow up: an ask answer, or (where the assistant answers every
 * message, `assistant`) its reply to a compose request.
 */
function asksFollowUps(message: AiChatMessage | undefined, assistant: boolean): message is AiChatMessage {
  return Boolean(
    message &&
      message.role === 'assistant' &&
      (message.mode === 'ask' || (assistant && message.mode === 'compose')) &&
      !message.error &&
      !message.permission &&
      !/^(local|subject|error|summary)-/.test(message.id)
  )
}

/**
 * What the teacher might ask after the last answer, for the thread's follow-up suggestions: those the server kept
 * with it, or else asked for once. A send or a new run hides them; a failed request shows none.
 */
function useFollowUps(conversationId: string | null, messages: readonly AiChatMessage[], running: boolean, assistant: boolean) {
  const last = messages.at(-1)
  const [proposed, setProposed] = useState<{ id: string; prompts: string[] } | null>(null)
  const pending = asksFollowUps(last, assistant) && !last.suggestions && proposed?.id !== last.id ? last.id : null

  useEffect(() => {
    if (!pending || !conversationId || running) return
    let current = true
    getAiSuggestions(conversationId, pending)
      .catch(() => [])
      .then((prompts) => {
        if (current) setProposed({ id: pending, prompts })
      })
    return () => {
      current = false
    }
  }, [conversationId, pending, running])

  return useMemo(() => {
    if (running || !asksFollowUps(last, assistant)) return []
    const prompts = last.suggestions ?? (proposed?.id === last.id ? proposed.prompts : [])
    return prompts.map((prompt) => ({ prompt }))
  }, [assistant, last, proposed, running])
}

/** A file a sent question carries, as its turn shows it: its name and kind (the server keeps no preview). */
function attachedFile(file: AiAttachment): CompleteAttachment {
  return {
    id: file.key,
    type: file.contentType.startsWith('image/') ? 'image' : 'document',
    name: file.name,
    contentType: file.contentType,
    status: { type: 'complete' },
    content: [],
  }
}

/** A picked image as a data URL, for its thumbnail in the sent question. */
function dataUrlOf(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
