import type {
  AiAgentStep,
  AiAssistantMode,
  AiChart,
  AiCheckResult,
  AiDifficulty,
  AiDraftItem,
  AiDraftQuestion,
  AiExamDraftRecord,
  AiExamFormat,
} from '../../../services/aiAssistantService'

export type AiTraceState = 'done' | 'running' | 'pending'

/** One tool call or one progress line inside a trace stage. */
export interface AiTraceItem {
  id: string
  label: string
  detail?: string
  state?: AiTraceState
}

/** A stage of a run: explore, plan, write each question, look things up. */
export interface AiTraceStage {
  id: string
  title: string
  detail?: string
  items?: AiTraceItem[]
  state?: AiTraceState
}

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  body: string
  createdAt: string
  mode?: AiAssistantMode
  /** One line per think/tool step of an ask reply. */
  trace?: string[]
  /** The live stages of a compose or mock-exam run. */
  stages?: AiTraceStage[]
  /** Questions this turn put on the paper; the chat links to them instead of printing them. */
  addedItemIds?: string[]
  error?: boolean
}

export interface ExamPaperOption {
  id: string
  label: string
  text: string
  correct: boolean
}

export interface ExamPaperQuestion {
  id: string
  partId: string
  groupId: string | null
  position: number
  prompt: string
  passage: string | null
  options: ExamPaperOption[]
  explanation: string
  difficulty: AiDifficulty
  patternCode: string | null
  patternName: string | null
  /** The bank paper a reused question came from. */
  sourceTitle: string | null
  imageUrl: string | null
  passageImageUrl: string | null
  /** A chart drawn from the AI's data, shown under the question. */
  chart: AiChart | null
  source: 'ai' | 'bank' | 'manual'
  /** False while the teacher has not accepted an AI or bank question yet. */
  kept: boolean
  needsReview: boolean
  reasons: string[]
}

export interface ExamPaperPart {
  id: string
  title: string
  /** The "1.1" style label printed before a sub-part heading. */
  code: string | null
  /** The larger section this part belongs to; consecutive parts share a paper heading. */
  parentTitle: string | null
  /** The number of the first question of the part on a full paper. */
  firstNumber: number | null
  targetCount: number | null
}

export interface ExamPaperGroup {
  id: string
  partId: string
  instruction: string | null
  passage: string | null
  passageImageUrl: string | null
  /** The chart of the shared passage, shown under it. */
  chart: AiChart | null
}

export interface ExamPaper {
  id: string
  title: string
  durationMinutes: number | null
  examFormat: AiExamFormat | string
  parts: ExamPaperPart[]
  groups: ExamPaperGroup[]
  questions: ExamPaperQuestion[]
}

export const EXAM_FORMATS: { id: AiExamFormat; label: string }[] = [
  { id: 'VACT_2025', label: 'VACT 2025' },
  { id: 'VACT_2018', label: 'VACT 2018' },
]

const VACT_2025_PARTS: ExamPaperPart[] = [
  { id: 'P1.1', title: 'Tiếng Việt', code: '1.1', parentTitle: 'Phần 1. Sử dụng ngôn ngữ', firstNumber: 1, targetCount: 30 },
  { id: 'P1.2', title: 'Tiếng Anh', code: '1.2', parentTitle: 'Phần 1. Sử dụng ngôn ngữ', firstNumber: 31, targetCount: 30 },
  { id: 'P2', title: 'Phần 2. Toán học', code: null, parentTitle: null, firstNumber: 61, targetCount: 30 },
  { id: 'P3.1', title: 'Logic, phân tích số liệu', code: '3.1', parentTitle: 'Phần 3. Tư duy khoa học', firstNumber: 91, targetCount: 12 },
  { id: 'P3.2', title: 'Suy luận khoa học', code: '3.2', parentTitle: 'Phần 3. Tư duy khoa học', firstNumber: 103, targetCount: 18 },
]

const GENERIC_PARTS: ExamPaperPart[] = [
  { id: 'ALL', title: 'Toàn bộ đề', code: null, parentTitle: null, firstNumber: 1, targetCount: null },
]

const DIFFICULTIES: readonly AiDifficulty[] = ['DE', 'TB', 'KHO']

export const DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  DE: 'Dễ',
  TB: 'Trung bình',
  KHO: 'Khó',
}

export function formatLabel(format: string | null | undefined) {
  return EXAM_FORMATS.find((item) => item.id === format)?.label ?? 'Toàn bộ đề'
}

function layoutParts(format: string | null | undefined): ExamPaperPart[] {
  return format === 'VACT_2025' ? VACT_2025_PARTS : GENERIC_PARTS
}

function difficultyOf(value: string | null | undefined): AiDifficulty {
  return DIFFICULTIES.includes(value as AiDifficulty) ? (value as AiDifficulty) : 'TB'
}

function reviewReasons(check: AiCheckResult | null | undefined): string[] {
  if (!check) return []
  const values = [...(check.reasons ?? []), ...(check.warnings ?? [])]
  return [...new Set(values.filter((reason): reason is string => Boolean(reason?.trim())))]
}

/** An option's words without a label the AI repeated in them ("A. 2019, 2021" under label A, printed "A. A. …"). */
function withoutLabel(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const stripped = text.trim().replace(new RegExp(`^${escaped}\\s*[.):]\\s*`, 'i'), '')
  return stripped || text.trim()
}

