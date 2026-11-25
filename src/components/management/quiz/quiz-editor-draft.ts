import { isCourseQuizType } from '../../../lib/quiz-types'
import type { SaveTeacherQuestionRequest, TeacherQuestionType, TeacherQuizEditor, TeacherQuizQuestion, TeacherQuizSectionSpec } from '../../../services/teacherQuizService'
import { isExamLocked } from './exam-settings'
import { CHOICE_TYPES, type DraftQuestion, type DraftSection } from './exam-draft'

export function createDraftQuestion(): DraftQuestion {
  return {
    clientId: 'local-question-' + crypto.randomUUID(),
    serverId: null,
    questionText: '',
    questionType: 'SINGLE_CHOICE',
    difficulty: null,
    options: Array.from({ length: 4 }, () => ({ text: '', correct: false })),
    explanation: '',
    imageUrl: null,
    categoryId: null,
    sourcePage: null,
    marks: null,
    needsReview: false,
    reviewNote: '',
    editable: true,
  }
}

export function createDraftSection(title = ''): DraftSection {
  return {
    clientId: 'local-section-' + crypto.randomUUID(),
    title,
    parentTitle: null,
    childTitle: null,
    categoryId: null,
    suggestedMinutes: '',
    unassigned: false,
    questions: [],
  }
}

export function createUnassignedSection(questions: DraftQuestion[]): DraftSection {
  return {
    clientId: 'unassigned-questions',
    title: 'Câu hỏi chưa xếp phần',
    parentTitle: null,
    childTitle: null,
    categoryId: null,
    suggestedMinutes: '',
    unassigned: true,
    questions,
  }
}

function fromServerQuestion(question: TeacherQuizQuestion, courseQuiz: boolean): DraftQuestion {
  const editable = question.questionType === 'SINGLE_CHOICE' ||
    (courseQuiz && (question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'LONG_ANSWER'))
  return {
    clientId: question.id,
    serverId: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    options: question.options.map((option) => ({ text: option.text, correct: option.correct })),
    explanation: question.explanation ?? '',
    imageUrl: question.imageUrl,
    categoryId: question.categoryId,
    difficulty: question.difficulty ?? null,
    sourcePage: question.sourcePage,
    marks: question.marksFixed ? question.marks : null,
    needsReview: question.needsReview,
    reviewNote: question.reviewNote ?? '',
    editable: editable && question.options.length <= 8,
  }
}

function fromServerEditor(editor: TeacherQuizEditor): DraftSection[] {
  const courseQuiz = isCourseQuizType(editor.quiz.type)
  const questions = [...editor.questions].sort((a, b) => a.sequence - b.sequence)
  const orderedSections = [...editor.sections]
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((section) => [
      { section, displayTitle: section.title, parentTitle: null as string | null, childTitle: null as string | null },
      ...[...section.children]
        .sort((a, b) => a.sequence - b.sequence)
        .map((child) => ({ section: child, displayTitle: section.title + ' · ' + child.title, parentTitle: section.title as string | null, childTitle: child.title as string | null })),
    ])
  const sectionIds = new Set(orderedSections.map(({ section }) => section.id))
  const sections: DraftSection[] = orderedSections.map(({ section, displayTitle, parentTitle, childTitle }) => ({
    clientId: section.id,
    title: displayTitle,
    parentTitle,
    childTitle,
    categoryId: section.categoryId,
    suggestedMinutes: section.suggestedMinutes == null ? '' : String(section.suggestedMinutes),
    unassigned: false,
    questions: questions
      .filter((question) => question.sectionId === section.id)
      .map((question) => fromServerQuestion(question, courseQuiz)),
  }))
  const unassigned = questions
    .filter((question) => !question.sectionId || !sectionIds.has(question.sectionId))
    .map((question) => fromServerQuestion(question, courseQuiz))
  if (unassigned.length > 0) sections.push(createUnassignedSection(unassigned))
  return sections
}

export function sectionStructureIsSupported(editor: TeacherQuizEditor, sections: DraftSection[]) {
  if (editor.groups.length > 0 || editor.sections.some((section) => section.children.length > 0)) return false
  const displayedQuestionIds = sections.flatMap((section) => section.questions.flatMap((question) => question.serverId ?? []))
  const serverQuestionIds = [...editor.questions]
    .sort((a, b) => a.sequence - b.sequence)
    .map((question) => question.id)
  return displayedQuestionIds.length === serverQuestionIds.length &&
    displayedQuestionIds.every((id, index) => id === serverQuestionIds[index])
}

export function questionHasAnyContent(question: DraftQuestion) {
  return Boolean(question.serverId) || question.questionText.trim() !== '' ||
    question.explanation.trim() !== '' ||
    question.options.some((option) => option.text.trim() !== '')
}

function questionFingerprint(question: {
  questionText: string
  questionType: TeacherQuestionType
  explanation: string | null
  options: Array<{ text: string; correct: boolean }>
}) {
  return JSON.stringify([
    question.questionType,
    question.questionText.trim().replace(/\s+/g, ' '),
    (question.explanation ?? '').trim().replace(/\s+/g, ' '),
    question.options.map((option) => [option.text.trim().replace(/\s+/g, ' '), option.correct]),
  ])
}

