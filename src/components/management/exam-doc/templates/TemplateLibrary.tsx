import { useMemo, useState } from 'react'
import { useEditorState } from '@tiptap/react'
import { cn } from '../../../../lib/cn'
import { SearchInput } from '../../../console/filter-toolbar'
import { ChevronDown, GripVertical } from '../../../console/icons'
import { useExamDoc } from '../exam-doc-context'
import { beginSnippetDrag, endSnippetDrag, insertSnippet, SNIPPET_MIME } from './insert-snippet'
import { SNIPPET_GROUPS, type SnippetGroup } from './snippets'

const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'

/** Lower case without Vietnamese diacritics, so "dap an" finds "Đáp án". */
function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()
}

function filterGroups(query: string): SnippetGroup[] {
  if (!query) return SNIPPET_GROUPS
  return SNIPPET_GROUPS.map((group) => ({
    ...group,
    snippets: group.snippets.filter((snippet) => fold(snippet.title).includes(query)),
  })).filter((group) => group.snippets.length > 0)
}

/** "Mẫu đề thi": exam blocks grouped by kind; a click inserts at the caret, a drag drops onto the sheet. */
export default function TemplateLibrary() {
  const { editor, mode } = useExamDoc()
  // The selector reads `editor` from the closure, as the outline does, so a newly built editor is picked up.
  const editable =
    useEditorState({ editor, selector: () => Boolean(editor && !editor.isDestroyed && editor.isEditable) }) ?? false
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set())

  const needle = fold(query.trim())
  const groups = useMemo(() => filterGroups(needle), [needle])
  const disabled = !editor || !editable || mode !== 'FREE'

  const toggle = (id: string) =>
    setClosed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex flex-col gap-1 px-3 pt-2 pb-3">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Tìm mẫu"
        ariaLabel="Tìm mẫu đề thi"
        className="mb-1 h-8 sm:max-w-none"
      />

      {groups.length === 0 && <p className="px-2 py-6 text-center text-xs text-text-tertiary">Không có mẫu phù hợp</p>}

      {groups.map((group) => {
        const open = needle !== '' || !closed.has(group.id)
        const listId = `exam-snippets-${group.id}`
        return (
          <section key={group.id}>
            <button
              type="button"
              onClick={() => toggle(group.id)}
              disabled={needle !== ''}
              aria-expanded={open}
              aria-controls={listId}
              aria-label={`${open ? 'Thu gọn' : 'Mở'} nhóm ${group.title}`}
              title={`${open ? 'Thu gọn' : 'Mở'} nhóm ${group.title}`}
              className={cn(
                'flex w-full items-center gap-1 rounded-md px-1 py-1.5 text-left text-xs font-medium text-text-tertiary transition-colors hover:text-text-primary disabled:cursor-default disabled:hover:text-text-tertiary',
                FOCUS_RING
              )}
            >
              <ChevronDown size={14} aria-hidden className={cn('shrink-0 transition-transform', !open && '-rotate-90')} />
              <span className="truncate">{group.title}</span>
            </button>

            {open && (
              <ul id={listId} className="flex flex-col gap-0.5 pb-1">
                {group.snippets.map((snippet) => (
                  <li key={snippet.id}>
                    <button
                      type="button"
                      draggable={!disabled}
                      disabled={disabled}
                      onClick={() => {
                        if (editor) insertSnippet(editor, snippet)
                      }}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(SNIPPET_MIME, snippet.id)
                        event.dataTransfer.effectAllowed = 'copy'
                        if (editor) beginSnippetDrag(editor, snippet)
                      }}
                      onDragEnd={() => {
                        if (editor) endSnippetDrag(editor)
                      }}
                      aria-label={`Chèn mẫu ${snippet.title}`}
                      title={`${snippet.title}: bấm để chèn tại con trỏ, hoặc kéo vào trang`}
                      className={cn(
                        'flex w-full min-w-0 cursor-grab items-center gap-1.5 rounded-md py-1.5 pr-2 pl-1 text-left text-[13px] text-text-primary transition-colors hover:bg-background-gray-secondary active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
                        FOCUS_RING
                      )}
                    >
                      <GripVertical size={14} aria-hidden className="shrink-0 text-icon-tertiary" />
                      <span className="truncate">{snippet.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