function optionsOf(item: AiDraftItem) {
  return (item.question.options ?? [])
    .filter((option) => option && typeof option.label === 'string')
    .map((option, index) => {
      const label = option.label || String.fromCharCode(65 + index)
      return {
        id: `${item.id}-${option.label || index}`,
        label,
        text: withoutLabel(option.text ?? '', label),
        correct: option.correct === true,
      }
    })
}

/** The draft the backend stores, as the A4 paper prints it. */
export function buildPaper(
  record: AiExamDraftRecord | null,
  items: readonly AiDraftItem[],
  title: string
): ExamPaper {
  const format = record?.examFormat ?? 'VACT_2025'
  // The exam format's own headings stay as written; partName only names a part the format does not know.
  const partNames = new Map<string, string>()
  for (const item of items) {
    const name = item.question.partName?.trim()
    if (name && !partNames.has(item.sectionCode)) partNames.set(item.sectionCode, name)
  }
  const parts = [...layoutParts(format)]
  const known = new Set(parts.map((part) => part.id))

  for (const item of items) {
    if (known.has(item.sectionCode)) continue
    known.add(item.sectionCode)
    parts.push({
      id: item.sectionCode,
      title: partNames.get(item.sectionCode) ?? item.sectionCode,
      code: null,
      parentTitle: null,
      firstNumber: null,
      targetCount: null,
    })
  }

  const groupMap = new Map<string, ExamPaperGroup>()
  for (const item of items) {
    if (!item.groupKey) continue
    const passageImageUrl = item.question.passageImageUrl?.trim() || null
    const passageChart = item.question.passageChart ?? null
    const group = groupMap.get(item.groupKey)
    if (group) {
      if (!group.passageImageUrl && passageImageUrl) group.passageImageUrl = passageImageUrl
      if (!group.chart && passageChart) group.chart = passageChart
      continue
    }
    groupMap.set(item.groupKey, {
      id: item.groupKey,
      partId: item.sectionCode,
      instruction: null,
      passage: item.question.passage?.trim() ? item.question.passage : null,
      passageImageUrl,
      chart: passageChart,
    })
  }

  const questions = [...items]
    .sort((a, b) => {
      const section = parts.findIndex((part) => part.id === a.sectionCode) - parts.findIndex((part) => part.id === b.sectionCode)
      return section || (a.position ?? 0) - (b.position ?? 0) || a.id.localeCompare(b.id)
    })
    .map((item): ExamPaperQuestion => ({
      id: item.id,
      partId: item.sectionCode,
      groupId: item.groupKey,
      position: item.position ?? 0,
      prompt: item.question.text ?? '',
      passage: item.question.passage?.trim() ? item.question.passage : null,
      options: optionsOf(item),
      explanation: item.question.explanation ?? '',
      difficulty: difficultyOf(item.question.difficulty),
      patternCode: item.question.patternCode?.trim() || null,
      patternName: item.question.patternName?.trim() || null,
      sourceTitle: item.question.sourceTitle?.trim() || null,
      imageUrl: item.question.imageUrl?.trim() || null,
      passageImageUrl: item.question.passageImageUrl?.trim() || null,
      chart: item.question.chart ?? null,
      source: item.source === 'AI' ? 'ai' : item.source === 'BANK' ? 'bank' : 'manual',
      kept: item.kept,
      needsReview: item.checkResult?.needsReview === true,
      reasons: reviewReasons(item.checkResult),
    }))

  return {
    id: record?.id ?? 'draft',
    title: title || record?.name || 'Đề thi mới',
    durationMinutes: 150,
    examFormat: format,
    parts,
    groups: [...groupMap.values()],
    questions,
  }
}

/**
 * Numbers the questions 1, 2, 3… part after part. A paper holding only some parts (ten Toán questions) starts at
 * Câu 1 instead of at the part's place in the full format; a full paper gets the same numbers either way.
 */
export function questionNumbers(paper: ExamPaper): Map<string, number> {
  const numbers = new Map<string, number>()
  let next = 1
  for (const part of paper.parts) {
    paper.questions
      .filter((question) => question.partId === part.id)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
      .forEach((question) => numbers.set(question.id, next++))
  }
  for (const question of paper.questions) {
    if (!numbers.has(question.id)) numbers.set(question.id, next++)
  }
  return numbers
}

/** A blank question the manual add button puts in the draft; its editor opens right away. */
export function emptyManualQuestion(): AiDraftQuestion {
  return {
    difficulty: 'TB',
    questionType: 'SINGLE_CHOICE',
    hasFigure: false,
    text: 'Câu hỏi mới',
    passage: '',
    explanation: '',
    options: ['A', 'B', 'C', 'D'].map((label) => ({
      label,
      text: '',
      correct: label === 'A',
    })),
  }
}

/** The server keeps a run's ask trace as agent steps; the thread prints them as one line each. */
export function traceLines(trace: AiAgentStep[] | string[] | null | undefined): string[] {
  if (!trace?.length) return []
  if (typeof trace[0] === 'string') return trace as string[]
  return (trace as AiAgentStep[])
    .map((step) => {
      if (step.type === 'TOOL_CALL') return step.toolName ? `Gọi công cụ ${step.toolName}` : 'Gọi công cụ'
      if (step.type === 'TOOL_RESULT') {
        if (!step.toolName) return 'Nhận kết quả công cụ'
        return step.resultSize ? `Kết quả ${step.toolName} · ${step.resultSize} ký tự` : `Kết quả ${step.toolName}`
      }
      return step.text?.trim() ?? ''
    })
    .filter(Boolean)
}
