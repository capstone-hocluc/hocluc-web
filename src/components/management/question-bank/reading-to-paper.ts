// A paper being read, in the shapes the exam workspace already shows: the draft paper it lays out on the sheet, the
// words being written (the same live box the compose run uses), and the stages of the run.
import type { ExtractedQuestion, ExtractedSection } from '../../../services/aiExtractionService'
import type { BankIngestStage, BankStreamPart } from '../../../services/bankReadingStream'
import type { BankReading } from '../../../services/questionBankService'
import type { AiTraceItem, AiTraceStage, AiTraceState, ExamPaper, ExamPaperGroup, ExamPaperPart, ExamPaperQuestion } from '../ai-assistant/exam-format'
import type { LiveDraftShown } from '../exam-doc/nodes/live-draft-widget'
import { STAGE_LABELS, followedPart, partName, questionsOf, type LiveQuestion, type LiveReading } from './live-reading'

/** The id of a read question on the sheet (its `examItem` tag), from its printed number. */
export const readItemId = (number: number) => `read-${number}`

const LOOSE_PART: ExamPaperPart = { id: 'read-paper', title: 'Câu hỏi', code: null, parentTitle: null, firstNumber: null, targetCount: null }

/** What a question the AI gave back empty says on the sheet. */
const UNREAD = '(AI chưa đọc được câu này)'

// formulas read without their $…$ marks while they are being written, as in the compose run
const plain = (text: string) => text.replace(/\$+/g, '').trim()

interface ReadQuestion {
  number: number
  text: string
  options: { label: string; text: string; correct?: boolean }[]
  sectionKey: string | null
  groupKey: string | null
  stored: ExtractedQuestion | null
}

export interface ReadPaper {
  paper: ExamPaper
  /** What to show of the question being written, or null when nothing is written now. */
  live: LiveDraftShown | null
  /** The number the AI works on now: written, read again, or checked. */
  current: number | null
  /** What the AI does to `current`. */
  activity: 'writing' | 'checking' | null
  questionCount: number
}

function inRange(section: { fromQuestion: number | null; toQuestion: number | null }, number: number) {
  return section.fromQuestion !== null && section.toQuestion !== null && number >= section.fromQuestion && number <= section.toQuestion
}

/** The part a question goes under: its own section, else the deepest section whose range holds its number. */
function sectionOf(sections: ExtractedSection[], number: number, key: string | null) {
  if (key && sections.some((section) => section.key === key)) return key
  const holding = sections.filter((section) => inRange(section, number))
  const parents = new Set(holding.map((section) => section.parentKey))
  return holding.find((section) => !parents.has(section.key))?.key ?? null
}

function examQuestion(question: ReadQuestion, partId: string, groupId: string | null): ExamPaperQuestion {
  const review = question.stored?.review ?? null
  return {
    id: readItemId(question.number),
    partId,
    groupId,
    position: question.number,
    printedNumber: question.number,
    prompt: question.text,
    passage: null,
    options: question.options.map((option, at) => ({
      id: `${readItemId(question.number)}-${at}`,
      label: option.label,
      text: option.text,
      correct: Boolean(option.correct),
    })),
    explanation: question.stored?.explanation ?? '',
    method: '',
    eliminations: {},
    difficulty: 'TB',
    patternCode: null,
    patternName: null,
    sourceTitle: null,
    imageUrl: question.stored?.imageUrl ?? null,
    passageImageUrl: null,
    chart: null,
    source: 'bank',
    kept: true,
    needsReview: review?.status === 'NEEDS_HUMAN',
    reasons: review?.note ? [review.note] : [],
    revision: 0,
    failure: null,
  }
}

/**
 * The paper as read so far: the stored questions, the questions the AI finished in a part it is still reading, and
 * the one it is writing now (shown live, not on the paper yet). Numbers are the paper's own.
 */
