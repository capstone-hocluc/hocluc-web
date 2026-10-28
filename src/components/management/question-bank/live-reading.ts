import { Allow, parse } from 'partial-json'
import type { BankIngestStage, BankStreamEvent, BankStreamPart, BankStreamSnapshot } from '../../../services/bankReadingStream'
import type { BankIngestStatus } from '../../../services/questionBankService'

/** A question as far as the AI has written it; the last one of a part being read is still being written. */
export interface LiveQuestion {
  number: number
  text: string
  options: { label: string; text: string }[]
  partId: string
  writing: boolean
}

export interface LiveLogEntry {
  at: number
  text: string
  tone: 'info' | 'success' | 'warning' | 'danger'
}

export interface LiveReading {
  status: BankIngestStatus
  stage: BankIngestStage | null
  progress: string | null
  error: string | null
  parts: BankStreamPart[]
  labelled: number
  labelTotal: number
  reviewed: number
  reviewTotal: number
  rereading: number
  needsPerson: number
  /** The question Gemini is checking now. */
  checking: number | null
  /** The question Luna is reading again now. */
  rewriting: number | null
  log: LiveLogEntry[]
  /** The server is reading this paper and streams it; false for a stored snapshot. */
  live: boolean
  ended: boolean
}

const LOG_KEPT = 60

export const STAGE_LABELS: Record<BankIngestStage, string> = {
  QUEUED: 'Hàng chờ',
  STRUCTURE: 'Đọc cấu trúc đề',
  QUESTIONS: 'Đọc câu hỏi',
  KEY_TABLE: 'Đọc bảng đáp án trong đề',
  REVIEW: 'Gemini soát và Luna đọc lại',
  FIGURES: 'Cắt hình',
  KEY: 'Ghép đáp án',
  STORE: 'Lưu và lọc câu trùng',
  LABEL: 'Gán nhãn bằng Jev',
  DONE: 'Xong',
}

export const partName = (part: Pick<BankStreamPart, 'title' | 'fromQuestion' | 'toQuestion'>) =>
  `${part.title ? part.title + ' · ' : ''}câu ${part.fromQuestion}–${part.toQuestion}`

export function initialReading(status: BankIngestStatus): LiveReading {
  return { status, stage: null, progress: null, error: null, parts: [], labelled: 0, labelTotal: 0, reviewed: 0, reviewTotal: 0, rereading: 0, needsPerson: 0, checking: null, rewriting: null, log: [], live: false, ended: false }
}

function note(state: LiveReading, text: string, tone: LiveLogEntry['tone'] = 'info'): LiveLogEntry[] {
  return [{ at: Date.now(), text, tone }, ...state.log].slice(0, LOG_KEPT)
}

function fromSnapshot(snapshot: BankStreamSnapshot, previous: LiveReading): LiveReading {
  return {
    status: snapshot.status,
    stage: snapshot.stage,
    progress: snapshot.progress,
    error: snapshot.error,
    parts: snapshot.parts,
    labelled: snapshot.labelled,
    labelTotal: snapshot.labelTotal,
    reviewed: snapshot.reviewed ?? 0,
    reviewTotal: snapshot.reviewTotal ?? 0,
    rereading: snapshot.rereading ?? 0,
    needsPerson: snapshot.needsPerson ?? 0,
    checking: snapshot.checking ?? null,
    rewriting: snapshot.rewriting ?? null,
    log: previous.log.length ? previous.log : snapshot.live ? note(previous, 'Đã kết nối, đang theo dõi AI đọc đề') : [],
    live: snapshot.live,
    ended: !snapshot.live,
  }
}

