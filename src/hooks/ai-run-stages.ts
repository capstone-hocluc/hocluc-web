// The steps of an assistant run as the chat shows them: its stages, and under each the tools it called. The same
// functions follow a run live, from its stream, and rebuild a finished run from the steps the server kept with its
// reply, so both read alike and carry the times each step started and finished.
import type { AiAssistantMode, AiDifficulty, AiRunStep, AiStreamEvent } from '../services/aiAssistantService'
import {
  DIFFICULTY_LABELS,
  sectionLabel,
  type AiTraceItem,
  type AiTraceStage,
} from '../components/management/ai-assistant/exam-format'

export const STAGE_TITLES: Record<string, string> = {
  explore: 'Khảo sát ngân hàng câu hỏi',
  plan: 'Lập ma trận đề',
  write: 'Soạn câu hỏi',
  lookup: 'Tra cứu',
  revise: 'Sửa câu hỏi',
  queue: 'Đang chờ đến lượt',
  agent: 'Xử lý yêu cầu',
}

/** What each tool the assistant calls does, in the teacher's words; its raw arguments (ids, JSON) stay hidden. */
const TOOL_LABELS: Record<string, string> = {
  get_exam_format: 'Xem cấu trúc đề',
  list_patterns: 'Xem các dạng câu của môn',
  get_pattern: 'Đọc yêu cầu của dạng câu',
  matrix_stats: 'Đếm câu có sẵn trong ngân hàng',
  search_bank_questions: 'Tìm câu mẫu trong ngân hàng',
  list_draft_questions: 'Xem các câu của đề',
  get_draft_question: 'Đọc câu trong đề',
  list_document_questions: 'Xem các câu của đề',
  get_document_question: 'Đọc câu trong đề',
  revise_question: 'Viết lại câu',
  check_question: 'Kiểm tra lại câu',
  read_exam: 'Đọc đề',
  read_questions: 'Đọc câu trong đề',
  remove_questions: 'Bỏ câu',
  move_questions: 'Đổi thứ tự câu',
  rewrite_questions: 'Viết lại câu',
  add_questions: 'Thêm câu',
  compose_exam: 'Chuẩn bị soạn đề mới',
  compose_mock_exam: 'Chuẩn bị soạn đề mô phỏng',
  export_exam: 'Chuẩn bị file',
  update_answer_key: 'Cập nhật đáp án',
  remove_answer_key: 'Bỏ đáp án',
  import_paper: 'Chuẩn bị nạp đề',
  edit_text: 'Sửa chữ trên đề',
  insert_text: 'Thêm dòng chữ',
  remove_text: 'Bỏ dòng chữ',
  add_exam_header: 'Thêm đầu đề',
  replace_text: 'Tìm và thay chữ',
}

/** A file of the exam in the teacher's words: "Word không đáp án". */
export function examFileName(file: { format?: unknown; answers?: unknown }) {
  return `${file.format === 'pdf' ? 'PDF' : 'Word'} ${file.answers === false ? 'không đáp án' : 'có đáp án'}`
}

/** A tool call as one plain line: what it did, and at most a short readable hint (a difficulty, a query). */
export function toolLine(data: { tool: string; arguments?: unknown }) {
  const args = (data.arguments && typeof data.arguments === 'object' ? data.arguments : {}) as Record<string, unknown>
  const label = TOOL_LABELS[data.tool] ?? (data.tool ? 'Tra cứu dữ liệu' : 'Công cụ')
  const difficulty = typeof args.difficulty === 'string' ? DIFFICULTY_LABELS[args.difficulty as AiDifficulty] : undefined
  const query = typeof args.query === 'string' ? args.query.trim() : ''
  const numbers = Array.isArray(args.numbers) ? args.numbers.filter((value): value is number => typeof value === 'number') : []
  const number =
    typeof args.number === 'number'
      ? `câu ${args.number}`
      : numbers.length > 0
        ? `câu ${numbers.join(', ')}`
        : typeof args.count === 'number'
          ? `${args.count} câu`
          : undefined
  if (data.tool === 'export_exam') return { label, detail: examFileName(args) }
  if (data.tool === 'remove_answer_key') return { label: args.part === 'all' ? 'Bỏ đáp án và lời giải' : 'Bỏ lời giải' }
  const detail =
    number ?? (difficulty ? `mức ${difficulty.toLowerCase()}` : query ? (query.length > 60 ? `${query.slice(0, 59)}…` : query) : undefined)
  return { label, detail }
}

