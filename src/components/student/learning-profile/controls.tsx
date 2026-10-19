import { type KeyboardEvent, type ReactNode, useRef } from 'react'
import DropdownField from '../../ui/DropdownField'
import { cva } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

const list = cva('', {
  variants: {
    variant: {
      // Main page tabs (Tổng quan / Học tập / Luyện đề).
      page: 'inline-flex max-w-full gap-6 overflow-x-auto border-b border-line max-[760px]:w-full',
      // Source switch inside a card (AI phân tích / Nhận xét giáo viên).
      source:
        'inline-flex gap-1.5 rounded-xl border border-line bg-surface-brand p-1 max-[760px]:grid max-[760px]:w-full max-[760px]:grid-cols-1',
      // Round filter chips.
      chip: 'mb-3 flex flex-wrap gap-2',
    },
  },
})

const tab = cva(
  'cursor-pointer font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  {
    variants: {
      variant: {
        page: 'min-h-12 shrink-0 border-b-2 border-transparent px-1 py-3 text-sm text-text-body transition-colors hover:border-line-brand hover:text-primary-text',
        source:
          'inline-flex min-h-10 items-center justify-center gap-[7px] rounded-xl border border-transparent px-3.5 text-sm whitespace-nowrap text-text-body transition hover:bg-surface',
        chip: 'min-h-10 rounded-full border border-line bg-surface px-4 text-sm text-text-body hover:bg-surface-brand',
      },
      active: { true: '', false: '' },
    },
    compoundVariants: [
      {
        variant: 'page',
        active: true,
        className: 'border-primary-bright text-primary-text',
      },
      {
        variant: 'source',
        active: true,
        className: 'border-primary bg-primary text-white shadow-none hover:bg-primary',
      },
      {
        variant: 'chip',
        active: true,
        className: 'border-primary bg-primary-soft text-primary-text',
      },
    ],
  }
)

interface SegmentedTabsProps {
  variant: 'page' | 'source' | 'chip'
  ariaLabel: string
  tabs: { key: string; label: ReactNode; icon?: ReactNode }[]
  active: string
  onChange: (key: string) => void
  /** With an id prefix each tab gets `${prefix}-tab-${key}` / aria-controls `${prefix}-panel-${key}`. */
  idPrefix?: string
}

// Row of role=tab buttons; the panel is rendered by the caller.
export function SegmentedTabs({
  variant,
  ariaLabel,
  tabs,
  active,
  onChange,
  idPrefix,
}: SegmentedTabsProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    )
    if (!buttons.length) return
    event.preventDefault()
    const current = buttons.indexOf(event.target as HTMLButtonElement)
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
    onChange(tabs[next].key)
    buttons[next].focus()
  }

  return (
    <div
      ref={listRef}
      className={list({ variant })}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((item) => (
        <button
          key={item.key}
          id={idPrefix ? `${idPrefix}-tab-${item.key}` : undefined}
          type="button"
          role="tab"
          aria-selected={active === item.key}
          tabIndex={active === item.key ? 0 : -1}
          aria-controls={idPrefix ? `${idPrefix}-panel-${item.key}` : undefined}
          className={cn(tab({ variant, active: active === item.key }))}
          onClick={() => onChange(item.key)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  )
}

interface ComparisonOption {
  key: string
  label: ReactNode
}

interface ComparisonDropdownProps<T extends ComparisonOption> {
  options: T[]
  selected: T
  onChange: (option: T) => void
}

// "So sánh với [7 ngày gần nhất ▾]" listbox.
export function ComparisonDropdown<T extends ComparisonOption>({
  options,
  selected,
  onChange,
}: ComparisonDropdownProps<T>) {
  return (
    <div className="flex min-w-0 flex-none items-center gap-3 max-[760px]:w-full max-[760px]:flex-wrap">
      <span className="text-sm font-medium whitespace-nowrap text-text-body">So sánh với</span>
      <DropdownField
        ariaLabel="Chọn khoảng so sánh"
        value={selected.key}
        options={options.map((option) => ({
          id: option.key,
          label: typeof option.label === 'string' ? option.label : option.key,
        }))}
        renderValue={(option) => options.find((item) => item.key === option?.id)?.label}
        renderOption={(option) => options.find((item) => item.key === option.id)?.label}
        onChange={(key) => {
          const option = options.find((item) => item.key === key)
          if (option) onChange(option)
        }}
        className="min-h-11 w-auto min-w-48 rounded-xl text-sm font-semibold max-[760px]:w-full"
      />
    </div>
  )
}
