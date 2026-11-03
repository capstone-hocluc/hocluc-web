import { useEffect, useRef } from 'react'
import { cn } from '../../../lib/cn'
import type { BankPaperRegion } from '../../../services/questionBankService'
import Notice from '../../console/notice'
import { Skeleton } from '../../tailgrids/core/skeleton'
import MathText from '../../ui/MathText'
import { usePageImage } from './use-page-image'

/** A question as shown on the page: what the AI wrote, still being written or finished. */
export interface ShownQuestion {
  number: number
  text: string
  options: { label: string; text: string; correct?: boolean }[]
  writing: boolean
}

export function PageSkeleton() {
  return <Skeleton className="aspect-[210/297] w-full rounded-lg" />
}

function Written({ question }: { question: ShownQuestion }) {
  // a formula half written would show as its source anyway: the plain text is kept until the question is complete
  const text = (value: string) => (question.writing ? value : <MathText>{value}</MathText>)
  return (
    <>
      <span className="font-semibold">Câu {question.number}: </span>
      {text(question.text)}
      {question.options.length > 0 && (
        <span className="mt-0.5 flex flex-wrap gap-x-3">
          {question.options.map(option => (
            <span key={option.label} className={cn(option.correct && 'font-semibold text-emerald-700')}>
              <b>{option.label}.</b> {text(option.text)}
            </span>
          ))}
        </span>
      )}
      {question.writing && <span aria-hidden className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-brand-500 align-middle" />}
    </>
  )
}

/**
 * One page of the paper with each question's band drawn on it and, when asked, what the AI wrote for it laid over the
 * band - growing as the AI writes. Always black on white, like the paper under it.
 */
export default function ReadingPaper({
  sourceId,
  page,
  bands,
  shown,
  overlay,
  selected,
  onSelect,
}: {
  sourceId: string
  page: number
  bands: BankPaperRegion[]
  shown: Map<number, ShownQuestion>
  overlay: boolean
  selected: number | null
  onSelect: (number: number) => void
}) {
  const image = usePageImage(sourceId, page, true)
  const activeBand = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // a question low on the page would otherwise stay below the fold
    if (image.url) activeBand.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected, image.url])

  if (image.failed) return <Notice tone="danger">Không tải được trang {page}.</Notice>
  if (!image.url) return <PageSkeleton />
  return (
    <div className="relative overflow-hidden rounded-lg border border-card-border bg-white text-slate-900">
      <img src={image.url} alt={`Trang ${page} của đề`} className="block h-auto w-full" />
      {bands.map(band => {
        const question = shown.get(band.number)
        const done = Boolean(question && !question.writing)
        const active = band.number === selected
        return (
          <button
            key={band.number}
            ref={active ? activeBand : undefined}
            type="button"
            aria-label={`Câu ${band.number}${question?.writing ? ', AI đang viết' : done ? ', AI đã đọc' : ', chưa đọc'}`}
            onClick={() => onSelect(band.number)}
            className={cn(
              'absolute inset-x-[3%] cursor-pointer overflow-hidden rounded-md border-2 bg-transparent p-0 text-left transition-colors',
              active
                ? 'border-brand-500'
                : question?.writing
                  ? 'border-brand-500/70'
                  : done
                    ? 'border-emerald-600/40 hover:border-brand-500'
                    : 'border-dashed border-slate-400/40 hover:border-brand-500'
            )}
            style={{ top: `${band.top * 100}%`, height: `${Math.max(band.bottom - band.top, 0.015) * 100}%` }}
          >
            {overlay && question && (
              <span
                className={cn(
                  // only as tall as what is written, so the printed question stays in sight under it
                  'absolute inset-x-0 top-0 block max-h-full overflow-hidden rounded-t-[4px] px-2 py-1 text-[10.5px] leading-snug text-slate-900 shadow-sm',
                  question.writing ? 'bg-sky-50/95' : 'bg-white/90'
                )}
              >
                <Written question={question} />
              </span>
            )}
            <span
              className={cn(
                'absolute -top-px right-1 z-10 rounded-b-md px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white',
                active || question?.writing ? 'bg-brand-500' : done ? 'bg-emerald-600' : 'bg-slate-400'
              )}
            >
              {question?.writing ? `✎ ${band.number}` : done ? `✓ ${band.number}` : band.number}
            </span>
          </button>
        )
      })}
    </div>
  )
}
