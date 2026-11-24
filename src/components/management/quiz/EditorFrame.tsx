import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import type { EditorLayout } from './editor-layout'

/**
 * Where a quiz or exam editor's parts go, in either layout. `console`: one card inside the console page, the rail and
 * the work side by side. `workspace` (the AI assistant's frame): the whole window, a white header over a grey canvas,
 * the rail, the work and the settings each a card of their own.
 */
export default function EditorFrame({ layout, header, notices, rail, railLabel, aside, label, busy, children }: {
  layout: EditorLayout
  header: ReactNode
  /** Messages over the work (a save that failed). */
  notices?: ReactNode
  /** The exam's parts and questions, on the left from a laptop's width. */
  rail?: ReactNode
  railLabel?: string
  /** Beside the work, on the right: the settings card, or a drawer that places itself. */
  aside?: ReactNode
  label?: string
  /** A placeholder while the quiz loads. */
  busy?: boolean
  children: ReactNode
}) {
  const workspace = layout === 'workspace'
  const card = 'overflow-hidden rounded-2xl border border-card-border bg-card-background shadow-xs'
  return (
    <section
      aria-label={label}
      aria-busy={busy || undefined}
      className={cn(
        'flex min-w-0 flex-col',
        workspace
          ? 'h-dvh bg-background-gray-secondary_alt_2'
          // The console page's header and padding stay above and around it.
          : cn(card, 'h-[calc(100dvh-9rem)] min-h-[32rem] bg-card-surface-area shadow-none lg:h-[calc(100dvh-11rem)]')
      )}
    >
      {header}
      {notices && (
        <div className={cn('flex shrink-0 flex-col', workspace ? 'gap-2 px-2 pt-2' : 'gap-3 px-4 pt-3 sm:px-6')}>{notices}</div>
      )}
      <div className={cn('flex min-h-0 flex-1', workspace && 'gap-2 p-2')}>
        {rail && (
          <aside
            aria-label={railLabel}
            className={cn('hidden w-72 shrink-0 flex-col lg:flex xl:w-80', workspace ? card : 'border-r border-card-border bg-card-background')}
          >
            {rail}
          </aside>
        )}
        <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', workspace && card)}>{children}</div>
        {aside}
      </div>
    </section>
  )
}
