import { useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { ChevronRight } from '../../console/icons'
import type { Category } from '../../../services/categoryService'
import type { ScheduleResourceStatus } from '../../../hooks/useScheduleResource'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Skeleton } from '../../tailgrids/core/skeleton'

export interface SubjectGroup {
  root: Category
  children: Category[]
}

export interface SubjectCounts {
  total: number
  byCategory: Record<string, number>
}

function countLabel(
  count: number | undefined,
  loading: boolean,
  counts: SubjectCounts | null | undefined
): ReactNode {
  if (counts) return count ?? 0
  return loading ? '…' : '—'
}

interface SubjectRailProps {
  status: ScheduleResourceStatus
  errorMessage?: string
  onRetry: () => void
  groups: SubjectGroup[]
  counts?: SubjectCounts | null
  countsLoading: boolean
  selectedId: string
  onSelect: (id: string) => void
  /** Off for pages that list subjects without course counts and have no "all subjects" view. */
  withCounts?: boolean
  className?: string
}

function RailRow({
  id,
  name,
  depth = 0,
  active = true,
  count,
  selected,
  onSelect,
  indentForToggle = false,
}: {
  id: string
  name: string
  depth?: number
  active?: boolean
  count?: ReactNode
  selected: boolean
  onSelect: (id: string) => void
  /** Leaves room on the left for the fold button of a subject with sub-subjects. */
  indentForToggle?: boolean
}) {
  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(id)}
      className={cn(
        'relative flex w-full items-center justify-between gap-2 rounded-lg pr-3 text-left transition-colors hover:bg-background-gray-secondary focus-visible:outline-2 focus-visible:outline-offset-2',
        depth > 0 ? 'py-1.5 pl-9 text-[13px]' : cn('py-2 text-sm', indentForToggle ? 'pl-8' : 'pl-3'),
        selected
          ? 'bg-background-gray-secondary font-medium text-text-primary'
          : 'text-text-secondary'
      )}
    >
      {selected && (
        <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary" />
      )}
      <span className={cn('min-w-0 truncate', !active && 'line-through')}>{name}</span>
      {count !== undefined && (
        <span className="shrink-0 text-xs tabular-nums text-text-tertiary">{count}</span>
      )}
    </button>
  )
}

function RailSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 p-1" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <Skeleton key={index} className="h-8 w-full rounded-lg" />
      ))}
    </div>
  )
}

export default function SubjectRail({
  status,
  errorMessage,
  onRetry,
  groups,
  counts,
  countsLoading,
  selectedId,
  onSelect,
  withCounts = true,
  className,
}: SubjectRailProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  // Every top row keeps the same left edge once any subject has a fold button.
  const foldable = groups.some((group) => group.children.length > 0)
  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  return (
    <nav
      aria-label="Môn học"
      className={cn(
        'self-start flex-col gap-0.5 rounded-xl border border-card-border bg-card-background p-2',
        className
      )}
    >
      {status === 'loading' || status === 'idle' ? (
        <RailSkeleton />
      ) : status === 'ready' ? (
        <>
          {withCounts && (
            <>
              <RailRow
                id="ALL"
                name="Tất cả môn"
                indentForToggle={foldable}
                count={countLabel(counts?.total, countsLoading, counts)}
                selected={selectedId === 'ALL'}
                onSelect={onSelect}
              />
              <div className="my-1.5 h-px bg-card-border" aria-hidden />
            </>
          )}
          {groups.map(({ root, children }) => {
            // Sub-subjects stay folded until opened, except while one of them is the selected subject.
            const open = expanded.has(root.id) || children.some((child) => child.id === selectedId)
            return (
            <div key={root.id} className="flex flex-col gap-0.5">
              <div className="relative">
                <RailRow
                  id={root.id}
                  name={root.name}
                  active={root.active}
                  count={
                    withCounts
                      ? countLabel(counts?.byCategory[root.id], countsLoading, counts)
                      : undefined
                  }
                  selected={selectedId === root.id}
                  onSelect={onSelect}
                  indentForToggle={foldable}
                />
                {children.length > 0 && (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={open ? `Thu gọn môn con của ${root.name}` : `Mở môn con của ${root.name}`}
                    onClick={() => toggle(root.id)}
                    className="absolute top-1/2 left-1 flex size-6 -translate-y-1/2 items-center justify-center rounded text-text-tertiary hover:bg-background-gray-primary hover:text-text-primary"
                  >
                    <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} />
                  </button>
                )}
              </div>
              {open && children.map((child) => (
                <RailRow
                  key={child.id}
                  id={child.id}
                  name={child.name}
                  depth={1}
                  active={child.active}
                  count={
                    withCounts
                      ? countLabel(counts?.byCategory[child.id], countsLoading, counts)
                      : undefined
                  }
                  selected={selectedId === child.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
            )
          })}
        </>
      ) : (
        <ScheduleResourceState
          status={status}
          errorMessage={errorMessage}
          onRetry={onRetry}
          skeleton="list"
        >
          {null}
        </ScheduleResourceState>
      )}
    </nav>
  )
}