export function recoverQuizDraft(sections: DraftSection[], previous: TeacherQuizEditor, refreshed: TeacherQuizEditor) {
  const previousIds = new Set(previous.questions.map((question) => question.id))
  const refreshedIds = new Set(refreshed.questions.map((question) => question.id))
  const draftIds = new Set(sections.flatMap((section) => section.questions.map((question) => question.serverId)))
  const remaining = refreshed.questions.filter((question) => !previousIds.has(question.id) && !draftIds.has(question.id))
  return sections.map((section) => ({
    ...section,
    questions: section.questions
      .filter((question) => !question.serverId || refreshedIds.has(question.serverId))
      .map((draft) => {
        if (draft.serverId || !questionHasAnyContent(draft)) return draft
        const fingerprint = questionFingerprint({ ...draft, options: draft.options.filter((option) => option.text.trim()) })
        const matchIndex = remaining.findIndex((question) => questionFingerprint(question) === fingerprint)
        if (matchIndex < 0) return draft
        const [match] = remaining.splice(matchIndex, 1)
        return { ...draft, serverId: match.id, clientId: match.id }
      }),
  }))
}

export function questionPayload(question: DraftQuestion): SaveTeacherQuestionRequest {
  const questionType = question.questionType
  const options = CHOICE_TYPES.includes(questionType)
    ? question.options
        .filter((option) => option.text.trim())
        .map((option) => ({ text: option.text.trim(), correct: option.correct }))
    : questionType === 'LONG_ANSWER'
      ? []
      : undefined
  return {
    questionText: question.questionText.trim(),
    questionType,
    explanation: question.explanation,
    options,
    // Omit the resolved URL so BE keeps its canonical storage reference.
    categoryId: question.categoryId ?? undefined,
    difficulty: question.difficulty ?? undefined,
    sourcePage: question.sourcePage ?? undefined,
    marks: question.marks ?? undefined,
    needsReview: question.needsReview,
    reviewNote: question.reviewNote.trim() || undefined,
  }
}

export function questionPayloadMatchesServer(draft: DraftQuestion, server: TeacherQuizQuestion) {
  const payload = questionPayload(draft)
  return payload.questionText === server.questionText &&
    payload.questionType === server.questionType &&
    payload.explanation === (server.explanation ?? '') &&
    (payload.categoryId ?? null) === server.categoryId &&
    (payload.difficulty ?? null) === (server.difficulty ?? null) &&
    (payload.sourcePage ?? null) === server.sourcePage &&
    (payload.marks ?? null) === (server.marksFixed ? server.marks : null) &&
    payload.needsReview === server.needsReview &&
    (payload.reviewNote ?? '') === (server.reviewNote ?? '') &&
    payload.options?.length === server.options.length &&
    (payload.options ?? []).every((option, index) =>
      option.text === server.options[index]?.text && option.correct === server.options[index]?.correct
    )
}

export function sectionLayoutSpecs(sections: DraftSection[], questionCounts: Map<string, number>): TeacherQuizSectionSpec[] {
  let sequence = 1
  return sections
    .filter((section) => !section.unassigned)
    .map((section) => {
      const count = questionCounts.get(section.clientId) ?? 0
      const fromQuestion = count > 0 ? sequence : undefined
      if (count > 0) sequence += count
      const suggestedMinutes = Number(section.suggestedMinutes)
      return {
        title: section.title.trim(),
        categoryId: section.categoryId ?? undefined,
        suggestedMinutes: Number.isInteger(suggestedMinutes) && suggestedMinutes > 0 ? suggestedMinutes : undefined,
        fromQuestion,
        toQuestion: fromQuestion === undefined ? undefined : sequence - 1,
      }
    })
}

export function existingLayoutSpecs(editor: TeacherQuizEditor): TeacherQuizSectionSpec[] {
  return [...editor.sections]
    .sort((a, b) => a.sequence - b.sequence)
    .map((section) => ({
      title: section.title,
      categoryId: section.categoryId ?? undefined,
      suggestedMinutes: section.suggestedMinutes ?? undefined,
      fromQuestion: section.questionCount > 0 ? section.firstQuestion : undefined,
      toQuestion: section.questionCount > 0 ? section.lastQuestion : undefined,
    }))
}

export function sameLayout(a: TeacherQuizSectionSpec[], b: TeacherQuizSectionSpec[]) {
  return JSON.stringify(a.map((item) => [
    item.title,
    item.categoryId ?? null,
    item.suggestedMinutes ?? null,
    item.fromQuestion ?? null,
    item.toQuestion ?? null,
  ])) === JSON.stringify(b.map((item) => [
    item.title,
    item.categoryId ?? null,
    item.suggestedMinutes ?? null,
    item.fromQuestion ?? null,
    item.toQuestion ?? null,
  ]))
}

/** A new quiz has somewhere to start typing, without adding a section to a course quiz. */
export function quizEditorSections(editor: TeacherQuizEditor) {
  if (editor.sections.length || editor.questions.length) return fromServerEditor(editor)
  if (!isCourseQuizType(editor.quiz.type)) return [createDraftSection('Phần 1')]
  return [createUnassignedSection(isExamLocked(editor.quiz) || editor.quiz.status !== 'DRAFT' ? [] : [createDraftQuestion()])]
}
