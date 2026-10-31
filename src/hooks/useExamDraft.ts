import { useCallback, useState } from 'react'
import type { AiExamDraft, AiExamQuestion } from '../services/aiAssistantService'

const BLANK_PARTS = [
  { title: 'Tiếng Việt', code: '1.1', parentTitle: 'Phần 1. Sử dụng ngôn ngữ' },
  { title: 'Tiếng Anh', code: '1.2', parentTitle: 'Phần 1. Sử dụng ngôn ngữ' },
  { title: 'Phần 2. Toán học', code: null, parentTitle: null },
  { title: 'Logic, phân tích số liệu', code: '3.1', parentTitle: 'Phần 3. Tư duy khoa học' },
  { title: 'Suy luận khoa học', code: '3.2', parentTitle: 'Phần 3. Tư duy khoa học' },
]

export function createBlankExamDraft(): AiExamDraft {
  return {
    id: crypto.randomUUID(),
    title: 'Đề thi mới',
    durationMinutes: 150,
    matrix: null,
    parts: BLANK_PARTS.map((part) => ({
      id: crypto.randomUUID(),
      ...part,
      targetCount: null,
    })),
    groups: [],
    questions: [],
  }
}

/** Numbers questions by part, so a part that starts at 61 keeps its 61–90 range on the paper. */
export function questionNumbers(draft: AiExamDraft): Map<string, number> {
  const numbers = new Map<string, number>()
  let offset = 0
  for (const part of draft.parts) {
    const questions = draft.questions.filter((question) => question.partId === part.id)
    questions.forEach((question, index) => numbers.set(question.id, offset + index + 1))
    offset += part.targetCount ?? questions.length
  }
  draft.questions.forEach((question, index) => {
    if (!numbers.has(question.id)) numbers.set(question.id, index + 1)
  })
  return numbers
}

export function useExamDraft(initial?: AiExamDraft) {
  const [draft, setDraft] = useState<AiExamDraft>(() => initial ?? createBlankExamDraft())
  const [dirty, setDirty] = useState(false)

  const setTitle = useCallback((title: string) => {
    setDraft((previous) => ({ ...previous, title }))
    setDirty(true)
  }, [])

  const updateQuestion = useCallback(
    (id: string, patch: Omit<Partial<AiExamQuestion>, 'id'>) => {
      setDraft((previous) => ({
        ...previous,
        questions: previous.questions.map((question) =>
          question.id === id ? { ...question, ...patch } : question
        ),
      }))
      setDirty(true)
    },
    []
  )

  const deleteQuestion = useCallback((id: string) => {
    setDraft((previous) => ({
      ...previous,
      questions: previous.questions.filter((question) => question.id !== id),
    }))
    setDirty(true)
  }, [])

  const acceptQuestion = useCallback((id: string) => {
    setDraft((previous) => ({
      ...previous,
      questions: previous.questions.map((question) =>
        question.id === id ? { ...question, accepted: true } : question
      ),
    }))
    setDirty(true)
  }, [])

  const moveQuestion = useCallback((sourceId: string, targetId: string) => {
    setDraft((previous) => {
      const from = previous.questions.findIndex((question) => question.id === sourceId)
      const to = previous.questions.findIndex((question) => question.id === targetId)
      if (from < 0 || to < 0 || from === to) return previous
      if (previous.questions[from].partId !== previous.questions[to].partId) return previous
      const questions = [...previous.questions]
      const [moved] = questions.splice(from, 1)
      questions.splice(to, 0, moved)
      return { ...previous, questions }
    })
    setDirty(true)
  }, [])

  const replace = useCallback((next: AiExamDraft) => {
    setDraft(next)
    setDirty(false)
  }, [])

  const reset = useCallback(() => {
    setDraft(createBlankExamDraft())
    setDirty(false)
  }, [])

  return {
    draft,
    dirty,
    setTitle,
    updateQuestion,
    deleteQuestion,
    acceptQuestion,
    moveQuestion,
    replace,
    reset,
  }
}
