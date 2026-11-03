import { useEffect, useState } from 'react'
import { cn } from '../../../../lib/cn'
import { matchesSearch } from '../../../../lib/search'
import Button from '../../../console/button'
import ConsoleDialog from '../../../console/dialog'
import { SearchInput } from '../../../console/filter-toolbar'
import { Check, FileText } from '../../../console/icons'
import Notice from '../../../console/notice'
import type { SelectOption } from '../../../console/select-field'
import { Skeleton } from '../../../tailgrids/core/skeleton'

interface SourceLibraryDialogProps {
  open: boolean
  onClose: () => void
  papers: SelectOption[]
  loading: boolean
  error: string | null
  onReload: () => void
  selectedId: string
  onSelect: (id: string) => void
}

/** The bank papers the assistant can work from; picking one makes it the source and closes the dialog. */
export default function SourceLibraryDialog({
  open,
  onClose,
  papers,
  loading,
  error,
  onReload,
  selectedId,
  onSelect,
}: SourceLibraryDialogProps) {
  const [query, setQuery] = useState('')
  const visible = papers.filter((paper) => matchesSearch(query, paper.label))

  // Bank papers load the first time a bank-based mode opens; fetch them here if that never happened.
  useEffect(() => {
    if (open && papers.length === 0 && !loading && !error) onReload()
  }, [open, papers.length, loading, error, onReload])

  return (
    <ConsoleDialog
      open={open}
      onClose={() => {
        setQuery('')
        onClose()
      }}
      title="Chọn đề mẫu từ kho"
      maxWidth={560}
      footer={
        <Button
          appearance="outline"
          onClick={() => {
            setQuery('')
            onClose()
          }}
        >
          Đóng
        </Button>
      }
    >
      <div className="flex min-h-[280px] flex-col gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm đề mẫu"
          ariaLabel="Tìm đề mẫu"
          className="sm:max-w-none"
        />
        {loading ? (
          <div aria-hidden className="flex flex-col gap-1.5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex h-11 items-center gap-3 rounded-lg px-3">
                <Skeleton className="size-5 shrink-0 rounded-md" />
                <Skeleton className={cn('h-3', index % 2 ? 'w-1/2' : 'w-3/4')} />
              </div>
            ))}
          </div>
        ) : error ? (
          <Notice tone="danger">
            {error}
            <Button size="sm" appearance="outline" onClick={onReload}>
              Thử lại
            </Button>
          </Notice>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-tertiary">
            {papers.length === 0 ? 'Kho chưa có đề' : 'Không tìm thấy đề'}
          </p>
        ) : (
          <div role="listbox" aria-label="Đề mẫu trong kho" className="flex flex-col gap-0.5">
            {visible.map((paper) => {
              const selected = paper.id === selectedId
              return (
                <button
                  key={paper.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  title={paper.label}
                  onClick={() => {
                    onSelect(paper.id)
                    setQuery('')
                    onClose()
                  }}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-input-primary-focus-border',
                    selected
                      ? 'bg-badge-primary-background text-primary-text'
                      : 'text-text-primary hover:bg-background-gray-secondary'
                  )}
                >
                  <FileText
                    size={18}
                    strokeWidth={1.6}
                    aria-hidden
                    className={cn('shrink-0', selected ? 'text-primary-text' : 'text-icon-tertiary')}
                  />
                  <span className="min-w-0 flex-1 break-words">{paper.label}</span>
                  {selected && <Check size={16} strokeWidth={2.2} aria-hidden className="shrink-0" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </ConsoleDialog>
  )
}
