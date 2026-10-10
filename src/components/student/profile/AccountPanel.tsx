import type { ReactNode } from 'react'
import { CheckCircle2, Loader2 } from '../../console/icons'
import Button from '../../ui/Button'
import Card from '../../ui/Card'

interface AccountPanelProps {
  title: string
  subtitle?: string
  children: ReactNode
}

// Card + heading shared by every account-settings section.
export function AccountPanel({ title, subtitle, children }: AccountPanelProps) {
  return (
    <Card as="section" padding="none" radius="xl" className="p-6 max-[560px]:p-4">
      <div className="mb-[18px]">
        <h2 className="text-lg font-black text-text-heading">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-text-secondary">{subtitle}</p>}
      </div>
      {children}
    </Card>
  )
}

// Two-column form grid (single column on phones).
export function AccountForm({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-[18px] gap-y-4 max-[700px]:grid-cols-1">{children}</div>
  )
}

export function FormGroupTitle({ children }: { children: ReactNode }) {
  return (
    <div className="col-span-full mt-1 border-b border-line pb-2 text-sm font-extrabold text-text-heading first:mt-0">
      {children}
    </div>
  )
}

interface SaveBarProps {
  saving: boolean
  saved: boolean
  submitLabel: string
  savedLabel: string
  onSubmit: () => void
  /** Renders the secondary "Hủy" button when given. */
  onCancel?: () => void
}

// Submit / cancel buttons and the transient "saved" badge of a form.
export function SaveBar({ saving, saved, submitLabel, savedLabel, onSubmit, onCancel }: SaveBarProps) {
  return (
    <div className="col-span-full flex flex-wrap items-center gap-3 pt-1">
      <Button onClick={onSubmit} disabled={saving}>
        {saving && <Loader2 className="animate-spin" />}
        {saving ? 'Đang lưu...' : submitLabel}
      </Button>
      {onCancel && (
        <Button appearance="outline" onClick={onCancel} disabled={saving}>
          Hủy
        </Button>
      )}
      {saved && (
        <span
          role="status"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-badge-success-text"
        >
          <CheckCircle2 size={14} />
          {savedLabel}
        </span>
      )}
    </div>
  )
}
