import { useEffect, type RefObject } from 'react'
import type { Editor } from '@tiptap/react'
import { runLastItemOf, runWritingOf, type AiRunStore } from '../../../hooks/useAiAssistant'
import { cn } from '../../../lib/cn'
import { useStoreValue } from '../../../lib/value-store'
import { liveDraftKey } from '../exam-doc/nodes/live-draft-widget'
import { useFollowWriting } from '../exam-doc/use-follow-writing'

/**
 * What the AI is writing, on the sheet: the question it is writing shows where it will land, word by word, until the
 * checked question replaces it (only a decoration changes: nothing is saved and nothing goes into undo). While the AI
 * writes the sheet follows it; the teacher scrolling lets go, and a button picks it up again.
 *
 * It reads the run on its own, so the words arriving re-render this and not the screen around it.
 */
export default function SheetWriting({
  editor,
  run,
  scroller,
  following: active,
  raised,
}: {
  editor: Editor | null
  run: AiRunStore
  scroller: RefObject<HTMLElement | null>
  /** A run goes on and the sheet shows the free document. */
  following: boolean
  /** The chat bar covers the bottom of the sheet: the button sits above it. */
  raised: boolean
}) {
  const writing = useStoreValue(run, runWritingOf)
  const lastItemId = useStoreValue(run, runLastItemOf)

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const shown = writing ? { partId: writing.section, view: writing.view } : null
    editor.view.dispatch(editor.state.tr.setMeta(liveDraftKey, shown).setMeta('addToHistory', false))
  }, [editor, writing])

  const target = writing
    ? '[data-live-draft]'
    : lastItemId
      ? `[data-exam-item="${CSS.escape(lastItemId)}"]`
      : null
  // The sheet scrolls along as the writing gets a new line (a stem, an option) or a question lands, not per word.
  const lines = writing
    ? writing.view.questions.reduce((count, question) => count + 1 + question.options.length, writing.view.passage ? 1 : 0)
    : 0
  const follow = useFollowWriting(scroller, active, target, `${lastItemId ?? ''}:${writing?.unit ?? ''}:${lines}`)

  // Shown once the teacher scrolled away from the writing; it stays at the bottom of the sheet's view.
  if (!active || follow.following) return null
  return (
    <div className={cn('pointer-events-none sticky z-20 flex justify-center', raised ? 'bottom-24' : 'bottom-5')}>
      <button
        type="button"
        onClick={follow.follow}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-button-primary-background px-4 py-2 text-sm font-semibold text-button-primary-text shadow-card-hover transition-colors hover:bg-button-primary-hover-background focus-visible:ring-4 focus-visible:ring-button-primary-focus-ring"
      >
        <span aria-hidden className="size-2 rounded-full bg-current motion-safe:animate-pulse" />
        Theo dõi AI đang viết
      </button>
    </div>
  )
}
