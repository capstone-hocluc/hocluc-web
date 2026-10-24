import type { ExtractedExam, ExtractedFigure, ExtractedGroup, ExtractedQuestion } from '../../../services/aiExtractionService'

// Matches the server's own bar for "worth a second look" (QuizAuthoringServiceImpl.toJob).
const LOW_CONFIDENCE = 0.75

function estimatedFigure(figures: ExtractedFigure[], ids: string[]) {
  return figures.some(figure => ids.includes(figure.id) && figure.source === 'ESTIMATE')
}

export interface QuestionFlags {
  review: string | null
  estimated: boolean
  figureMissing: boolean
  noAnswer: boolean
}

export function questionFlags(exam: ExtractedExam, question: ExtractedQuestion, group: ExtractedGroup | undefined): QuestionFlags {
  const lowConfidence = question.confidence !== null && question.confidence < LOW_CONFIDENCE
  const note = question.reviewNote?.trim()
  const figureIds = question.imageUrl ? question.figureIds : (group?.figureIds ?? question.figureIds)
  return {
    review: note || (lowConfidence ? `AI chưa chắc (${Math.round((question.confidence ?? 0) * 100)}%)` : null),
    estimated: estimatedFigure(exam.figures, figureIds),
    figureMissing: question.hasFigure && !question.imageUrl && !group?.imageUrl,
    noAnswer: !question.options.some(option => option.correct),
  }
}

export function previewCounts(exam: ExtractedExam) {
  const groups = new Map(exam.groups.map(group => [group.key, group]))
  let review = 0
  let estimated = 0
  for (const question of exam.questions) {
    const flags = questionFlags(exam, question, question.groupKey ? groups.get(question.groupKey) : undefined)
    if (flags.review || flags.figureMissing) review += 1
    if (flags.estimated) estimated += 1
  }
  return { review, estimated, withoutAnswer: exam.questions.filter(q => !q.options.some(o => o.correct)).length }
}
