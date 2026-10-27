import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '../../../lib/cn'
import { Search } from '../../console/icons'
import { Skeleton } from '../../tailgrids/core/skeleton'
import type { MasterDataContent } from '../../../services/masterDataService'
import type { RecordKind, Selection } from './master-data-tables'
import {
  HEAD_H,
  layoutStructure,
  NODE_H,
  NODE_W,
  recordName,
  rootOf,
  type BandData,
  type ColumnData,
  type LaneData,
  type RecordFlowNode,
  type RecordState,
  type StructureLayout,
  type StructureNode,
  type StructureRoot,
} from './master-data-structure-layout'

const KIND: Record<
  RecordKind,
  {
    label: string
    text: string
    soft: string
    border: string
    ring: string
    solid: string
    stroke: string
  }
> = {
  domains: {
    label: 'Domain',
    text: 'text-badge-violet-text',
    soft: 'bg-badge-violet-background',
    border: 'border-badge-violet-text/30',
    ring: 'ring-badge-violet-text/35',
    solid: 'bg-badge-violet-text border-badge-violet-text',
    stroke: 'var(--color-badge-violet-text)',
  },
  patterns: {
    label: 'Dạng câu',
    text: 'text-badge-blue-text',
    soft: 'bg-badge-blue-background',
    border: 'border-badge-blue-text/30',
    ring: 'ring-badge-blue-text/35',
    solid: 'bg-badge-blue-text border-badge-blue-text',
    stroke: 'var(--color-badge-blue-text)',
  },
  skills: {
    label: 'Kỹ năng',
    text: 'text-badge-cyan-text',
    soft: 'bg-badge-cyan-background',
    border: 'border-badge-cyan-text/30',
    ring: 'ring-badge-cyan-text/35',
    solid: 'bg-badge-cyan-text border-badge-cyan-text',
    stroke: 'var(--color-badge-cyan-text)',
  },
  microSkills: {
    label: 'Micro-skill',
    text: 'text-badge-orange-text',
    soft: 'bg-badge-orange-background',
    border: 'border-badge-orange-text/30',
    ring: 'ring-badge-orange-text/35',
    solid: 'bg-badge-orange-text border-badge-orange-text',
    stroke: 'var(--color-badge-orange-text)',
  },
  errorCodes: {
    label: 'Lỗi sai thường gặp',
    text: 'text-badge-rose-text',
    soft: 'bg-badge-rose-background',
    border: 'border-badge-rose-text/30',
    ring: 'ring-badge-rose-text/35',
    solid: 'bg-badge-rose-text border-badge-rose-text',
    stroke: 'var(--color-badge-rose-text)',
  },
}

function RecordNode({ data }: NodeProps<RecordFlowNode>) {
  const k = KIND[data.kind]
  const focus = data.state === 'focus'
  return (
    <div
      className={cn(
        'flex h-full w-full cursor-pointer flex-col justify-center gap-0.5 rounded-xl border px-3 shadow-xs transition-[opacity,box-shadow,translate] duration-200 hover:shadow-md',
        k.border,
        k.soft,
        data.state === 'dim' && 'opacity-30',
        data.state === 'lit' && '-translate-y-0.5 shadow-md',
        data.state === 'path' && cn('ring-4', k.ring),
        focus && cn('shadow-lg ring-4', k.solid, k.ring)
      )}
      title={data.name}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-1 !min-w-0 !border-0 !bg-transparent"
      />
      {data.role === 'SUPPORTING' && (
        <span
          className={cn(
            'self-start rounded-full border px-1.5 text-[10px] leading-4 font-medium',
            focus ? 'border-white/60 text-white' : 'border-badge-cyan-text/40 text-badge-cyan-text'
          )}
        >
          hỗ trợ
        </span>
      )}
      <span
        className={cn(
          'line-clamp-2 text-[13px] leading-snug font-medium',
          focus ? 'text-white' : 'text-text-primary'
        )}
      >
        {data.name}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-1 !min-w-0 !border-0 !bg-transparent"
      />
    </div>
  )
}

