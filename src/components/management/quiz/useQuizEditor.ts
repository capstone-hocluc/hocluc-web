import { useRef, useState } from 'react'
import { ApiError } from '../../../lib/api'
import { isCourseQuizType } from '../../../lib/quiz-types'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { AmbiguousTeacherQuestionSaveError, getTeacherQuiz, publishTeacherQuiz, updateTeacherQuiz, type TeacherQuizEditor } from '../../../services/teacherQuizService'
import { arrayMove } from '../crud/use-drag-reorder'
import type { DraftQuestion, DraftSection } from './exam-draft'
import { isExamLocked, validateExamSettings, type ExamSettings } from './exam-settings'
import { describePublishProblems } from './publish-problems'
import { createDraftQuestion, createDraftSection, createUnassignedSection, quizEditorSections, recoverQuizDraft, sectionStructureIsSupported } from './quiz-editor-draft'
import { courseQuizFieldErrors, quizEditorSettingsOf, quizEditorUpdatePayload } from './quiz-editor-settings'
import { quizQuestionProblem } from './quiz-editor-validation'
import { formatApiError, mapTeacherQuizValidationErrors, type QuizFieldError } from './quiz-form-errors'
import { saveQuizQuestions } from './save-quiz-questions'

export function useQuizEditor(initial: TeacherQuizEditor, onSaved: (message: string) => void) {
  const access = useQuizAccess()
  const original = useRef(initial)
  const [quiz, setQuiz] = useState(initial.quiz)
  const placement = quiz.type === 'PLACEMENT'
  const courseQuiz = isCourseQuizType(quiz.type)
  const [settings, setSettings] = useState(() => quizEditorSettingsOf(initial.quiz))
  const [sections, setSections] = useState(() => quizEditorSections(initial))
  const [selectedId, setSelectedId] = useState<string | null>(() => courseQuiz && initial.questions.length === 0
    ? sections[0]?.questions[0]?.clientId ?? null : null)
  const [focusQuestion, setFocusQuestion] = useState(courseQuiz && initial.questions.length === 0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMounted, setChatMounted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<QuizFieldError, string>>>({})
  const [ambiguousQuestionSave, setAmbiguousQuestionSave] = useState(false)
  const [baseline] = useState(() => JSON.stringify({ settings, sections }))
  const [structureReadOnly] = useState(() => !sectionStructureIsSupported(initial, sections))
  const hasUnsavedChanges = JSON.stringify({ settings, sections }) !== baseline
  const settingsLocked = isExamLocked(quiz)
  const published = quiz.status !== 'DRAFT'
  const canEditContent = access.canWrite && !settingsLocked && !published && !ambiguousQuestionSave
  const canEditQuestions = canEditContent && !structureReadOnly
  const numbered = sections.flatMap((section) => section.questions.map((question) => ({ section, question })))
  const appendBlockedReason = published || settingsLocked ? 'Chỉ nhập vào bản nháp chưa có lượt làm.'
    : ambiguousQuestionSave ? 'Tải lại bài để xác nhận kết quả lưu trước khi nhập.'
      : hasUnsavedChanges ? 'Lưu thay đổi rồi mở lại bài trước khi nhập file.' : ''
  const importBlockedReason = appendBlockedReason || (structureReadOnly ? 'Cấu trúc bài này đang ở chế độ chỉ xem.' : '')

  function selectPaperItem(id: string, focus = false) {
    if (!placement) {
      setSettingsOpen(false)
      setChatOpen(false)
    }
    setSelectedId(id)
    setFocusQuestion(focus)
  }

  function showSettings(open: boolean) {
    if (open) {
      if (!placement) setSelectedId(null)
      setChatOpen(false)
    }
    setSettingsOpen(open)
  }

  function toggleChat() {
    if (!chatOpen) {
      if (!placement) setSelectedId(null)
      setSettingsOpen(false)
      setChatMounted(true)
    }
    setChatOpen(!chatOpen)
  }

  function updateSettings<K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
    const field = key === 'maxAttempts' ? 'attempts' : key
    if (field === 'title' || field === 'duration' || field === 'attempts') {
      setFieldErrors((current) => ({ ...current, [field]: undefined }))
      if (courseQuiz) setError('')
    }
  }

  const updateSection = (clientId: string, update: Partial<DraftSection>) => {
    setSections((items) => items.map((section) => section.clientId === clientId ? { ...section, ...update } : section))
  }

  const updateQuestion = (sectionId: string, clientId: string, update: Partial<DraftQuestion>) => {
    setSections((items) => items.map((section) => section.clientId !== sectionId ? section : ({
      ...section,
      questions: section.questions.map((question) => question.clientId === clientId ? { ...question, ...update } : question),
    })))
  }

  const addSection = () => {
    const unassigned = sections.find((section) => section.unassigned)
    const next = sections.filter((section) => !section.unassigned)
    const created = createDraftSection('Phần ' + (next.length + 1))
    next.push(created)
    if (unassigned) next.push(unassigned)
    setSections(next)
    selectPaperItem(created.clientId)
  }

  const addQuestion = (sectionId: string) => {
    const created = createDraftQuestion()
    setSections((items) => items.map((section) => section.clientId === sectionId ? { ...section, questions: [...section.questions, created] } : section))
    selectPaperItem(created.clientId, courseQuiz)
  }

  const deleteQuestion = (sectionId: string, clientId: string) => {
    const index = numbered.findIndex((entry) => entry.question.clientId === clientId)
    const neighbour = numbered[index + 1] ?? numbered[index - 1]
    setSections((items) => items.map((section) => section.clientId === sectionId
      ? { ...section, questions: section.questions.filter((question) => question.clientId !== clientId) }
      : section))
    selectPaperItem(neighbour ? neighbour.question.clientId : sectionId)
  }

  const moveSection = (clientId: string, direction: -1 | 1) => {
    setSections((items) => {
      const index = items.findIndex((section) => section.clientId === clientId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length || items[nextIndex]?.unassigned) return items
      const next = [...items]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  const removeSection = (section: DraftSection) => {
    setSections((items) => {
      const remaining = items.filter((item) => item.clientId !== section.clientId)
      if (section.questions.length === 0) return remaining
      const currentUnassigned = remaining.find((item) => item.unassigned)
      const questions = [...(currentUnassigned?.questions ?? []), ...section.questions]
      const withoutUnassigned = remaining.filter((item) => !item.unassigned)
      return [...withoutUnassigned, createUnassignedSection(questions)]
    })
  }

  const moveQuestion = (sectionId: string, clientId: string, direction: -1 | 1) => {
    if (!access.canWrite || !canEditQuestions || busy) return
    setSections((items) => items.map((section) => {
      if (section.clientId !== sectionId) return section
      const index = section.questions.findIndex((question) => question.clientId === clientId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= section.questions.length) return section
      const next = [...section.questions]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return { ...section, questions: next }
    }))
  }

  function reorderQuestion(fromId: string, toId: string) {
    if (!canEditQuestions || busy) return
    setSections((items) => items.map((section) => {
      const byId = new Map(section.questions.map((question) => [question.clientId, question]))
      if (!byId.has(fromId) || !byId.has(toId)) return section
      const order = arrayMove([...byId.keys()], fromId, toId)
      return { ...section, questions: order.map((id) => byId.get(id)) }
    }))
  }

  function shiftQuestion(id: string, direction: -1 | 1) {
    const entry = numbered.find(({ question }) => question.clientId === id)
    if (entry) moveQuestion(entry.section.clientId, id, direction)
  }

  async function save(publish: boolean) {
    if (!access.canWrite || busy || published || ambiguousQuestionSave || (publish && settingsLocked)) return
    const settingsErrors = courseQuiz ? courseQuizFieldErrors(settings) : {}
    const settingsError = courseQuiz
      ? Object.values(settingsErrors)[0]
      : validateExamSettings(settings, placement, quiz)
    if (settingsError) {
      setFieldErrors(settingsErrors)
      setError(courseQuiz ? 'Vui lòng kiểm tra các trường được đánh dấu.' : settingsError)
      showSettings(true)
      return
    }

    if (canEditContent) {
      const problem = quizQuestionProblem(sections, original.current, { publish, placement, courseQuiz, fixedStructure: structureReadOnly })
      if (problem.message) {
        setFieldErrors({})
        setError(problem.message)
        if (problem.questionId) selectPaperItem(problem.questionId)
        return
      }
    }

    setBusy(true)
    setError('')
    setFieldErrors({})
    const before = original.current
    try {
      await updateTeacherQuiz(quiz.id, quizEditorUpdatePayload(settings, quiz.type, settingsLocked))
      if (canEditContent) await saveQuizQuestions(before, sections, canEditQuestions, setSections)
      if (publish) await publishTeacherQuiz(quiz.id)
      original.current = await getTeacherQuiz(quiz.id)
      const label = courseQuiz ? 'quiz' : placement ? 'bài đánh giá đầu vào' : 'đề thi thử'
      onSaved(publish ? `Đã lưu và xuất bản ${label}.` : `Đã lưu thay đổi ${label}.`)
    } catch (saveError) {
      if (saveError instanceof AmbiguousTeacherQuestionSaveError) {
        setAmbiguousQuestionSave(true)
        return
      }
      let message = formatApiError(saveError)
      if (courseQuiz && saveError instanceof ApiError) {
        const validation = mapTeacherQuizValidationErrors(saveError.errors ?? {})
        setFieldErrors(validation.fields)
        if (validation.fields.title || validation.fields.duration || validation.fields.attempts) showSettings(true)
      }
      try {
        const refreshed = await getTeacherQuiz(quiz.id)
        original.current = refreshed
        setQuiz(refreshed.quiz)
        setSections((draftSections) => recoverQuizDraft(draftSections, before, refreshed))
        const blockers = refreshed.quiz.publishProblems?.filter(Boolean) ?? []
        if (publish && saveError instanceof ApiError && saveError.status === 409 && blockers.length > 0) {
          message = `Chưa thể xuất bản: ${describePublishProblems(blockers)}. Hoàn thiện nội dung trong bài rồi thử lại.`
        }
      } catch {
        // Keep the form available if refreshing the saved state also fails.
      }
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return {
    quiz, placement, courseQuiz, settings, sections, numbered, selectedId, setSelectedId, focusQuestion, settingsOpen, showSettings,
    chatOpen, chatMounted, setChatOpen, toggleChat, error, busy, setBusy, fieldErrors, ambiguousQuestionSave,
    settingsLocked, published, canEditContent, canEditQuestions, importBlockedReason, appendBlockedReason,
    selectPaperItem, updateSettings, updateSection, updateQuestion, addSection, addQuestion, deleteQuestion,
    moveSection, removeSection, moveQuestion, reorderQuestion, shiftQuestion, save,
  }
}
