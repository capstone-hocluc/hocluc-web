import { useRef, useState, type DragEvent } from 'react'
import { cn } from '../../lib/cn'
import { FileText, X } from './icons'

interface FileFieldProps {
  value: File | null
  onChange: (file: File | null) => void
  /** Native `accept` list; a dropped file outside it is ignored. */
  accept: string
  ariaLabel: string
  /** Shown while nothing is picked, e.g. "Chọn hoặc kéo file PDF vào đây". */
  placeholder: string
  disabled?: boolean
}

const sizeText = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** Whether a file matches an `accept` list of extensions and MIME types. */
function accepts(file: File, accept: string) {
  const name = file.name.toLowerCase()
  return accept
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .some((rule) => (rule.startsWith('.') ? name.endsWith(rule) : rule === file.type))
}

// NextAdmin file picker: a dashed drop area in place of the browser's own "Choose File" control,
// which cannot be styled or translated.
export default function FileField({ value, onChange, accept, ariaLabel, placeholder, disabled }: FileFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setOver(false)
    const file = event.dataTransfer.files?.[0]
    if (!disabled && file && accepts(file, accept)) onChange(file)
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={cn(
        'flex min-h-14 items-center gap-3 rounded-lg border border-dashed px-3 py-2 transition-colors',
        over ? 'border-brand-500 bg-brand-500/5' : 'border-card-border bg-input-background',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        aria-label={ariaLabel}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null)
          event.target.value = ''
        }}
      />
      <span
        aria-hidden
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-lg',
          value ? 'bg-badge-primary-background text-badge-primary-text' : 'bg-background-gray-secondary text-text-tertiary'
        )}
      >
        <FileText size={18} />
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="flex min-w-0 flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed"
      >
        {value ? (
          <>
            <span className="truncate text-sm font-medium text-text-primary">{value.name}</span>
            <span className="text-xs text-text-tertiary">{sizeText(value.size)} · Bấm để đổi file</span>
          </>
        ) : (
          <span className="text-sm text-text-tertiary">{placeholder}</span>
        )}
      </button>
      {value && !disabled && (
        <button
          type="button"
          aria-label={`Bỏ file ${value.name}`}
          onClick={() => onChange(null)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-text-tertiary hover:bg-background-gray-secondary hover:text-text-primary"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
