import type { TeacherQuizEditor, TeacherQuizQuestion, TeacherQuizSection } from '../../../../services/teacherQuizService'
import type { DraftSection } from '../exam-draft'
import type { ExamPaper, ExamPaperPart, ExamPaperQuestion } from '../../ai-assistant/exam-format'

/** The part that holds the questions of no section: it prints no heading. */
const LOOSE_PART = 'loose'

function part(id: string, title: string, parentTitle: string | null): ExamPaperPart {
  return { id, title, code: null, parentTitle, firstNumber: null, targetCount: null }
}

type PaperQuestionSource = Pick<TeacherQuizQuestion,
  'id' | 'groupId' | 'sequence' | 'questionText' | 'options' | 'explanation' | 'imageUrl' | 'needsReview' | 'reviewNote'
>

function paperQuestion(question: PaperQuestionSource, partId: string, number: number): ExamPaperQuestion {
  return {
    id: question.id,
    partId,
    groupId: question.groupId,
    position: question.sequence,
    // Pinned, so the A4 sheet and the question list number every question alike: its place in the quiz.
    printedNumber: number,
    prompt: question.questionText,
    passage: null,
    options: [...question.options]
      .sort((a, b) => a.sequence - b.sequence)
      .map((option) => ({ id: option.id, label: option.label, text: option.text, correct: option.correct })),
    explanation: question.explanation ?? '',
    method: '',
    eliminations: {},
    difficulty: 'TB',
    patternCode: null,
    patternName: null,
    sourceTitle: null,
    imageUrl: question.imageUrl,
    passageImageUrl: null,
    chart: null,
    source: 'manual',
    kept: true,
    needsReview: question.needsReview,
    reasons: question.reviewNote ? [question.reviewNote] : [],
    revision: 0,
    failure: null,
  }
}

/**
 * A saved quiz in the shape the exam sheet is drawn from: its sections (a sub-section under its section's heading),
 * shared passages, and every question numbered by its place in the quiz. A question outside every section is kept,
 * under no heading; parts follow the order of their first question.
 */
export function quizToPaper(editor: TeacherQuizEditor): ExamPaper {
  const questions = [...editor.questions].sort((a, b) => a.sequence - b.sequence)
  const parts: ExamPaperPart[] = []
  const bySequence = (a: TeacherQuizSection, b: TeacherQuizSection) => a.sequence - b.sequence
  for (const section of [...editor.sections].sort(bySequence)) {
    // A section with sub-sections: its own questions stand under its heading alone, then each sub-section's.
    if (section.children.length === 0) {
      parts.push(part(section.id, section.title, null))
      continue
    }
    parts.push(part(section.id, '', section.title))
    for (const child of [...section.children].sort(bySequence)) parts.push(part(child.id, child.title, section.title))
  }
  const known = new Set(parts.map((item) => item.id))
  const partOf = (question: TeacherQuizQuestion) =>
    question.sectionId && known.has(question.sectionId) ? question.sectionId : LOOSE_PART
  if (questions.some((question) => partOf(question) === LOOSE_PART)) parts.push(part(LOOSE_PART, '', null))

  const paperQuestions = questions.map((question, index) => paperQuestion(question, partOf(question), index + 1))
  const first = new Map<string, number>()
  for (const question of paperQuestions) if (!first.has(question.partId)) first.set(question.partId, question.position)
  const ordered = parts
    .filter((item) => first.has(item.id))
    .sort((a, b) => (first.get(a.id) ?? 0) - (first.get(b.id) ?? 0))

  const partOfQuestion = new Map(paperQuestions.map((question) => [question.id, question.partId]))
  return {
    id: editor.quiz.id,
    title: editor.quiz.title,
    durationMinutes: editor.quiz.durationMinutes ?? null,
    examFormat: editor.quiz.type,
    parts: ordered,
    groups: editor.groups.map((group) => ({
      id: group.id,
      partId: partOfQuestion.get(group.questionIds[0] ?? '') ?? LOOSE_PART,
      instruction: group.instruction,
      passage: group.passage,
      passageImageUrl: group.imageUrl,
      chart: null,
    })),
    questions: paperQuestions,
  }
}

/** Projects the local draft onto the same paper as a saved quiz, using client IDs for selection. */
export function draftQuizToPaper(
  editor: TeacherQuizEditor,
  sections: readonly DraftSection[],
  title: string,
  durationMinutes: number | null,
): ExamPaper {
  const saved = quizToPaper(editor)
  const savedParts = new Map(saved.parts.map((item) => [item.id, item]))
  const savedQuestions = new Map(saved.questions.map((question) => [question.id, question]))
  const parts = sections.map((section) => {
    const previous = savedParts.get(section.clientId)
    if (previous?.parentTitle != null) return previous
    return part(section.clientId, section.unassigned ? '' : section.title, section.parentTitle)
  })
  let number = 0
  const questions = sections.flatMap((section) => section.questions.map((question) => {
    const previous = question.serverId ? savedQuestions.get(question.serverId) : undefined
    number += 1
    return paperQuestion({
      id: question.clientId,
      groupId: previous?.groupId ?? null,
      sequence: number,
      questionText: question.questionText,
      explanation: question.explanation,
      imageUrl: question.imageUrl,
      needsReview: question.needsReview,
      reviewNote: question.reviewNote,
      options: question.options.map((option, index) => ({
        id: `${question.clientId}-${index}`,
        sequence: index,
        label: previous?.options[index]?.label ?? String.fromCharCode(65 + index),
        text: option.text,
        correct: option.correct,
      })),
    }, section.clientId, number)
  }))
  return { ...saved, title, durationMinutes, parts, questions }
}
