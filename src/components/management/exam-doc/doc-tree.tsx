// Rows of the workspace's tree, drawn like a word processor's document tabs: a chevron that folds the row's children,
// a page icon, the title, and the row the reader is on lit as a pill. The exam's own outline (its headings and
// questions) hangs under the exam that is open.
import { useState, type ReactNode } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import { cn } from '../../../lib/cn'
import { ChevronDown, FileText, type LucideIcon } from '../../console/icons'
import type { ExamPaper } from '../ai-assistant/exam-format'
import { activeOutlineIndex, outlineOf, scrollToPos, type OutlineItem } from './doc-outline'

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
  /** Shown at the end of the row (a status, a menu). */
  trailing?: ReactNode
  /** Smaller text: a question line under its part. */
  minor?: boolean
}

export function TreeRow({ depth, label, ariaLabel, icon: Icon = FileText, current, expanded, onToggle, onClick, trailing, minor }: TreeRowProps) {
  return (
    <div
      className={cn(
        'group/row flex min-w-0 items-center gap-0.5 rounded-full pr-1 transition-colors',
        current ? 'bg-badge-primary-background text-primary-text' : 'hover:bg-background-gray-secondary'
      )}
      style={{ paddingLeft: depth * INDENT_PX }}
    >
      {expanded === undefined ? (
        <span aria-hidden className="size-6 shrink-0" />
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? `Thu gọn ${label}` : `Mở ${label}`}
          aria-expanded={expanded}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-icon-tertiary transition-colors hover:bg-background-gray-tertiary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
        >
          <ChevronDown size={14} strokeWidth={2} className={cn('transition-transform', !expanded && '-rotate-90')} />
        </button>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-current={current ? 'location' : undefined}
        aria-label={ariaLabel}
        title={label}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-full py-1.5 pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-input-primary-focus-border',
          minor ? 'text-xs' : 'text-[13px]',
          current ? 'font-medium text-primary-text' : minor ? 'text-text-secondary' : 'text-text-primary'
        )}
      >
        {Icon && <Icon size={15} aria-hidden className={cn('shrink-0', current ? 'text-primary-text' : 'text-icon-tertiary')} />}
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
      {trailing}
    </div>
  )
}

/** Folded rows, remembered while the panel is open; everything starts unfolded. */
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

/** The free document's headings and questions, under the exam they belong to (`depth` is that exam's depth + 1). */
export function EditorOutlineTree({ editor, depth }: { editor: Editor | null; depth: number }) {
  // The selector reads `editor` from the closure: the hook's snapshot keeps the editor it was first given until the
  // next transaction, which would leave a freshly loaded document unlisted.
  const { items, active } = useEditorState({ editor, selector: () => selectOutline(editor) }) ?? NO_OUTLINE
  const { isOpen, toggle } = useFolded()

  if (items.length === 0) {
    return <p className="py-1.5 text-xs text-text-tertiary" style={{ paddingLeft: depth * INDENT_PX + 32 }}>Tiêu đề và các câu hỏi sẽ hiện ở đây</p>
  }

  const rows = (nodes: OutlineNode[], level: number): ReactNode =>
    nodes.map((node) => {
      const question = node.item.level === 4
      const open = isOpen(node.item.id)
      return (
        <li key={node.item.id}>
          <TreeRow
            depth={level}
            label={node.item.text}
            // "Tới câu 61. …": the jump wording the outline used, with the visible text kept.
            ariaLabel={`Tới ${node.item.text}`}
            icon={question ? null : undefined}
            minor={question}
            current={node.index === active}
            expanded={node.children.length > 0 ? open : undefined}
            onToggle={() => toggle(node.item.id)}
            onClick={() => editor && scrollToPos(editor, node.item.pos)}
          />
          {node.children.length > 0 && open && <ul>{rows(node.children, level + 1)}</ul>}
        </li>
      )
    })

  return <ul aria-label="Mục lục">{rows(nest(items), depth)}</ul>
}

/** A draft or a loaded paper: its sections, parts and questions, under the exam (`depth` is that exam's depth + 1). */
export function PaperOutlineTree({
  paper,
  numberOf,
  onJump,
  current = null,
  depth,
}: {
  paper: ExamPaper
  numberOf: Map<string, number>
  onJump: (questionId: string) => void
  /** The question being worked on (a paper being read), lit in the tree. */
  current?: string | null
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

  if (paper.questions.length === 0) {
    return <p className="py-1.5 text-xs text-text-tertiary" style={{ paddingLeft: depth * INDENT_PX + 32 }}>Chưa có câu</p>
  }

  const partRows = (parts: ExamPaper['parts'], level: number) =>
    parts.map((part) => {
      const questions = paper.questions.filter((question) => question.partId === part.id)
      const open = isOpen(part.id)
      return (
        <li key={part.id}>
          <TreeRow
            depth={level}
            label={part.targetCount !== null ? `${part.title} (${questions.length}/${part.targetCount})` : part.title}
            expanded={questions.length > 0 ? open : undefined}
            onToggle={() => toggle(part.id)}
            onClick={() => questions[0] && onJump(questions[0].id)}
          />
          {open && questions.length > 0 && (
            <ul>
              {questions.map((question) => (
                <li key={question.id}>
                  <TreeRow
                    depth={level + 1}
                    label={`Câu ${numberOf.get(question.id)}. ${question.prompt}`}
                    ariaLabel={`Tới câu ${numberOf.get(question.id)}`}
                    icon={null}
                    minor
                    current={question.id === current}
                    onClick={() => onJump(question.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </li>
      )
    })

  return (
    <ul aria-label="Mục lục">
      {sections.map((section) =>
        section.title ? (
          <li key={section.id}>
            <TreeRow
              depth={depth}
              label={section.title}
              expanded={isOpen(section.id)}
              onToggle={() => toggle(section.id)}
              onClick={() => toggle(section.id)}
            />
            {isOpen(section.id) && <ul>{partRows(section.parts, depth + 1)}</ul>}
          </li>
        ) : (
          partRows(section.parts, depth)
        )
      )}
    </ul>
  )
}
