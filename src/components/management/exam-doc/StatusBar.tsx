import type { KeyboardEvent } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import { cn } from '../../../lib/cn'
import { FileText, Layers } from '../../console/icons'
import ScrollArea from '../../ui/ScrollArea'
import { docTextStats } from './doc-outline'
import { useExamDoc } from './exam-doc-context'

function selectWords(editor: Editor | null) {
  return editor && !editor.isDestroyed ? docTextStats(editor.state.doc).words : 0
}

const TAB_CLASS =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'
const TAB_SELECTED = 'border-card-border bg-card-background font-medium text-text-primary shadow-xs'
const TAB_IDLE = 'border-transparent text-text-secondary hover:bg-background-gray-secondary hover:text-text-primary'
/** Why "Tạo mã đề" is off in the structured mode. */
const FREE_MODE_ONLY = 'Chỉ có ở chế độ Văn bản tự do'

/**
 * Bottom bar: the paper tabs ("Đề gốc", then one per exam code), "Tạo mã đề", and the page and word counts. The
 * structured mode shows no sheet, so it keeps only "Tạo mã đề", turned off.
 */
export default function StatusBar() {
  const { editor, sourceEditor, pages, variantDocs, activeVariant, setActiveVariant, setVariantsOpen, mode } = useExamDoc()
  const structured = mode === 'STRUCTURED'
  // Reads `editor` from the closure so a document loaded before any transaction is still counted.
  const words = useEditorState({ editor, selector: () => selectWords(editor) }) ?? 0
  const tabs: Array<string | null> = [null, ...variantDocs.map((variant) => variant.code)]

  // Arrow keys move along the tabs (and show the paper), as in any tab list.
  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.indexOf(activeVariant)
    const next =
      event.key === 'ArrowRight' ? Math.min(tabs.length - 1, index + 1)
      : event.key === 'ArrowLeft' ? Math.max(0, index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? tabs.length - 1
      : -1
    if (next < 0) return
    event.preventDefault()
    setActiveVariant(tabs[next])
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    buttons[next]?.focus()
  }

  return (
    <div className="exam-doc-ui flex h-11 shrink-0 items-center gap-1 border-t border-card-border px-2">
      {!structured && (
        <ScrollArea horizontal className="min-w-0 py-1">
          <div role="tablist" aria-label="Các tab của đề" className="flex items-center gap-0.5" onKeyDown={onTabKey}>
            {tabs.map((code) => {
              const selected = code === activeVariant
              const label = code === null ? 'Đề gốc' : `Mã ${code}`
              return (
                <button
                  key={code ?? 'original'}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  aria-label={label}
                  title={code === null ? 'Đề gốc' : `Xem mã đề ${code} (chỉ đọc)`}
                  onClick={() => setActiveVariant(code)}
                  className={cn(TAB_CLASS, selected ? TAB_SELECTED : TAB_IDLE)}
                >
                  {code === null && <FileText aria-hidden size={14} className="text-icon-tertiary" />}
                  {label}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      )}
      <button
        type="button"
        disabled={!sourceEditor || structured}
        aria-label="Tạo mã đề"
        title={structured ? FREE_MODE_ONLY : 'Tạo mã đề'}
        onClick={() => setVariantsOpen(true)}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] whitespace-nowrap text-text-secondary outline-none transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
      >
        <Layers aria-hidden size={14} />
        Tạo mã đề
      </button>
      {!structured && (
        <span className="ml-auto shrink-0 pr-2 pl-2 text-xs whitespace-nowrap text-text-tertiary tabular-nums">
          {pages.toLocaleString('vi-VN')} trang · {words.toLocaleString('vi-VN')} từ
        </span>
      )}
    </div>
  )
}