function ColumnNode({ data }: NodeProps<Node<ColumnData, 'column'>>) {
  const k = KIND[data.kind]
  return (
    <div className="flex h-full items-center gap-2 text-xs font-semibold tracking-wide text-text-primary uppercase">
      <span aria-hidden className={cn('size-2.5 rounded-[3px]', k.solid)} />
      {k.label}
      <span className="rounded-full bg-background-gray-secondary px-2 py-0.5 text-[11px] font-medium tracking-normal text-text-tertiary tabular-nums">
        {data.count}
      </span>
    </div>
  )
}

function LaneNode({ data }: NodeProps<Node<LaneData, 'lane'>>) {
  return (
    <div
      className={cn('h-full w-full rounded-2xl', data.alt && 'bg-background-gray-secondary/60')}
    />
  )
}

function BandNode({ data }: NodeProps<Node<BandData, 'band'>>) {
  return (
    <div
      className={cn(
        'relative h-full w-full border-t border-card-border',
        data.alt && 'bg-brand-500/[0.025]'
      )}
    >
      {data.note && (
        <span className="absolute top-1.5 left-[38px] text-[11px] font-medium text-badge-orange-text italic">
          {data.note}
        </span>
      )}
    </div>
  )
}

const nodeTypes = { record: RecordNode, column: ColumnNode, lane: LaneNode, band: BandNode }

const isRecord = (node: StructureNode): node is RecordFlowNode => node.type === 'record'

/** A record node and everything above and below it in the tree. */
function lineage(layout: StructureLayout, id: string): Set<string> {
  const ids = new Set([id])
  for (let at = layout.parentOf.get(id); at; at = layout.parentOf.get(at)) ids.add(at)
  const below = [id]
  while (below.length) {
    const at = below.pop()!
    for (const edge of layout.edges)
      if (edge.source === at && !ids.has(edge.target)) {
        ids.add(edge.target)
        below.push(edge.target)
      }
  }
  return ids
}

function StructureCanvas({
  content,
  root,
  focus,
  seek,
  onPick,
}: {
  content: MasterDataContent
  root: StructureRoot
  focus: Selection | null
  seek: number
  onPick: (selection: Selection) => void
}) {
  const layout = useMemo(() => layoutStructure(content, root), [content, root])
  const flow = useRef<ReactFlowInstance<StructureNode> | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<string | null>(null)

  // Fit the width and pin the column headings to the top: a short tree should not float mid-canvas.
  function place(instance: ReactFlowInstance<StructureNode>) {
    const width = box.current?.clientWidth ?? 0
    if (!width) return
    const pad = 20
    const zoom = Math.min(1, Math.max(0.6, (width - pad * 2) / layout.width))
    void instance.setViewport({
      x: Math.max(pad, (width - layout.width * zoom) / 2),
      y: pad + HEAD_H * zoom,
      zoom,
    })
  }

  const records = useMemo(() => layout.nodes.filter(isRecord), [layout])
  const focused = useMemo(
    () =>
      focus
        ? records
            .filter((n) => n.data.kind === focus.kind && n.data.code === focus.code)
            .map((n) => n.id)
        : [],
    [records, focus]
  )
  const path = useMemo(() => {
    const ids = new Set<string>()
    for (const id of focused)
      for (let at: string | undefined = id; at; at = layout.parentOf.get(at)) ids.add(at)
    return ids
  }, [layout, focused])
  const lit = useMemo(() => (hover ? lineage(layout, hover) : null), [layout, hover])

  const nodes = useMemo(
    () =>
      layout.nodes.map((n): StructureNode => {
        if (!isRecord(n)) return n
        const state: RecordState | undefined = focused.includes(n.id)
          ? 'focus'
          : lit
            ? lit.has(n.id)
              ? 'lit'
              : 'dim'
            : path.has(n.id)
              ? 'path'
              : undefined
        return { ...n, data: { ...n.data, state } }
      }),
    [layout, focused, path, lit]
  )
  const edges = useMemo(
    () =>
      layout.edges.map((e) => {
        const on = lit
          ? lit.has(e.source) && lit.has(e.target)
          : path.has(e.source) && path.has(e.target)
        const role = e.data?.role
        return {
          ...e,
          animated: !!lit && on,
          style: {
            stroke: on && e.data ? KIND[e.data.kind].stroke : 'var(--color-border-secondary)',
            strokeWidth: on ? 2.25 : 1.5,
            strokeDasharray: role === 'SUPPORTING' ? '6 4' : role === 'LOOSE' ? '2 5' : undefined,
            opacity: lit && !on ? 0.2 : 1,
            transition: 'opacity 200ms, stroke 200ms',
          },
        }
      }),
    [layout, lit, path]
  )

  // Finding a record from the search moves the view to it; picking one on the canvas leaves the view alone.
  useEffect(() => {
    if (!seek || !flow.current) return
    const target = records.find((n) => focused.includes(n.id))
    if (target)
      void flow.current.setCenter(target.position.x + NODE_W / 2, target.position.y + NODE_H / 2, {
        zoom: 1,
        duration: 600,
      })
  }, [seek]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={box} className="h-full w-full">
      <ReactFlow<StructureNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          flow.current = instance
          place(instance)
        }}
        minZoom={0.2}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnDoubleClick={false}
        onNodeMouseEnter={(_, node) => {
          if (isRecord(node)) setHover(node.id)
        }}
        onNodeMouseLeave={() => setHover(null)}
        onNodeClick={(_, node) => {
          if (isRecord(node)) onPick({ kind: node.data.kind, code: node.data.code })
        }}
      >
        <Background gap={22} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  )
}

