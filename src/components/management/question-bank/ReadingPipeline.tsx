import { useMemo } from 'react'
import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '../../../lib/cn'
import type { BankIngestStage, BankStreamPart } from '../../../services/bankReadingStream'
import { STAGE_LABELS, partName, type LiveReading } from './live-reading'

type StepState = 'waiting' | 'active' | 'done' | 'failed'

type StepData = {
  title: string
  detail?: string
  state: StepState
  /** 0..1, shown as a bar under the step. */
  share?: number
  partId?: string
  followed?: boolean
}

type StepNode = Node<StepData, 'step'>

const ORDER: BankIngestStage[] = ['QUEUED', 'STRUCTURE', 'QUESTIONS', 'FIGURES', 'KEY', 'STORE', 'LABEL', 'DONE']
const STEP_W = 190
const STEP_H = 64
const PART_W = 176
const GAP_X = 28
const GAP_Y = 44
const PER_ROW = 3

const STATE_LABEL: Record<StepState, string> = { waiting: 'Chờ', active: 'Đang làm', done: 'Xong', failed: 'Lỗi' }

function StepCard({ data }: NodeProps<StepNode>) {
  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col justify-center gap-0.5 rounded-xl border bg-card-background px-3 py-2 text-left shadow-sm',
        data.state === 'waiting' && 'border-card-border opacity-70',
        data.state === 'active' && 'border-brand-500 ring-2 ring-brand-500/25',
        data.state === 'done' && 'border-badge-success-text/40',
        data.state === 'failed' && 'border-badge-error-text ring-2 ring-badge-error-text/20',
        data.followed && 'outline-2 outline-offset-2 outline-brand-500',
        data.partId && 'cursor-pointer'
      )}
      title={data.partId ? 'Theo dõi phần này trên trang đề' : undefined}
    >
      <Handle id="t" type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-text-tertiary" />
      <Handle id="l" type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-text-tertiary" />
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className={cn(
            'size-2 shrink-0 rounded-full',
            data.state === 'waiting' && 'bg-text-tertiary/50',
            data.state === 'active' && 'animate-pulse bg-brand-500',
            data.state === 'done' && 'bg-badge-success-text',
            data.state === 'failed' && 'bg-badge-error-text'
          )}
        />
        <span className="truncate text-[13px] font-semibold text-text-primary">{data.title}</span>
        <span className="sr-only">, {STATE_LABEL[data.state]}</span>
      </span>
      {data.detail && <span className="truncate text-[11px] text-text-tertiary">{data.detail}</span>}
      {data.share !== undefined && (
        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-background-gray-secondary">
          <span className="block h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${Math.round(data.share * 100)}%` }} />
        </span>
      )}
      <Handle id="b" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-text-tertiary" />
      <Handle id="r" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-text-tertiary" />
    </div>
  )
}

const nodeTypes = { step: StepCard }

function stageState(stage: BankIngestStage, reading: LiveReading): StepState {
  if (reading.status === 'DONE') return 'done'
  const at = reading.stage === 'KEY_TABLE' ? ORDER.indexOf('QUESTIONS') : reading.stage ? ORDER.indexOf(reading.stage) : -1
  const mine = ORDER.indexOf(stage)
  if (at < 0) return 'waiting'
  if (mine < at) return 'done'
  if (mine > at) return 'waiting'
  return reading.status === 'FAILED' ? 'failed' : 'active'
}

function partState(part: BankStreamPart, reading: LiveReading): StepState {
  if (part.status === 'DONE') return 'done'
  if (part.status === 'READING') return reading.status === 'FAILED' ? 'failed' : 'active'
  return 'waiting'
}

function partDetail(part: BankStreamPart) {
  const pages = part.firstPage === part.lastPage ? `trang ${part.firstPage}` : `trang ${part.firstPage}–${part.lastPage}`
  if (part.status === 'DONE') return `${pages} · ${part.questions} câu`
  if (part.status === 'READING') return `${pages} · ${part.text.length.toLocaleString('vi-VN')} ký tự${part.attempt > 1 ? ` · lần ${part.attempt}` : ''}`
  return pages
}

