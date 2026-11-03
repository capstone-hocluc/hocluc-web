import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button as AriaButton, Disclosure, DisclosurePanel, Heading } from 'react-aria-components'
import { cn } from '../../../lib/cn'
import Button from '../../console/button'
import { ChevronDown, Plus } from '../../console/icons'
import ScrollArea from '../../ui/ScrollArea'
import { Checkbox } from '../../tailgrids/core/checkbox'
import { questionStatus, type DraftSection, type QuestionStatus } from './exam-draft'

const CELL_TONE: Record<QuestionStatus, string> = {
  ok: 'border-card-border bg-card-background text-text-secondary hover:bg-background-gray-secondary',
  'missing-answer': 'border-badge-warning-text/30 bg-badge-warning-bg text-badge-warning-text',
  'needs-review': 'border-badge-info-text/30 bg-badge-info-bg text-badge-info-text',
}

const CELL_SELECTED = 'border-transparent bg-primary text-white'

const STATUS_LABEL: Record<QuestionStatus, string> = {
  ok: '',
  'missing-answer': ', thiếu đáp án',
  'needs-review': ', cần rà soát',
}

const LEGEND: Array<{ label: string; tone: string }> = [
  { label: 'Đang chọn', tone: CELL_SELECTED },
  { label: 'Thiếu đáp án', tone: CELL_TONE['missing-answer'] },
  { label: 'Cần rà soát', tone: CELL_TONE['needs-review'] },
]

/** Reveal a newly active question without remounting the group's focused controls. */
function QuestionGroup({ selectedId, children }: { selectedId: string | null; children: ReactNode }) {
  const [state, setState] = useState({ selectedId, expanded: true })
  if (state.selectedId !== selectedId) {
    setState({ selectedId, expanded: selectedId !== null || state.expanded })
  }
  return <Disclosure isExpanded={state.expanded} onExpandedChange={(expanded) => setState({ selectedId, expanded })} className="rounded-lg">{children}</Disclosure>
}

/** The exam's sections as foldable groups, each with a grid of numbered cells coloured by what the question still needs. */
export default function ExamQuestionRail({ sections, selectedId, canEditStructure, busy, footer, onSelect, onAddQuestion, onAddSection }: {
  sections: DraftSection[]
  selectedId: string | null
  /** Sections and questions may be added; false for a fixed structure or a locked exam. */
  canEditStructure: boolean
  busy: boolean
  /** Extra actions pinned under the question grid, above the colour legend. */
  footer?: ReactNode
  onSelect: (clientId: string) => void
  onAddQuestion: (sectionId: string) => void
  onAddSection: () => void
}) {
  const [onlyUnresolved, setOnlyUnresolved] = useState(false)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const nav = railRef.current?.querySelector('nav')
    const selected = nav?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!nav || !selected) return
    const viewport = nav.getBoundingClientRect()
    const cell = selected.getBoundingClientRect()
    if (cell.top < viewport.top) nav.scrollTop += cell.top - viewport.top - 8
    else if (cell.bottom > viewport.bottom) nav.scrollTop += cell.bottom - viewport.bottom + 8
  }, [selectedId, onlyUnresolved])

  // Numbers run across the whole exam, in the order the questions are saved.
  let counter = 0
  const rows = sections.map((section) => ({
    section,
    cells: section.questions.map((question) => ({ question, number: ++counter, status: questionStatus(question) })),
  }))
  const unresolved = rows.reduce((total, row) => total + row.cells.filter((cell) => cell.status !== 'ok').length, 0)

  return (
    <div ref={railRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-4 pb-2 text-sm">
        <strong className="font-semibold text-text-primary">{counter} câu</strong>
        {(unresolved > 0 || onlyUnresolved) && (
          <Checkbox isSelected={onlyUnresolved} onChange={setOnlyUnresolved} className="text-xs text-text-secondary">
            Chỉ câu cần xử lý ({unresolved})
          </Checkbox>
        )}
      </div>

      <ScrollArea as="nav" aria-label="Danh sách câu hỏi" className="flex min-h-0 flex-1 flex-col gap-1 px-2 pb-3">
        {rows.map(({ section, cells }, index) => {
          const shown = onlyUnresolved ? cells.filter((cell) => cell.status !== 'ok') : cells
          if ((onlyUnresolved || !canEditStructure) && shown.length === 0) return null
          const startsGroup = section.parentTitle !== null && section.parentTitle !== sections[index - 1]?.parentTitle
          return (
            <div key={section.clientId} className="flex flex-col">
              {startsGroup && <p className="m-0 px-2 pt-3 pb-1 text-xs font-semibold tracking-wide text-text-tertiary uppercase">{section.parentTitle}</p>}
              <QuestionGroup selectedId={cells.some(cell => cell.question.clientId === selectedId) ? selectedId : null}>
                <Heading className="m-0 text-sm">
                  <AriaButton slot="trigger" className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-0 bg-transparent px-2 py-2 text-left font-medium text-text-primary hover:bg-background-gray-secondary">
                    <span className="min-w-0 break-words">{section.childTitle ?? section.title}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-normal text-text-tertiary">
                      {cells.length}
                      <ChevronDown size={14} aria-hidden className="-rotate-90 transition-transform group-aria-expanded:rotate-0" />
                    </span>
                  </AriaButton>
                </Heading>
                <DisclosurePanel>
                  <div className="grid grid-cols-6 gap-1.5 px-2 pt-1 pb-2">
                    {shown.map(({ question, number, status }) => {
                      const selected = question.clientId === selectedId
                      return (
                        <button
                          key={question.clientId}
                          type="button"
                          aria-current={selected ? 'true' : undefined}
                          aria-label={`Câu ${number}${STATUS_LABEL[status]}`}
                          onClick={() => onSelect(question.clientId)}
                          className={cn(
                            'grid h-9 cursor-pointer place-items-center rounded-lg border text-xs font-semibold transition-colors',
                            selected ? CELL_SELECTED : CELL_TONE[status],
                          )}
                        >
                          {number}
                        </button>
                      )
                    })}
                  </div>
                  {canEditStructure && !onlyUnresolved && (
                    <div className="px-2 pb-2">
                      <Button appearance="ghost" size="sm" disabled={busy} onClick={() => onAddQuestion(section.clientId)}>
                        <Plus size={14} />Thêm câu hỏi
                      </Button>
                    </div>
                  )}
                </DisclosurePanel>
              </QuestionGroup>
            </div>
          )
        })}
        {canEditStructure && !onlyUnresolved && (
          <div className="px-2 pt-2">
            <Button appearance="outline" size="sm" className="w-full" disabled={busy} onClick={onAddSection}>
              <Plus size={14} />Thêm phần thi
            </Button>
          </div>
        )}
      </ScrollArea>

      {footer && <div className="border-t border-card-border px-4 py-3">{footer}</div>}

      <ul aria-label="Chú thích màu" className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 border-t border-card-border px-4 py-3 text-xs text-text-secondary">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn('size-3.5 rounded border', item.tone)} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