function RailButton({
  active,
  kind,
  name,
  meta,
  onClick,
}: {
  active: boolean
  kind: RecordKind
  name: string
  meta?: string
  onClick: () => void
}) {
  const k = KIND[kind]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active || undefined}
      className={cn(
        'flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-500',
        active ? k.soft : 'hover:bg-background-gray-secondary'
      )}
    >
      <span className="flex items-start gap-2 text-sm leading-snug font-medium text-text-primary">
        <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', k.solid)} />
        {name}
      </span>
      {meta && <span className="text-xs text-text-tertiary">{meta}</span>}
    </button>
  )
}

function RailHeading({ children }: { children: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
      {children}
    </p>
  )
}

const SEARCH_KINDS: RecordKind[] = ['domains', 'patterns', 'skills', 'microSkills', 'errorCodes']

/**
 * The version as one tree: pick a domain (or an error code) on the left and its question types, skills,
 * micro-skills and errors hang in columns on the right. A record opens its detail sheet.
 */
export default function MasterDataStructure({
  content,
  onOpen,
}: {
  content: MasterDataContent
  onOpen: (selection: Selection) => void
}) {
  const [picked, setPicked] = useState<StructureRoot | null>(null)
  // A picked domain or error that an edit removed falls back to the first domain.
  const pickedExists = picked && content[picked.kind].some((row) => row.code === picked.code)
  const root: StructureRoot | null = pickedExists
    ? picked
    : content.domains[0]
      ? { kind: 'domains', code: content.domains[0].code }
      : null
  const [focus, setFocus] = useState<Selection | null>(null)
  const [seek, setSeek] = useState(0)
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return SEARCH_KINDS.map((kind) => ({
      kind,
      rows: content[kind]
        .map((row) => ({ code: row.code, name: recordName(content, kind, row.code) }))
        .filter((row) => `${row.code} ${row.name}`.toLowerCase().includes(q))
        .slice(0, 8),
    })).filter((group) => group.rows.length)
  }, [content, query])

  function chooseRoot(next: StructureRoot) {
    setPicked(next)
    setFocus(null)
  }

  function find(selection: Selection) {
    const next = rootOf(content, selection)
    if (next) setPicked(next)
    setFocus(selection)
    setSeek((n) => n + 1)
    onOpen(selection)
  }

  if (!root) {
    return (
      <div className="rounded-xl border border-dashed border-card-border px-5 py-10 text-center text-sm text-text-tertiary">
        Phiên bản này chưa có domain.
      </div>
    )
  }

  const domainMeta = (code: string) => {
    const patterns = content.patterns.filter((p) => p.domainCode === code).length
    const skills = content.skills.filter((s) => s.domainCodes.includes(code)).length
    return `${patterns} dạng câu · ${skills} kỹ năng`
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="flex max-h-[46vh] min-h-0 flex-col overflow-hidden rounded-2xl border border-card-border bg-card-background lg:h-[min(76vh,760px)] lg:max-h-none">
        <div className="border-b border-card-border p-3">
          <label className="relative block">
            <span className="sr-only">Tìm trong cấu trúc</span>
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm dạng câu, kỹ năng..."
              className="h-10 w-full rounded-lg border border-border-secondary bg-transparent pr-3 pl-9 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-brand-500"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results ? (
            results.length ? (
              results.map((group) => (
                <div key={group.kind}>
                  <RailHeading>{KIND[group.kind].label}</RailHeading>
                  {group.rows.map((row) => (
                    <RailButton
                      key={row.code}
                      active={focus?.kind === group.kind && focus.code === row.code}
                      kind={group.kind}
                      name={row.name}
                      onClick={() => find({ kind: group.kind, code: row.code })}
                    />
                  ))}
                </div>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-text-tertiary">
                Không có mục nào khớp “{query.trim()}”.
              </p>
            )
          ) : (
            <>
              <RailHeading>Domain</RailHeading>
              {content.domains.map((d) => (
                <RailButton
                  key={d.code}
                  active={root.kind === 'domains' && root.code === d.code}
                  kind="domains"
                  name={d.nameVi}
                  meta={domainMeta(d.code)}
                  onClick={() => chooseRoot({ kind: 'domains', code: d.code })}
                />
              ))}
              {content.errorCodes.length > 0 && <RailHeading>Lỗi sai thường gặp</RailHeading>}
              {content.errorCodes.map((e) => (
                <RailButton
                  key={e.code}
                  active={root.kind === 'errorCodes' && root.code === e.code}
                  kind="errorCodes"
                  name={recordName(content, 'errorCodes', e.code)}
                  onClick={() => chooseRoot({ kind: 'errorCodes', code: e.code })}
                />
              ))}
            </>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-card-border bg-card-background">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-card-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className={cn('size-2.5 shrink-0 rounded-[3px]', KIND[root.kind].solid)}
            />
            <h2 className="truncate text-base font-semibold text-text-primary">
              {recordName(content, root.kind, root.code)}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary sm:ml-auto">
            <LegendLine label="Kỹ năng chính" />
            <LegendLine label="Hỗ trợ" dash="6 4" />
            <LegendLine label="Chưa có dạng câu" dash="2 5" />
          </div>
        </header>
        <div className="h-[min(70vh,700px)] min-h-[420px]">
          <StructureCanvas
            key={`${root.kind}:${root.code}`}
            content={content}
            root={root}
            focus={focus}
            seek={seek}
            onPick={(selection) => {
              setFocus(selection)
              onOpen(selection)
            }}
          />
        </div>
      </section>
    </div>
  )
}

function LegendLine({ label, dash }: { label: string; dash?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="24" height="6" aria-hidden className="overflow-visible">
        <line
          x1="0"
          y1="3"
          x2="24"
          y2="3"
          stroke="var(--color-border-secondary)"
          strokeWidth="2"
          strokeDasharray={dash}
        />
      </svg>
      {label}
    </span>
  )
}

/** Mirrors the structure tab: the domain rail on the left, the column diagram on the right. */
export function MasterDataStructureSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải cấu trúc"
      className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card-background p-3 lg:h-[min(76vh,760px)]">
        <Skeleton className="h-10 rounded-lg" />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 px-3 py-2">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        ))}
      </div>
      <div className="flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card-background">
        <div className="flex items-center gap-3 border-b border-card-border px-4 py-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid h-[min(70vh,700px)] min-h-[420px] grid-cols-5 gap-6 overflow-hidden p-6">
          {[1, 4, 4, 5, 5].map((rows, col) => (
            <div key={col} className={cn('flex flex-col gap-3', col === 0 && 'justify-center')}>
              <Skeleton className="mb-3 h-3 w-24" />
              {Array.from({ length: rows }, (_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
