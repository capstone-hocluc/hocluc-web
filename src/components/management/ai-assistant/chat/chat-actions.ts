import { createContext, useContext } from 'react'

export type ExamDownload = 'docx' | 'pdf' | 'docx-exam' | 'pdf-exam'

/** What a reply's own controls do. */
export interface ChatActions {
  /** Word or PDF of the exam with its answer key, or of the exam alone. */
  onDownload?: (format: ExamDownload) => void
  /** Writes the answer key after the exam again from the questions it holds now. */
  onAnswerKey?: () => void
  /** Sends the words of a failed send again. */
  onRetry: (messageId: string) => void
  /** Answers the question "Bạn muốn soạn môn nào?" with a subject (null: the whole paper). */
  onChooseSubject: (messageId: string, subjectName: string | null) => void
  onAnswerReadingPermission?: (messageId: string, allow: boolean) => void
}

export const ChatActionsContext = createContext<ChatActions | null>(null)

export function useChatActions() {
  const actions = useContext(ChatActionsContext)
  if (!actions) throw new Error('The chat turns need a ChatActionsProvider.')
  return actions
}
