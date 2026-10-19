import { useState, type ReactNode } from 'react'
import { Check, Copy } from '../icons'
import DetailSection from './detail-section'
import DateTime from './date-time'

interface SystemInfoProps {
  id?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  /** Technical flags and audit rows: use <SystemRow>. */
  children?: ReactNode
}

export function SystemRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="min-w-0 text-sm break-words text-text-primary">{children}</dd>
    </div>
  )
}

function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be blocked; the ID stays selectable on screen.
    }
  }
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <code className="min-w-0 truncate text-xs">{value}</code>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? 'Đã sao chép ID' : 'Sao chép ID'}
        title={copied ? 'Đã sao chép' : 'Sao chép ID'}
        className="shrink-0 rounded p-1 text-icon-tertiary hover:text-text-primary"
      >
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      </button>
    </span>
  )
}

// Folded by default: IDs, audit dates and technical flags are for support, not for the first look.
export default function SystemInfo({ id, createdAt, updatedAt, children }: SystemInfoProps) {
  if (!id && !createdAt && !updatedAt && !children) return null
  return (
    <DetailSection title="Thông tin hệ thống" collapsible defaultOpen={false}>
      <dl className="flex flex-col gap-2">
        {id && (
          <SystemRow label="ID">
            <CopyId value={id} />
          </SystemRow>
        )}
        {createdAt && (
          <SystemRow label="Ngày tạo">
            <DateTime value={createdAt} />
          </SystemRow>
        )}
        {updatedAt && (
          <SystemRow label="Cập nhật lần cuối">
            <DateTime value={updatedAt} />
          </SystemRow>
        )}
        {children}
      </dl>
    </DetailSection>
  )
}
