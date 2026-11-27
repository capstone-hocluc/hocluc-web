import { getSchema } from '@tiptap/core'
import { exportAiDraftToQuiz, type AiDraftItem, type AiExamSheet, type AiQuizAppend } from '../../../services/aiAssistantService'
import type { ExamPaper } from '../ai-assistant/exam-format'
import { examSheet } from '../exam-doc/doc-snapshot'
import { draftToDoc } from '../exam-doc/draft-to-doc'
import { examDocExtensions } from '../exam-doc/editor-extensions'

const noChange = () => undefined
let schema: ReturnType<typeof getSchema> | undefined

export function quizAssistantSheet(paper: ExamPaper): AiExamSheet {
  schema ??= getSchema(examDocExtensions({ onEditFormula: noChange, onPages: noChange }))
  const doc = draftToDoc({
    ...paper,
    questions: paper.questions.filter((question) => question.prompt.trim()),
  })
  const sheet = examSheet(schema.nodeFromJSON(doc))
  // Quiz question IDs belong to the quiz, while the chat uses its own draft items.
  return { ...sheet, questions: sheet.questions.map(({ number, text, part, group, context }) => ({ number, text, part, group, context })) }
}

export function pendingQuizDraftItemIds(
  items: readonly Pick<AiDraftItem, 'id' | 'addedToQuizId' | 'question'>[],
  quizId: string,
): string[] {
  return items
    .filter((item) => item.addedToQuizId !== quizId && !item.question.failed && item.question.text?.trim())
    .map((item) => item.id)
}

export async function appendQuizDraft(
  conversationId: string,
  body: AiQuizAppend,
  refreshDraft: (id: string) => Promise<boolean>,
) {
  const result = await exportAiDraftToQuiz(conversationId, body)
  const draftRefreshed = await refreshDraft(conversationId)
  return { result, draftRefreshed }
}