/** Calls still going finish at `at`; `keep` stays open (the question being written outlasts the checks on it). */
function closeItems(items: AiTraceItem[] | undefined, at: number, keep?: string): AiTraceItem[] | undefined {
  if (!items?.some((item) => item.state === 'running' && item.id !== keep)) return items
  return items.map((item) =>
    item.state === 'running' && item.id !== keep
      ? { ...item, state: 'done', ...(item.startedAt !== undefined ? { completedAt: item.completedAt ?? at } : {}) }
      : item
  )
}

/**
 * A stage with the times of its state: running from the first moment it ran, done from when it stopped, its calls
 * finishing with it. A stage seen only once it was done still keeps when it stopped: the chat times it from where the
 * stage before it stopped (see `stageParts`).
 */
function clocked(stage: AiTraceStage, at: number): AiTraceStage {
  if (stage.state === 'running') return stage.startedAt === undefined ? { ...stage, startedAt: at } : stage
  if (stage.state !== 'done') return stage
  const items = closeItems(stage.items, at)
  const finishes = stage.completedAt === undefined
  if (!finishes && items === stage.items) return stage
  return { ...stage, ...(finishes ? { completedAt: at } : {}), ...(items ? { items } : {}) }
}

/** A stage over at `at`; one that never ran (still pending) is marked done with no time of its own. */
function ended(stage: AiTraceStage, at: number): AiTraceStage {
  return stage.state === 'pending' ? { ...stage, state: 'done' } : clocked({ ...stage, state: 'done' }, at)
}

/**
 * The stages a run shows from its start at `at`, the one it starts on running. A run followed once it was already going
 * passes null: its first stage is timed from the step the server replays for it.
 */
export function initialStages(mode: AiAssistantMode, agent = false, at: number | null = Date.now()): AiTraceStage[] {
  const time = at === null ? {} : { startedAt: at }
  if (agent) return [{ id: 'agent', title: STAGE_TITLES.agent, items: [], state: 'running', ...time }]
  if (mode === 'ask') return [{ id: 'lookup', title: STAGE_TITLES.lookup, items: [], state: 'running', ...time }]
  // A revise run reports its steps under the write stage, retitled.
  if (mode === 'revise') return [{ id: 'write', title: STAGE_TITLES.revise, items: [], state: 'running', ...time }]
  // A mock exam takes its questions' kinds from the paper it copies: it plans from that paper, with no survey.
  if (mode === 'mock-exam') {
    return [
      { id: 'plan', title: STAGE_TITLES.plan, state: 'running', ...time },
      { id: 'write', title: STAGE_TITLES.write, state: 'pending' },
    ]
  }
  return [
    { id: 'explore', title: STAGE_TITLES.explore, state: 'running', ...time },
    { id: 'plan', title: STAGE_TITLES.plan, state: 'pending' },
    { id: 'write', title: STAGE_TITLES.write, state: 'pending' },
  ]
}

export function withStage(stages: AiTraceStage[], id: string, patch: Partial<AiTraceStage>, at: number): AiTraceStage[] {
  if (!stages.some((stage) => stage.id === id)) {
    return [...stages, clocked({ id, title: STAGE_TITLES[id] ?? id, ...patch }, at)]
  }
  return stages.map((stage) => (stage.id === id ? clocked({ ...stage, ...patch }, at) : stage))
}

/** A later stage seen at all means the ones before it are over. */
export function finishBefore(stages: AiTraceStage[], id: string, at: number): AiTraceStage[] {
  const order = ['queue', 'agent', 'explore', 'plan', 'write']
  const index = order.indexOf(id)
  if (index < 0) return stages
  return stages.map((stage) =>
    order.indexOf(stage.id) >= 0 && order.indexOf(stage.id) < index && stage.state !== 'done' ? ended(stage, at) : stage
  )
}

export function markAllDone(stages: AiTraceStage[], at: number): AiTraceStage[] {
  return stages.map((stage) => ended(stage, at))
}

/** A call of the stage running now; the calls before it in that stage have finished. */
export function addRunItem(stages: AiTraceStage[], item: AiTraceItem, at: number): AiTraceStage[] {
  const running = [...stages].reverse().find((stage) => stage.state === 'running') ?? stages[stages.length - 1]
  if (!running) return stages
  return stages.map((stage) =>
    stage.id === running.id ? { ...stage, items: [...(closeItems(stage.items, at, 'slot') ?? []), item] } : stage
  )
}

export type AiRunStepEvent = Extract<AiStreamEvent, { type: 'stage' | 'tool' | 'slot' }>

/** When a step happened: the server's time, so a run caught up on in one go is timed as it went, else now. */
export const stepTime = (event: AiRunStepEvent) => (typeof event.data.at === 'number' ? event.data.at : Date.now())

