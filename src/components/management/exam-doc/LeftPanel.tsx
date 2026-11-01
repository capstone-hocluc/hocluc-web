import type { CSSProperties, ReactNode } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { useEditorState, type Editor } from '@tiptap/react'
import { cn } from '../../../lib/cn'
import { ChevronLeft, FileText, List, X, type LucideIcon } from '../../console/icons'
import ScrollArea from '../../ui/ScrollArea'
import { activeOutlineIndex, outlineOf, scrollToPos, type OutlineItem } from './doc-outline'
import { useExamDoc } from './exam-doc-context'

interface LeftPanelProps {
  onCollapse?: () => void
  onClose?: () => void
  /** Content of the "Mẫu đề thi" tab. */
  templates?: ReactNode
  className?: string
  style?: CSSProperties
}

const ICON_BUTTON_CLASS =
  'inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'

const TAB_CLASS =
  'inline-flex h-8 flex-1 items-center justify-center rounded-lg px-3 text-[13px] font-medium text-text-secondary transition-colors outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border data-[state=active]:bg-card-background data-[state=active]:text-primary-text data-[state=active]:shadow-xs'

const NO_OUTLINE: { items: OutlineItem[]; active: number } = { items: [], active: -1 }

const DEPTH_CLASS = ['pl-2', 'pl-5', 'pl-8', 'pl-11']

/** Headings indent by level; a question line sits one step under the heading before it. */
function indentDepths(items: OutlineItem[]): number[] {
  let headingLevel = 0
  return items.map((item) => {
    if (item.level === 4) return headingLevel
    headingLevel = item.level
    return item.level - 1
  })
}

function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 pt-10 text-center">
      <span
        aria-hidden
        className="inline-flex size-10 items-center justify-center rounded-xl bg-background-gray-secondary text-icon-tertiary"
      >
        <Icon size={18} />
      </span>
      <p className="text-xs leading-5 text-text-tertiary">{text}</p>
    </div>
  )
}

function selectOutline(editor: Editor | null) {
  if (!editor || editor.isDestroyed) return NO_OUTLINE
  const items = outlineOf(editor.state.doc)
  return { items, active: activeOutlineIndex(items, editor.state.selection.from) }
}

function OutlineList({ editor }: { editor: Editor | null }) {
  // The selector reads `editor` from the closure: the hook's snapshot keeps the editor it was first
  // given until the next transaction, which would leave a freshly loaded document unlisted.
  const { items, active } =
    useEditorState({ editor, selector: () => selectOutline(editor) }) ?? NO_OUTLINE

  if (items.length === 0) {
    return <EmptyState icon={List} text="Tiêu đề và các câu hỏi sẽ hiện ở đây" />
  }

  const depths = indentDepths(items)
  return (
    <ul className="flex flex-col gap-0.5 px-2 py-2">
      {items.map((item, index) => {
        const question = item.level === 4
        const depth = depths[index]
        const current = index === active
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => editor && scrollToPos(editor, item.pos)}
              aria-current={current ? 'location' : undefined}
              // "Tới câu 61. …": the jump wording the paper outline used, with the visible text kept.
              aria-label={`Tới ${item.text}`}
              title={item.text}
              className={cn(
                'flex w-full min-w-0 items-center rounded-md py-1 pr-2 text-left transition-colors outline-none hover:bg-background-gray-secondary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border',
                DEPTH_CLASS[Math.min(depth, DEPTH_CLASS.length - 1)],
                question
                  ? 'text-xs text-text-secondary'
                  : cn(
                      'text-[13px] text-text-primary',
                      item.level === 1 ? 'font-semibold' : 'font-medium'
                    ),
                current &&
                  'bg-badge-primary-background text-primary-text hover:bg-badge-primary-background'
              )}
            >
              <span className="truncate">{item.text}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** "Tài liệu" panel: the document outline (headings and questions) and the exam templates. */
export default function LeftPanel({
  onCollapse,
  onClose,
  templates,
  className = '',
  style,
}: LeftPanelProps) {
  const { editor } = useExamDoc()

  return (
    <aside aria-label="Mục lục đề thi" className={cn('flex-col', className)} style={style}>
      <header className="flex h-12 shrink-0 items-center gap-2 pr-2 pl-4">
        <h2 className="text-sm font-semibold text-text-primary">Tài liệu</h2>
        <div className="ml-auto flex shrink-0 items-center">
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Thu gọn mục lục"
              title="Thu gọn mục lục"
              className={ICON_BUTTON_CLASS}
            >
              <ChevronLeft size={17} strokeWidth={1.7} />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng mục lục"
              title="Đóng mục lục"
              className={ICON_BUTTON_CLASS}
            >
              <X size={17} strokeWidth={1.7} />
            </button>
          )}
        </div>
      </header>

      <Tabs.Root defaultValue="outline" className="flex min-h-0 flex-1 flex-col">
        <Tabs.List
          aria-label="Tài liệu"
          className="mx-3 flex shrink-0 gap-1 rounded-xl bg-background-gray-secondary p-1"
        >
          <Tabs.Trigger value="outline" title="Mục lục" className={TAB_CLASS}>
            Mục lục
          </Tabs.Trigger>
          <Tabs.Trigger value="templates" title="Mẫu đề thi" className={TAB_CLASS}>
            Mẫu đề thi
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="outline" className="min-h-0 flex-1 outline-none">
          <ScrollArea className="h-full">
            <OutlineList editor={editor} />
          </ScrollArea>
        </Tabs.Content>
        <Tabs.Content value="templates" className="min-h-0 flex-1 outline-none">
          <ScrollArea className="h-full">
            {templates ?? <EmptyState icon={FileText} text="Chưa có mẫu đề thi" />}
          </ScrollArea>
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  )
}