/** One event of the stream applied to what is shown. */
export function applyEvent(state: LiveReading, event: BankStreamEvent): LiveReading {
  switch (event.type) {
    case 'snapshot':
      return fromSnapshot(event.data, state)
    case 'stage': {
      const moved = event.data.stage !== state.stage
      return {
        ...state,
        status: 'RUNNING',
        stage: event.data.stage,
        progress: event.data.progress,
        log: moved ? note(state, `Bắt đầu: ${STAGE_LABELS[event.data.stage]}`) : state.log,
      }
    }
    case 'plan':
      return {
        ...state,
        parts: event.data,
        log: note(state, `Chia đề thành ${event.data.length} phần, AI đọc lần lượt từ trên xuống`),
      }
    case 'part': {
      const part = event.data
      const known = state.parts.some(p => p.id === part.id)
      const parts = known ? state.parts.map(p => (p.id === part.id ? part : p)) : [...state.parts, part]
      const text =
        part.status === 'DONE'
          ? `AI viết xong ${partName(part)}: ${part.questions} câu`
          : part.attempt > 1
            ? `Đọc lại ${partName(part)} (lần ${part.attempt})`
            : `AI bắt đầu viết ${partName(part)}`
      return { ...state, parts, log: note(state, text, part.status === 'DONE' ? 'success' : part.attempt > 1 ? 'warning' : 'info') }
    }
    case 'text':
      return {
        ...state,
        parts: state.parts.map(p =>
          p.id === event.data.partId && p.attempt === event.data.attempt ? { ...p, text: p.text + event.data.text } : p
        ),
      }
    case 'review': {
      const { reviewed, reviewTotal, rereading, needsPerson, checking, rewriting } = event.data
      const first = state.reviewTotal === 0 && reviewTotal > 0
      const newPerson = needsPerson > state.needsPerson
      return {
        ...state,
        reviewed,
        reviewTotal,
        rereading,
        needsPerson,
        checking: checking ?? null,
        rewriting: rewriting ?? null,
        log: first
          ? note(state, 'Gemini bắt đầu soát từng câu')
          : newPerson
            ? note(state, `${needsPerson} câu chờ người duyệt bản đọc`, 'warning')
            : state.log,
      }
    }
    case 'label': {
      const first = state.labelTotal === 0 && event.data.labelTotal > 0
      return {
        ...state,
        labelled: event.data.labelled,
        labelTotal: event.data.labelTotal,
        log: first ? note(state, `Jev gán nhãn ${event.data.labelTotal} câu`) : state.log,
      }
    }
    case 'end':
      return {
        ...state,
        checking: null,
        rewriting: null,
        status: event.data.status,
        stage: event.data.status === 'DONE' ? 'DONE' : state.stage,
        error: event.data.error,
        live: false,
        ended: true,
        log: note(
          state,
          event.data.status === 'DONE' ? 'Nạp đề xong' : `Dừng vì lỗi: ${event.data.error ?? 'không rõ'}`,
          event.data.status === 'DONE' ? 'success' : 'danger'
        ),
      }
  }
}

/** The JSON object the AI is writing, without a code fence or words before it. */
function jsonPart(text: string) {
  const start = text.indexOf('{')
  if (start < 0) return null
  return text.slice(start).replace(/```\s*$/, '')
}

interface WrittenQuestion {
  number?: number
  text?: string
  options?: { label?: string; text?: string }[]
}

/** The questions of a part as far as they are written; null when what is written cannot be read yet. */
export function questionsOf(part: BankStreamPart): LiveQuestion[] | null {
  const json = jsonPart(part.text)
  if (!json) return []
  let read: { questions?: WrittenQuestion[] }
  try {
    read = parse(json, Allow.ALL) as { questions?: WrittenQuestion[] }
  } catch {
    return null
  }
  const written = Array.isArray(read?.questions) ? read.questions : []
  return written
    .filter(q => typeof q?.number === 'number')
    .map((q, index) => ({
      number: q.number as number,
      // "Câu 12: " is printed before the question: it is not part of it
      text: String(q.text ?? '').replace(/^\s*(?:Câu|Question)\s+\d+\s*[:.]\s*/i, ''),
      options: (Array.isArray(q.options) ? q.options : []).map((o, at) => ({
        label: String(o?.label ?? String.fromCharCode(65 + at)),
        text: String(o?.text ?? ''),
      })),
      partId: part.id,
      writing: part.status === 'READING' && index === written.length - 1,
    }))
}

/** The part to follow: the first one being written, so the view does not jump between parts read in parallel. */
export function followedPart(parts: BankStreamPart[]) {
  return [...parts].filter(p => p.status === 'READING').sort((a, b) => a.fromQuestion - b.fromQuestion)[0] ?? null
}
