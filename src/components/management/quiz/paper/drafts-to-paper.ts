import type { TeacherQuizEditor } from '../../../../services/teacherQuizService'
import type { ExamPaper, ExamPaperPart, ExamPaperQuestion } from '../../ai-assistant/exam-format'
import type { DraftQuestion, DraftSection } from '../exam-draft'

const LABELS = 'ABCDEFGH'

function paperQuestion(question: DraftQuestion, partId: string, groupId: string | null, number: number): ExamPaperQuestion {
  return {
    id: question.clientId,
    partId,
    groupId,
    position: number,
    printedNumber: number,
    // A question still being written keeps its place and number on the sheet.
    prompt: question.questionText.trim() ? question.questionText : '…',
    passage: null,
    options: question.options.map((option, index) => ({
      id: `${question.clientId}:${index}`,
      label: LABELS[index] ?? String(index + 1),
      text: option.text.trim() ? option.text : '…',
      correct: option.correct,
    })),
    explanation: question.explanation,
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

function part(section: DraftSection): ExamPaperPart {
  // A sub-section prints under its section's heading; the questions of no section print under none.
  const title = section.unassigned ? '' : section.parentTitle !== null ? (section.childTitle ?? '') : section.title
  return { id: section.clientId, title, code: null, parentTitle: section.parentTitle, firstNumber: null, targetCount: null }
}

/**
 * The exam being edited, as the sheet draws it: its sections in order, questions numbered across the whole exam as the
 * question list numbers them. Shared passages cannot be edited here, so they come from the quiz as it was loaded.
 */
export function draftsToPaper(
  title: string,
  durationMinutes: number | null,
  sections: DraftSection[],
  loaded: Pick<TeacherQuizEditor, 'groups' | 'questions'>
): ExamPaper {
  const groupOf = new Map(loaded.questions.map((question) => [question.id, question.groupId]))
  const groupIds = new Set<string>()
  let number = 0
  const questions = sections.flatMap((section) =>
    section.questions.map((question) => {
      const groupId = (question.serverId && groupOf.get(question.serverId)) || null
      if (groupId) groupIds.add(groupId)
      return paperQuestion(question, section.clientId, groupId, ++number)
    })
  )
  return {
    id: 'draft',
    title: title.trim() || 'Đề chưa đặt tên',
    durationMinutes,
    examFormat: 'EXAM',
    parts: sections.map(part),
    groups: loaded.groups
      .filter((group) => groupIds.has(group.id))
      .map((group) => ({
        id: group.id,
        partId: questions.find((question) => question.groupId === group.id)?.partId ?? '',
        instruction: group.instruction,
        passage: group.passage,
        passageImageUrl: group.imageUrl,
        chart: null,
      })),
    questions,
  }
}
