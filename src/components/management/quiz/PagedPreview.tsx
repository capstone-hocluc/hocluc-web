import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Previewer } from 'pagedjs'
import Notice from '../../console/notice'
import { Skeleton } from '../../tailgrids/core/skeleton'
import paperCss from './quiz-paper.css?raw'
import pagedCss from './quiz-paper-paged.css?raw'

const SETTLE_MS = 3000

/** Waits until every formula of `root` is set and every picture loaded (or a few seconds, whichever comes first). */
async function settled(root: HTMLElement) {
  const until = Date.now() + SETTLE_MS
  while (root.querySelector('[data-math-pending]') && Date.now() < until) {
    await new Promise(resolve => setTimeout(resolve, 60))
  }
  await Promise.all(
    [...root.querySelectorAll('img')].map(img => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined)))
  )
}

export function PagedSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-label="Đang chia trang">
      <Skeleton className="aspect-[210/297] w-full max-w-[210mm] rounded-sm" />
    </div>
  )
}

/**
 * `children` (one `.quiz-paper` article) cut into A4 pages by Paged.js, as they will print: the platform band at the
 * top of every page, the page number at the foot. Laid out again when `version` changes. `focus` scrolls to the
 * question with that number (`data-question`) once the pages are made.
 */
export default function PagedPreview({
  children,
  version,
  label,
  focus = null,
}: {
  children: ReactNode
  version: string
  label: string
  focus?: number | null
}) {
  const source = useRef<HTMLDivElement>(null)
  const target = useRef<HTMLDivElement>(null)
  const [made, setMade] = useState<{ version: string; pages: number; failed: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    let previewer: Previewer | null = null
    const timer = window.setTimeout(async () => {
      const from = source.current?.firstElementChild
      if (!from || !source.current) return
      await settled(source.current)
      // the library is only fetched the first time pages are made
      const { Previewer } = await import('pagedjs')
      if (cancelled || !target.current) return
      target.current.replaceChildren()
      previewer = new Previewer()
      try {
        const flow = await previewer.preview(from.cloneNode(true), [{ 'quiz-paper.css': paperCss + '\n' + pagedCss }], target.current)
        if (!cancelled) setMade({ version, pages: flow.total, failed: false })
      } catch {
        if (!cancelled) setMade({ version, pages: 0, failed: true })
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      // the page rules it put in the document go with it
      previewer?.polisher.destroy()
    }
  }, [version])

  const ready = made?.version === version && !made.failed
  useEffect(() => {
    if (!ready || focus === null || !target.current) return
    const question = target.current.querySelector<HTMLElement>(`[data-question="${focus}"]`)
    target.current.querySelectorAll('.paged-focus').forEach(el => el.classList.remove('paged-focus'))
    question?.classList.add('paged-focus')
    question?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [ready, focus])

  return (
    <div className="relative">
      {/* what the pages are cut from: laid out off screen, at the width of an A4 page */}
      <div ref={source} aria-hidden className="pointer-events-none absolute top-0 -left-[10000px] w-[210mm] opacity-0">
        {children}
      </div>
      {made?.failed && made.version === version && <Notice tone="danger">Không chia được trang. Đề vẫn xem được ở dạng một tờ liền.</Notice>}
      {!ready && !(made?.failed && made.version === version) && <PagedSkeleton />}
      <div
        ref={target}
        aria-label={label}
        className={ready ? 'paged-preview-pages paper-print-root' : 'paged-preview-pages paper-print-root hidden'}
      />
      {ready && <p className="m-0 mt-2 text-center text-xs text-text-tertiary">{made.pages} trang A4</p>}
    </div>
  )
}
