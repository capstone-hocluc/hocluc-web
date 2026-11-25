import { getSchema } from '@tiptap/core'
import type { AiExamSheet } from '../../../services/aiAssistantService'
import type { AiChatMessage, ExamPaper, ExamPaperQuestion } from '../ai-assistant/exam-format'
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

export function writtenRunItemIds(
  messages: readonly Pick<AiChatMessage, 'role' | 'addedItemIds'>[],
  questions: readonly Pick<ExamPaperQuestion, 'id' | 'failure'>[],
): string[] {
  const lastRun = [...messages].reverse().find((message) => message.role === 'assistant' && message.addedItemIds !== undefined)
  const written = new Set(questions.filter((question) => !question.failure).map((question) => question.id))
  return [...new Set(lastRun?.addedItemIds)].filter((id) => written.has(id))
}
