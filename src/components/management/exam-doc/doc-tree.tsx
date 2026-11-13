// Rows of the workspace's tree, drawn like a word processor's document tabs: a chevron that folds the row's children,
// a page icon, the title, and the row the reader is on lit as a pill. An exam's outline (its headings and questions)
// unfolds under the exam, indented along a guide line.
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import { cn } from '../../../lib/cn'
import { ChevronDown, FileText, type LucideIcon } from '../../console/icons'
import type { ExamPaper } from '../ai-assistant/exam-format'
import { activeOutlineIndex, outlineOf, type OutlineItem } from './doc-outline'

const INDENT_PX = 16

interface TreeRowProps {
  depth: number
  label: string
  /** The accessible name, when it says more than the label ("Tới câu 3"). */
  ariaLabel?: string
  icon?: LucideIcon | null
  current?: boolean
  /** Undefined: the row has no children to fold. */
  expanded?: boolean
  onToggle?: () => void
  onClick?: () => void
  /** The second click of a double click, run in place of `onClick` (the first click already ran it). */
  onDoubleClick?: () => void
  /** Shown at the end of the row (a status, a menu). */
  trailing?: ReactNode
  /** A line of an exam's outline: smaller, and lit by its text rather than a pill. */
  minor?: boolean
}

export function TreeRow({
  depth,
  label,
  ariaLabel,
  icon: Icon = FileText,
  current,
  expanded,
  onToggle,
  onClick,
  onDoubleClick,
  trailing,
  minor,
}: TreeRowProps) {
  return (
    <div
      className={cn(
        'group/row flex min-w-0 items-center gap-0.5 rounded-full pr-1 transition-colors',
        current && !minor ? 'bg-badge-primary-background text-primary-text' : 'hover:bg-background-gray-secondary'
      )}
      // A margin, not a padding: the pill of a nested row starts at its indent, right of the guide line.
      style={{ marginLeft: depth * INDENT_PX }}
    >
      {expanded === undefined ? (
        <span aria-hidden className="size-7 shrink-0" />
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? `Thu gọn ${label}` : `Mở ${label}`}
          aria-expanded={expanded}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-icon-tertiary transition-colors hover:bg-background-gray-tertiary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
        >
          <ChevronDown size={15} strokeWidth={2} className={cn('transition-transform', !expanded && '-rotate-90')} />
        </button>
      )}
      <button
        type="button"
        // The click count, not a dblclick event: the first click may open another exam and draw the row anew.
        onClick={(event) => (event.detail === 2 && onDoubleClick ? onDoubleClick() : onClick?.())}
        aria-label={ariaLabel}
        aria-current={current ? 'location' : undefined}
        title={label}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2.5 rounded-full pr-1 text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-input-primary-focus-border',
          minor ? 'py-1.5 text-[13px]' : 'py-2 text-sm',
          current ? 'font-medium text-primary-text' : minor ? 'text-text-secondary' : 'text-text-primary'
        )}
      >
        {Icon && <Icon size={17} aria-hidden className={cn('shrink-0', current ? 'text-primary-text' : 'text-icon-tertiary')} />}
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
      {trailing}
    </div>
  )
}

/** Folded rows, remembered while the outline is shown; everything starts unfolded. */
function useFolded() {
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set())
  const toggle = (id: string) =>
    setFolded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return { isOpen: (id: string) => !folded.has(id), toggle }
}

/** The rows at `depth`, along a guide line under the chevron of the row they hang from. */
function GuidedList({ depth, label, children }: { depth: number; label?: string; children: ReactNode }) {
  return (
    <ul
      aria-label={label}
      className="relative flex flex-col gap-px before:absolute before:inset-y-0.5 before:left-(--guide) before:w-px before:bg-card-border"
      style={{ '--guide': `${(depth - 1) * INDENT_PX + 14}px` } as CSSProperties}
    >
      {children}
    </ul>
  )
}

function EmptyOutline({ depth, children }: { depth: number; children: ReactNode }) {
  return (
    <p className="py-1.5 text-xs text-text-tertiary" style={{ paddingLeft: depth * INDENT_PX + 30 }}>
      {children}
    </p>
  )
}

interface OutlineNode {
  item: OutlineItem
  index: number
  children: OutlineNode[]
}

/** Headings nest by level; a question line goes under the heading before it. */
function nest(items: OutlineItem[]): OutlineNode[] {
  const roots: OutlineNode[] = []
  const stack: OutlineNode[] = []
  items.forEach((item, index) => {
    const node: OutlineNode = { item, index, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].item.level >= item.level) stack.pop()
    const parent = stack[stack.length - 1]
    if (parent) parent.children.push(node)
    else roots.push(node)
    if (item.level < 4) stack.push(node)
  })
  return roots
}

