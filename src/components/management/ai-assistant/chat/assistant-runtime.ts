import { useMemo } from 'react'
import {
  MessageNotSentError,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react'
import type { AiChatMessage } from '../exam-format'

/** The id of the turn that shows a run's progress while it goes on; it is never a message of the conversation. */
export const PROGRESS_ID = 'run-progress'

const PROGRESS: AiChatMessage = { id: PROGRESS_ID, role: 'assistant', body: '', createdAt: '' }

/**
 * A run that put questions on the paper (compose, mock exam, a revision) offers the exam's files under its reply; an
 * error, a question, or a run that added none does not. A reply read back from the server does not say what its run
 * added, so it keeps offering them.
 */
export function offersExam(message: AiChatMessage) {
  return (
    !message.error &&
    !message.subjectChoices &&
    (message.mode === 'compose' || message.mode === 'mock-exam' || message.mode === 'revise') &&
    (message.addedItemIds === undefined || message.addedItemIds.length > 0)
  )
}

/** The page's message behind a turn assistant-ui renders. */
export function sourceOf(custom: Record<string, unknown> | undefined): AiChatMessage | null {
  return (custom?.source as AiChatMessage | undefined) ?? null
}

/**
 * One message of the conversation as assistant-ui reads it. Its words are a text part (copied by "Sao chép"); what a
 * reply adds besides them are data parts the thread renders: the subjects to choose from, and the exam's files.
 * The status line above a reply (and its steps) belongs to the whole turn, so it reads the message itself, kept as
 * `metadata.custom.source`. An error stays a complete reply: it is shown red, and retried by its own button.
 */
function convertMessage(message: AiChatMessage): ThreadMessageLike {
  if (message === PROGRESS) {
    return { id: PROGRESS_ID, role: 'assistant', status: { type: 'running' }, content: [{ type: 'data-progress', data: null }] }
  }
  const createdAt = message.createdAt ? new Date(message.createdAt) : undefined
  if (message.role === 'user') {
    return { id: message.id, role: 'user', createdAt, content: [{ type: 'text', text: message.body }] }
  }
  // Stopped before any question was written: it says so, and has no exam to offer.
  const stoppedEmpty = Boolean(message.stopped) && (message.addedItemIds?.length ?? 0) === 0
  return {
    id: message.id,
    role: 'assistant',
    createdAt,
    status: { type: 'complete', reason: 'stop' },
    metadata: { custom: { source: message } },
    content: [
      ...(message.body ? [{ type: 'text' as const, text: message.body }] : []),
      ...(message.subjectChoices && !message.subjectChoices.answered ? [{ type: 'data-subjects' as const, data: null }] : []),
      ...(stoppedEmpty ? [{ type: 'data-stopped' as const, data: null }] : []),
      ...(offersExam(message) ? [{ type: 'data-exam' as const, data: null }] : []),
    ],
  }
}

interface AssistantChatOptions {
  messages: readonly AiChatMessage[]
  /** A send is on its way or a run goes on: the thread ends with its progress, and the composer stops it. */
  running: boolean
  /** The open exam's conversation is being read. */
  loading: boolean
  /** Nothing can be sent yet (a mock exam with no paper chosen); the words can still be typed. */
  sendBlocked: boolean
  /**
   * Sends the composer's words. Resolves false when they were not sent (the page asks first, or the request was
   * refused): the composer then gets them back.
   */
  onSend: (text: string) => Promise<boolean>
  onCancel: () => void
  onRegenerate: () => void
}

/**
 * The assistant-ui runtime over the page's own conversation: the messages and the run stay in `useAiAssistant`
 * (the server, the stream, the exam beside), and the thread, composer and message actions are assistant-ui's.
 */
export function useAssistantChatRuntime({
  messages,
  running,
  loading,
  sendBlocked,
  onSend,
  onCancel,
  onRegenerate,
}: AssistantChatOptions) {
  // The progress turn is added and removed only when a run starts and ends, so the words streaming in re-render
  // only the progress itself (it reads the run on its own), not the thread.
  const shown = useMemo(() => (running ? [...messages, PROGRESS] : messages), [messages, running])

  return useExternalStoreRuntime<AiChatMessage>({
    messages: shown,
    convertMessage,
    isRunning: running,
    isLoading: loading,
    isSendDisabled: sendBlocked,
    onNew: async (message: AppendMessage) => {
      const text = message.content
        .map((part) => (part.type === 'text' ? part.text : ''))
        .join('\n')
        .trim()
      if (!text) return
      if (!(await onSend(text))) throw new MessageNotSentError()
    },
    onCancel: async () => onCancel(),
    onReload: async () => onRegenerate(),
  })
}