/** Where every step sits: two in a row at the top, the parts read in parallel below, the rest in two rows after them. */
function layout(reading: LiveReading, followedId: string | null, questionCount: number) {
  const nodes: StepNode[] = []
  const edges: Edge[] = []
  const step = (stage: BankIngestStage, x: number, y: number, extra: Partial<StepData> = {}) =>
    nodes.push({
      id: stage,
      type: 'step',
      position: { x, y },
      width: STEP_W,
      height: STEP_H,
      data: { title: STAGE_LABELS[stage], state: stageState(stage, reading), ...extra },
    })
  /** `side`: steps next to each other in a row are joined side to side, the rest top to bottom. */
  const link = (from: string, to: string, side = false) => {
    const target = nodes.find(n => n.id === to)
    const source = nodes.find(n => n.id === from)
    edges.push({
      id: `${from}->${to}`,
      source: from,
      target: to,
      sourceHandle: side ? 'r' : 'b',
      targetHandle: side ? 'l' : 't',
      type: 'smoothstep',
      animated: target?.data.state === 'active',
      style: { stroke: source?.data.state === 'done' ? 'var(--color-badge-success-text, #16a34a)' : 'var(--color-text-tertiary, #94a3b8)', strokeWidth: 1.5 },
    })
  }

  const rowWidth = PER_ROW * PART_W + (PER_ROW - 1) * GAP_X
  const left = (rowWidth - (2 * STEP_W + GAP_X)) / 2
  step('QUEUED', left, 0)
  step('STRUCTURE', left + STEP_W + GAP_X, 0, { detail: reading.stage === 'STRUCTURE' ? reading.progress ?? undefined : undefined })
  link('QUEUED', 'STRUCTURE', true)

  let y = STEP_H + GAP_Y
  const partIds: string[] = []
  if (reading.parts.length > 0) {
    reading.parts.forEach((part, index) => {
      const row = Math.floor(index / PER_ROW)
      const inRow = Math.min(PER_ROW, reading.parts.length - row * PER_ROW)
      const offset = (rowWidth - (inRow * PART_W + (inRow - 1) * GAP_X)) / 2
      const id = `part:${part.id}`
      partIds.push(id)
      nodes.push({
        id,
        type: 'step',
        position: { x: offset + (index % PER_ROW) * (PART_W + GAP_X), y: y + row * (STEP_H + GAP_Y / 2) },
        width: PART_W,
        height: STEP_H,
        data: { title: partName(part), detail: partDetail(part), state: partState(part, reading), partId: part.id, followed: part.id === followedId },
      })
      link('STRUCTURE', id)
    })
    y += Math.ceil(reading.parts.length / PER_ROW) * (STEP_H + GAP_Y / 2) + GAP_Y / 2
  } else {
    step('QUESTIONS', (rowWidth - STEP_W) / 2, y, { detail: questionCount > 0 ? `${questionCount} câu đã đọc` : undefined })
    link('STRUCTURE', 'QUESTIONS')
    partIds.push('QUESTIONS')
    y += STEP_H + GAP_Y
  }

  const three = (rowWidth - (3 * STEP_W + 2 * GAP_X)) / 2
  step('FIGURES', three, y)
  partIds.forEach(id => link(id, 'FIGURES'))
  step('KEY', three + STEP_W + GAP_X, y)
  step('STORE', three + 2 * (STEP_W + GAP_X), y)
  link('FIGURES', 'KEY', true)
  link('KEY', 'STORE', true)
  y += STEP_H + GAP_Y
  const labelShare = reading.labelTotal > 0 ? reading.labelled / reading.labelTotal : undefined
  step('LABEL', left, y, {
    detail: reading.labelTotal > 0 ? `${reading.labelled}/${reading.labelTotal} câu` : undefined,
    share: reading.stage === 'LABEL' || reading.status === 'DONE' ? labelShare : undefined,
  })
  step('DONE', left + STEP_W + GAP_X, y)
  link('STORE', 'LABEL')
  link('LABEL', 'DONE', true)
  return { nodes, edges }
}

/** The steps of putting the paper into the bank, lit as the AI works through them. Read-only. */
export default function ReadingPipeline({
  reading,
  followedId,
  questionCount,
  onFollowPart,
}: {
  reading: LiveReading
  followedId: string | null
  questionCount: number
  onFollowPart: (partId: string) => void
}) {
  const { nodes, edges } = useMemo(() => layout(reading, followedId, questionCount), [reading, followedId, questionCount])
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-xl border border-card-border bg-background-gray-secondary/40" aria-label="Pipeline nạp đề">
      <ReactFlow
        key={nodes.length}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        preventScrolling={false}
        minZoom={0.3}
        onNodeClick={(_, node) => {
          if (node.data.partId) onFollowPart(node.data.partId)
        }}
      >
        <Background gap={18} size={1} />
      </ReactFlow>
    </div>
  )
}
