import { useCallback, useState } from 'react'
import type { AiExamDraft, AiExamQuestion } from '../services/aiAssistantService'

const BLANK_PARTS = [
  'Phần 1. Tiếng Việt',
  'Phần 2. Toán học',
  'Phần 3. Giải quyết vấn đề',
]

export function createBlankExamDraft(): AiExamDraft {
  return {
    id: crypto.randomUUID(),
    title: 'Đề thi mới',
    durationMinutes: 90,
    matrix: null,
    parts: BLANK_PARTS.map((title) => ({
      id: crypto.randomUUID(),
      title,
      targetCount: null,
    })),
    groups: [],
    questions: [],
  }
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
