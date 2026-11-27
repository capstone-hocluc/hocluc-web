import { useState } from 'react'
import type { BankReading } from '../../../services/questionBankService'
import Button from '../../console/button'
import { ChevronLeft, ChevronRight } from '../../console/icons'
import ReadingPaper, { PageSkeleton, type ShownQuestion } from '../question-bank/ReadingPaper'

const ICON_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:pointer-events-none disabled:opacity-40'

interface PaperPagesViewProps {
  sourceId: string
  reading: BankReading | null
  busy: boolean
  /** The number the AI works on now; its page is shown until the viewer picks one. */
  current: number | null
  shown: Map<number, ShownQuestion>
  onSelect: (number: number) => void
}

/** The paper's original pages, each question marked with what the AI made of it, page by page. */
export default function PaperPagesView({ sourceId, reading, busy, current, shown, onSelect }: PaperPagesViewProps) {
  const [chosenPage, setChosenPage] = useState<number | null>(null)
  const pageCount = reading?.pageCount ?? 0
  const pageOf = (number: number | null) =>
    number === null
      ? null
      : (reading?.regions.find((band) => band.number === number)?.page ??
        reading?.questions.find((question) => question.number === number)?.sourcePage ??
        null)
  const page = Math.min(Math.max(chosenPage ?? pageOf(current) ?? 1, 1), Math.max(pageCount, 1))

  if (!reading || pageCount === 0) {
    return (
      <div className="mx-auto w-full max-w-[794px] px-3 py-5 sm:px-6">
        <PageSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[794px] flex-col gap-3 px-3 py-5 sm:px-6">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          className={ICON_BUTTON}
          disabled={page <= 1}
          onClick={() => setChosenPage(page - 1)}
          aria-label="Trang trước"
          title="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-text-secondary tabular-nums">
          Trang {page}/{pageCount}
        </span>
        <button
          type="button"
          className={ICON_BUTTON}
          disabled={page >= pageCount}
          onClick={() => setChosenPage(page + 1)}
          aria-label="Trang sau"
          title="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
        {chosenPage !== null && busy && (
          <Button size="sm" appearance="outline" onClick={() => setChosenPage(null)}>
            Theo trang AI đang đọc
          </Button>
        )}
      </div>
      <ReadingPaper
        sourceId={sourceId}
        page={page}
        bands={reading.regions.filter((band) => band.page === page)}
        shown={shown}
        overlay={false}
        selected={current}
        onSelect={onSelect}
      />
    </div>
  )
}
