import { questionNumbers, type ExamPaper, type ExamPaperGroup, type ExamPaperQuestion } from '../../ai-assistant/exam-format'

export type QuizRow =
  | { kind: 'part'; key: string; heading: string }
  | { kind: 'passage'; key: string; group: ExamPaperGroup; numbers: number[] }
  | { kind: 'question'; key: string; question: ExamPaperQuestion; number: number }

/**
 * The paper in reading order, numbered as the A4 sheet numbers it: a heading per part (its section's title the first
 * time only), each shared passage before the first question it serves.
 */
export function quizRows(paper: ExamPaper): QuizRow[] {
  const numbers = questionNumbers(paper)
  const numberOf = (question: ExamPaperQuestion) => numbers.get(question.id) ?? question.position
  const groups = new Map(paper.groups.map((group) => [group.id, group]))
  const shown = new Set<string>()
  const rows: QuizRow[] = []
  let parent: string | null = null
  for (const part of paper.parts) {
    const questions = paper.questions.filter((question) => question.partId === part.id)
    const heading = [part.parentTitle !== parent ? part.parentTitle : null, part.title].filter(Boolean).join(' · ')
    parent = part.parentTitle
    if (heading) rows.push({ kind: 'part', key: `part:${part.id}`, heading })
    for (const question of questions) {
      const group = question.groupId ? groups.get(question.groupId) : undefined
      if (group && !shown.has(group.id)) {
        shown.add(group.id)
        const served = questions.filter((item) => item.groupId === group.id).map(numberOf)
        rows.push({ kind: 'passage', key: `group:${group.id}`, group, numbers: served })
      }
      rows.push({ kind: 'question', key: question.id, question, number: numberOf(question) })
    }
  }
  return rows
}
