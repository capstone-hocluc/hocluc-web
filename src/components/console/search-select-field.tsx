import { Command } from 'cmdk'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, X } from './icons'
import { fieldControlClass } from './form-field'
import { cn } from '../../lib/cn'

export interface SearchSelectOption {
  id: string
  label: string
}

export interface SearchSelectPage {
  options: SearchSelectOption[]
  /** False when the server holds more matches for this term. */
  last: boolean
}

interface SearchSelectFieldProps {
  ariaLabel: string
  value: string
  onChange: (value: string) => void
  /** Resolves one page of options for a term. Paging and debounce belong to this field. */
  loadPage: (term: string, page: number) => Promise<SearchSelectPage>
  placeholder: string
  /** Label for a value set from outside (a default), when this field never picked it itself. */
  selectedLabel?: string
  disabled?: boolean
  searchPlaceholder?: string
  className?: string
  triggerClassName?: string
}

interface LoadedPage {
  term: string
  options: SearchSelectOption[]
  last: boolean
}

const DEBOUNCE_MS = 250

/**
 * A picker over a list too long to load whole: it asks the server for the term being typed and
 * appends pages on demand, so a record past the first page is still reachable. The list opens in
 * place - not as an overlay - so it cannot be clipped by the dialog that holds it.
 */
export default function SearchSelectField({
  ariaLabel,
  value,
  onChange,
  loadPage,
  placeholder,
  selectedLabel,
  disabled,
  searchPlaceholder,
  className,
  triggerClassName,
}: SearchSelectFieldProps) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [loaded, setLoaded] = useState<LoadedPage | null>(null)
  const [page, setPage] = useState(0)
  const [failed, setFailed] = useState(false)
  const [busyMore, setBusyMore] = useState(false)
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null)

  // Callers pass an inline function; keeping it in a ref stops every keystroke from re-running the
  // query effect through a changed identity. The ref is synced in its own effect (declared first, so
  // it settles before the query effect reads it) instead of during render.
  const loadRef = useRef(loadPage)
  useEffect(() => {
    loadRef.current = loadPage
  }, [loadPage])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const timer = setTimeout(() => {
      loadRef
        .current(term, 0)
        .then((result) => {
          if (cancelled) return
          setFailed(false)
          setLoaded({ term, options: result.options, last: result.last })
          setPage(0)
        })
        .catch(() => {
          if (!cancelled) setFailed(true)
        })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, term])

  async function loadMore() {
    const next = page + 1
    setBusyMore(true)
    try {
      const result = await loadRef.current(term, next)
      setLoaded((current) =>
        current ? { ...current, options: [...current.options, ...result.options], last: result.last } : current
      )
      setPage(next)
    } catch {
      setFailed(true)
    } finally {
      setBusyMore(false)
    }
  }

  function choose(option: SearchSelectOption) {
    // The trigger label is derived from the current value, so a form reset clears it too.
    setPicked({ id: option.id, label: option.label })
    setOpen(false)
    setTerm('')
    onChange(option.id)
  }

  function close() {
    setOpen(false)
    setTerm('')
  }

  if (!open) {
    const label = picked && picked.id === value ? picked.label : value ? selectedLabel ?? '' : ''
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          fieldControlClass,
          'flex items-center justify-between gap-2 text-left',
          triggerClassName,
          className
        )}
      >
        <span className={cn('truncate', !label && 'text-input-placeholder-text')}>
          {label || placeholder}
        </span>
        <ChevronDown size={16} className="shrink-0 text-icon-tertiary" aria-hidden="true" />
      </button>
    )
  }

  const stale = loaded === null || loaded.term !== term
  const options = stale ? [] : loaded.options

  return (
    <Command
      shouldFilter={false}
      label={ariaLabel}
      className={cn('rounded-lg border border-card-border bg-card-background shadow-xs', className)}
    >
      <div className="flex items-center gap-2 px-3">
        <Search size={16} className="shrink-0 text-icon-tertiary" aria-hidden="true" />
        <Command.Input
          autoFocus
          value={term}
          onValueChange={setTerm}
          aria-label={`${ariaLabel}: tìm kiếm`}
          placeholder={searchPlaceholder ?? 'Nhập để tìm kiếm'}
          className="h-10 w-full flex-1 border-none bg-transparent text-sm text-text-primary outline-none placeholder:text-input-placeholder-text focus:ring-0"
        />
        <button
          type="button"
          aria-label="Đóng danh sách"
          onClick={close}
          className="shrink-0 rounded-md p-1 text-icon-tertiary transition-colors hover:bg-background-gray-primary hover:text-icon-primary"
        >
          <X size={16} />
        </button>
      </div>

      <Command.List className="max-h-56 overflow-y-auto border-t border-card-border p-1">
        {failed && (
          <Command.Empty className="px-3 py-2 text-sm text-text-tertiary">
            Không tải được danh sách.
          </Command.Empty>
        )}
        {!failed && stale && (
          <Command.Empty className="px-3 py-2 text-sm text-text-tertiary">Đang tìm...</Command.Empty>
        )}
        {!failed && !stale && options.length === 0 && (
          <Command.Empty className="px-3 py-2 text-sm text-text-tertiary">
            Không tìm thấy kết quả.
          </Command.Empty>
        )}
        {options.map((option) => (
          <Command.Item
            key={option.id}
            onSelect={() => choose(option)}
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text-primary data-[selected=true]:bg-background-gray-primary"
          >
            {option.label}
          </Command.Item>
        ))}
        {!stale && !loaded?.last && (
          <button
            type="button"
            disabled={busyMore}
            onClick={loadMore}
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-text-tertiary transition-colors hover:bg-background-gray-primary hover:text-text-primary disabled:cursor-not-allowed"
          >
            {busyMore ? 'Đang tải...' : 'Tải thêm kết quả'}
          </button>
        )}
      </Command.List>

      <span className="sr-only" aria-live="polite">
        {stale ? '' : `${options.length} kết quả`}
      </span>
    </Command>
  )
}