export function readingToPaper(title: string, reading: BankReading, view: LiveReading): ReadPaper {
  const byNumber = new Map<number, ReadQuestion>()
  for (const question of reading.questions) {
    byNumber.set(question.number, { ...question, stored: question })
  }

  let writing: LiveQuestion | null = null
  for (const part of view.parts.filter((item) => item.status === 'READING')) {
    for (const question of questionsOf(part) ?? []) {
      if (question.writing) {
        if (part.id === followedPart(view.parts)?.id) writing = question
        continue
      }
      if (byNumber.has(question.number)) continue
      byNumber.set(question.number, { ...question, sectionKey: null, groupKey: null, stored: null })
    }
  }

  const sections = reading.sections
  const partIdOf = (number: number, key: string | null) => sectionOf(sections, number, key) ?? LOOSE_PART.id
  const groupOf = (question: ReadQuestion) =>
    question.groupKey ?? reading.groups.find((group) => inRange(group, question.number))?.key ?? null

  const questions = [...byNumber.values()]
    // a question still being written with nothing in it yet is left out; one the AI gave back empty keeps its place
    .filter((question) => question.stored !== null || question.text.trim() !== '' || question.options.length > 0)
    .map((question) =>
      question.text.trim() === '' && question.options.length === 0 ? { ...question, text: UNREAD } : question
    )
    .sort((a, b) => a.number - b.number)
    .map((question) => examQuestion(question, partIdOf(question.number, question.sectionKey), groupOf(question)))

  const usedParts = new Set(questions.map((question) => question.partId))
  if (writing) usedParts.add(partIdOf(writing.number, null))
  const titles = new Map(sections.map((section) => [section.key, section.title]))
  const parts: ExamPaperPart[] = sections
    .filter((section) => usedParts.has(section.key))
    .map((section) => ({
      id: section.key,
      title: section.title,
      code: null,
      parentTitle: section.parentKey ? (titles.get(section.parentKey) ?? null) : null,
      firstNumber: section.fromQuestion,
      targetCount: null,
    }))
  if (usedParts.has(LOOSE_PART.id)) parts.push(LOOSE_PART)

  const usedGroups = new Set(questions.map((question) => question.groupId))
  const groups: ExamPaperGroup[] = reading.groups
    .filter((group) => usedGroups.has(group.key))
    .map((group) => ({
      id: group.key,
      partId: partIdOf(group.fromQuestion ?? 0, group.sectionKey),
      instruction: group.instruction,
      passage: group.passage,
      passageImageUrl: group.imageUrl,
      chart: null,
    }))

  const live: LiveDraftShown | null = writing
    ? {
        partId: partIdOf(writing.number, null),
        label: 'AI đang đọc đề…',
        numbers: [writing.number],
        view: { passage: null, questions: [{ stem: plain(writing.text), options: writing.options.map((option) => plain(option.text)).filter(Boolean) }] },
      }
    : null
  const current = writing?.number ?? view.rewriting ?? view.checking ?? null
  const activity = writing || view.rewriting !== null ? 'writing' : view.checking !== null ? 'checking' : null

  return {
    paper: { id: reading.sourceId, title, durationMinutes: null, examFormat: '', parts, groups, questions },
    live,
    current,
    activity: current === null ? null : activity,
    questionCount: questions.length,
  }
}

const STEPS: BankIngestStage[] = ['STRUCTURE', 'QUESTIONS', 'REVIEW', 'FIGURES', 'KEY', 'STORE', 'LABEL']

function partState(part: BankStreamPart): AiTraceState {
  return part.status === 'DONE' ? 'done' : part.status === 'READING' ? 'running' : 'pending'
}

/** The run as the stages the compose run shows: done up to the step it is on, the parts read one by one. */
export function readingStages(view: LiveReading): AiTraceStage[] {
  const finished = view.status === 'DONE'
  // the key table is read between the questions and the review
  const current = view.stage === 'KEY_TABLE' ? STEPS.indexOf('QUESTIONS') + 0.5 : view.stage ? STEPS.indexOf(view.stage) : -1
  return STEPS.map((stage, index) => {
    const state: AiTraceState = finished || index < current ? 'done' : index === current && view.status !== 'FAILED' ? 'running' : 'pending'
    const items: AiTraceItem[] | undefined =
      stage === 'QUESTIONS' && view.parts.length > 0
        ? view.parts.map((part) => ({
            id: part.id,
            label: partName(part),
            detail: part.status === 'DONE' ? `${part.questions} câu` : part.attempt > 1 ? `lần ${part.attempt}` : undefined,
            state: partState(part),
          }))
        : undefined
    const detail =
      stage === 'QUESTIONS' && view.parts.length > 0
        ? `${view.parts.filter((part) => part.status === 'DONE').length}/${view.parts.length} phần`
        : stage === 'REVIEW' && view.reviewTotal > 0
          ? `${view.reviewed}/${view.reviewTotal} câu${view.needsPerson > 0 ? `, ${view.needsPerson} câu chờ người duyệt` : ''}`
          : stage === 'LABEL' && view.labelTotal > 0
            ? `${view.labelled}/${view.labelTotal} câu`
            : undefined
    return { id: stage, title: STAGE_LABELS[stage], state, detail, items }
  })
}
