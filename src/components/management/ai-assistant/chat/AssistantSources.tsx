import { useState } from 'react'
import { FileText, Plus, X } from '../../../console/icons'
import type { SelectOption } from '../../../console/select-field'
import { Skeleton } from '../../../tailgrids/core/skeleton'
import SourceLibraryDialog from './SourceLibraryDialog'

interface AssistantSourcesProps {
  papers: SelectOption[]
  papersLoading: boolean
  papersError: string | null
  onReloadPapers: () => void
  sourceId: string
  onSourceChange: (id: string) => void
  disabled?: boolean
}

/** "Nguồn cho trợ lý": the bank paper the assistant works from, picked from the bank in a dialog. */
export default function AssistantSources({
  papers,
  papersLoading,
  papersError,
  onReloadPapers,
  sourceId,
  onSourceChange,
  disabled = false,
}: AssistantSourcesProps) {
  const [open, setOpen] = useState(false)
  const source = papers.find((paper) => paper.id === sourceId)

  return (
    <section
      aria-label="Nguồn cho trợ lý"
      className="rounded-xl border border-card-border bg-background-gray-secondary px-2.5 pt-2 pb-2.5"
    >
      <div className="flex min-w-0 items-baseline gap-2 px-0.5">
        <span className="shrink-0 text-[11px] leading-4 font-semibold tracking-[0.04em] text-text-secondary uppercase">
          Nguồn cho trợ lý
        </span>
        {papersError && !papersLoading ? (
          <span title={papersError} className="ml-auto min-w-0 truncate text-[11.5px] leading-4 text-danger">
            {papersError}
          </span>
        ) : (
          <span className="ml-auto min-w-0 truncate text-[11.5px] leading-4 text-text-tertiary">
            Chọn đề mẫu từ kho
          </span>
        )}
      </div>
      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
        {papersLoading && !source ? (
          <Skeleton aria-hidden className="h-7 w-36 rounded-lg" />
        ) : (
          source && (
            <span
              title={source.label}
              className="inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-lg border border-card-border bg-card-background pr-0.5 pl-2 text-[12.5px] font-medium text-text-primary"
            >
              <FileText size={14} strokeWidth={1.7} aria-hidden className="shrink-0 text-primary-text" />
              <span className="min-w-0 truncate">{source.label}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSourceChange('')}
                aria-label={`Bỏ đề mẫu ${source.label}`}
                title="Bỏ đề mẫu"
                className="inline-grid size-6 shrink-0 place-items-center rounded-md text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:pointer-events-none disabled:opacity-50"
              >
                <X size={13} />
              </button>
            </span>
          )
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          aria-label={source ? 'Đổi đề mẫu' : 'Thêm từ kho'}
          title={source ? 'Đổi đề mẫu' : 'Thêm từ kho'}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-dashed border-card-border bg-card-background px-2 text-[12.5px] font-medium text-text-secondary transition-colors hover:border-input-primary-focus-border hover:text-primary-text focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:pointer-events-none disabled:opacity-50"
        >
          {!source && <Plus size={13} aria-hidden />}
          <span>{source ? 'Đổi' : 'Thêm từ kho'}</span>
        </button>
      </div>
      <SourceLibraryDialog
        open={open}
        onClose={() => setOpen(false)}
        papers={papers}
        loading={papersLoading}
        error={papersError}
        onReload={onReloadPapers}
        selectedId={sourceId}
        onSelect={onSourceChange}
      />
    </section>
  )
}