/**
 * The stages after one step of a run arrived at `at`: a stage starting or finishing, a tool called, a question begun.
 * `key` names the step uniquely within the run (a tool call's id).
 */
export function stepStages(
  stages: AiTraceStage[],
  event: AiRunStepEvent,
  mode: AiAssistantMode,
  at: number,
  key: string
): AiTraceStage[] {
  if (event.type === 'tool') {
    const line = toolLine(event.data)
    return addRunItem(stages, { id: `tool-${key}`, label: line.label, detail: line.detail, state: 'running', startedAt: at }, at)
  }
  if (event.type === 'slot') {
    const label = event.data.revise && event.data.number
      ? `Sửa câu ${event.data.number}`
      : `Soạn câu ${event.data.index}/${event.data.total}`
    const detail = [
      sectionLabel(event.data.section),
      event.data.difficulty ? DIFFICULTY_LABELS[event.data.difficulty as AiDifficulty] : null,
    ]
      .filter(Boolean)
      .join(' · ')
    const finished = finishBefore(stages, 'write', at)
    const previous = finished.find((stage) => stage.id === 'write')?.items ?? []
    // The question the run is at, untimed: a compose run tells of a question once it is saved (the units are written
    // side by side), so when its writing began is not known.
    const item: AiTraceItem = { id: 'slot', label, detail: detail || undefined, state: 'running' }
    return withStage(finished, 'write', {
      state: 'running',
      detail: `${event.data.index}/${event.data.total} câu`,
      items: [...(closeItems(previous.filter((entry) => entry.id !== 'slot'), at) ?? []), item],
    }, at)
  }
  const stageId = mode === 'ask' ? 'lookup' : event.data.stage
  if (stageId === 'queue') {
    // Queued behind other teachers' runs: shown first, the run's own steps wait until it starts.
    const queued = stages.find((stage) => stage.id === 'queue')
    return [
      { id: 'queue', title: STAGE_TITLES.queue, state: 'running', detail: event.data.summary ?? undefined, startedAt: queued?.startedAt ?? at },
      ...stages
        .filter((stage) => stage.id !== 'queue')
        .map((stage) => (stage.state === 'running' ? { ...stage, state: 'pending' as const, startedAt: undefined } : stage)),
    ]
  }
  let next = stages
  if (mode !== 'ask' && (stageId === 'explore' || stageId === 'plan' || stageId === 'write')) {
    next = finishBefore(next, stageId, at)
  }
  let detail: string | undefined
  let notes: string[] | undefined
  // The assistant's plan for the request ("Sẽ bỏ câu 3 rồi thêm 2 câu hình học") shows as its step's line.
  if (stageId === 'explore' || stageId === 'agent') detail = event.data.summary ?? undefined
  if (stageId === 'plan' && event.data.status === 'done') {
    const cells = event.data.cells ?? 0
    detail = `${cells} câu${event.data.degraded ? ' · rút gọn' : ''}${event.data.mimic ? ' · theo đề mẫu' : ''}`
    notes = (event.data.notes ?? []).filter((note) => typeof note === 'string' && note.trim() !== '')
  }
  return withStage(next, stageId, {
    title: STAGE_TITLES[stageId] ?? stageId,
    state: event.data.status === 'done' ? 'done' : 'running',
    ...(detail !== undefined ? { detail } : {}),
    ...(notes?.length ? { notes } : {}),
  }, at)
}

const STEP_TYPES = new Set(['stage', 'tool', 'slot'])

/**
 * A finished run's stages, rebuilt from the steps the server kept with its reply, each at the time it was written.
 * `endedAt` (the reply's own time) finishes what was still going when the run ended. Undefined when none were kept.
 */
export function replaySteps(steps: readonly AiRunStep[] | null | undefined, mode: AiAssistantMode, endedAt: number) {
  const kept = (steps ?? []).filter((step) => STEP_TYPES.has(step.type) && typeof step.at === 'number' && step.data)
  if (kept.length === 0) return undefined
  // An ask run's calls belong to its one stage, which its first step opens.
  let stages: AiTraceStage[] = mode === 'ask' ? initialStages('ask', false, kept[0].at) : []
  kept.forEach((step, index) => {
    stages = stepStages(stages, { type: step.type, data: step.data } as AiRunStepEvent, mode, step.at, `step-${index}`)
  })
  return markAllDone(stages, Number.isFinite(endedAt) ? Math.max(endedAt, kept.at(-1)!.at) : kept.at(-1)!.at)
}