const NO_OUTLINE: { items: OutlineItem[]; active: number } = { items: [], active: -1 }

function selectOutline(editor: Editor | null) {
  if (!editor || editor.isDestroyed) return NO_OUTLINE
  const items = outlineOf(editor.state.doc)
  return { items, active: activeOutlineIndex(items, editor.state.selection.from) }
}

/** A document's headings and every question line, under its exam (`depth` is that exam's depth + 1). */
export function EditorOutlineTree({
  editor,
  depth,
  onJump,
}: {
  editor: Editor | null
  depth: number
  /** Takes the sheet to the line at `pos`. */
  onJump: (pos: number) => void
}) {
  // The selector reads `editor` from the closure: the hook's snapshot keeps the editor it was first given until the
  // next transaction, which would leave a freshly loaded document unlisted.
  const { items, active } = useEditorState({ editor, selector: () => selectOutline(editor) }) ?? NO_OUTLINE
  const { isOpen, toggle } = useFolded()

  if (items.length === 0) return <EmptyOutline depth={depth}>Tiêu đề và các câu hỏi sẽ hiện ở đây</EmptyOutline>

  const rows = (nodes: OutlineNode[], level: number): ReactNode =>
    nodes.map((node) => {
      const open = isOpen(node.item.id)
      return (
        <li key={node.item.id}>
          <TreeRow
            depth={level}
            label={node.item.text}
            // "Tới câu 61. …": the jump wording, with the visible text kept.
            ariaLabel={`Tới ${node.item.text}`}
            icon={null}
            minor
            current={node.index === active}
            expanded={node.children.length > 0 ? open : undefined}
            onToggle={() => toggle(node.item.id)}
            onClick={() => onJump(node.item.pos)}
          />
          {node.children.length > 0 && open && <GuidedList depth={level + 1}>{rows(node.children, level + 1)}</GuidedList>}
        </li>
      )
    })

  return (
    <GuidedList depth={depth} label="Bố cục đề">
      {rows(nest(items), depth)}
    </GuidedList>
  )
}

/** A structured draft's sections, parts and questions, under its exam (`depth` is that exam's depth + 1). */
export function PaperOutlineTree({
  paper,
  numberOf,
  onJump,
  depth,
}: {
  paper: ExamPaper
  numberOf: Map<string, number>
  onJump: (questionId: string) => void
  depth: number
}) {
  const { isOpen, toggle } = useFolded()
  const sections: Array<{ id: string; title: string | null; parts: ExamPaper['parts'] }> = []
  for (const part of paper.parts) {
    const title = part.parentTitle ?? null
    const last = sections[sections.length - 1]
    if (last && last.title === title) last.parts.push(part)
    else sections.push({ id: `section-${part.id}`, title, parts: [part] })
  }

  if (paper.questions.length === 0) return <EmptyOutline depth={depth}>Chưa có câu</EmptyOutline>

  const partRows = (parts: ExamPaper['parts'], level: number) =>
    parts.map((part) => {
      const questions = paper.questions.filter((question) => question.partId === part.id)
      const open = isOpen(part.id)
      return (
        <li key={part.id}>
          <TreeRow
            depth={level}
            label={part.targetCount !== null ? `${part.title} (${questions.length}/${part.targetCount})` : part.title}
            icon={null}
            minor
            expanded={questions.length > 0 ? open : undefined}
            onToggle={() => toggle(part.id)}
            onClick={() => questions[0] && onJump(questions[0].id)}
          />
          {open && questions.length > 0 && (
            <GuidedList depth={level + 1}>
              {questions.map((question) => (
                <li key={question.id}>
                  <TreeRow
                    depth={level + 1}
                    label={`Câu ${numberOf.get(question.id)}. ${question.prompt}`}
                    ariaLabel={`Tới câu ${numberOf.get(question.id)}`}
                    icon={null}
                    minor
                    onClick={() => onJump(question.id)}
                  />
                </li>
              ))}
            </GuidedList>
          )}
        </li>
      )
    })

  return (
    <GuidedList depth={depth} label="Bố cục đề">
      {sections.map((section) =>
        section.title ? (
          <li key={section.id}>
            <TreeRow
              depth={depth}
              label={section.title}
              icon={null}
              minor
              expanded={isOpen(section.id)}
              onToggle={() => toggle(section.id)}
              onClick={() => toggle(section.id)}
            />
            {isOpen(section.id) && <GuidedList depth={depth + 1}>{partRows(section.parts, depth + 1)}</GuidedList>}
          </li>
        ) : (
          partRows(section.parts, depth)
        )
      )}
    </GuidedList>
  )
}
