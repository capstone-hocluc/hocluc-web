import { type ReactNode, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

const list = cva('', {
  variants: {
    variant: {
      // Main page tabs (Tổng quan / Học tập / Luyện đề).
      page: 'inline-flex gap-1.5 rounded-[14px] border border-line-blue bg-surface p-[5px] shadow-[0_10px_22px_rgba(17,24,58,0.04)] max-[760px]:w-full max-[760px]:overflow-x-auto',
      // Source switch inside a card (AI phân tích / Nhận xét giáo viên).
      source:
        'inline-flex gap-1.5 rounded-[14px] border border-line-blue bg-surface-sky p-[5px] max-[760px]:grid max-[760px]:w-full max-[760px]:grid-cols-1',
      // Round filter chips.
      chip: 'mb-3 flex flex-wrap gap-2',
    },
  },
})

const tab = cva('cursor-pointer font-black', {
  variants: {
    variant: {
      page: 'min-h-[38px] rounded-[10px] px-[18px] text-[13px] text-text-secondary max-[760px]:flex-[1_0_auto] max-[760px]:px-3.5',
      source:
        'inline-flex min-h-[34px] items-center justify-center gap-[7px] rounded-[10px] border border-transparent px-[13px] text-[12px] whitespace-nowrap text-text-emphasis transition',
      chip: 'min-h-[34px] rounded-full border border-line bg-surface px-[13px] text-[12px] text-text-secondary',
    },
    active: { true: '', false: '' },
  },
  compoundVariants: [
    {
      variant: 'page',
      active: true,
      className: 'bg-primary text-surface shadow-[0_8px_18px_rgba(28, 176, 246,0.18)]',
    },
    {
      variant: 'source',
      active: true,
      className: 'border-primary bg-primary text-surface shadow-[0_8px_18px_rgba(28, 176, 246,0.16)]',
    },
    {
      variant: 'chip',
      active: true,
      className: 'border-primary bg-primary-soft text-primary',
    },
  ],
})

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
  return (
    <div className={list({ variant })} role="tablist" aria-label={ariaLabel}>
      {tabs.map((item) => (
        <button
          key={item.key}
          id={idPrefix ? `${idPrefix}-tab-${item.key}` : undefined}
          type="button"
          role="tab"
          aria-selected={active === item.key}
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
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeDropdown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false)
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeDropdown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeDropdown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div
      className="relative z-5 flex flex-none items-center gap-2 max-[760px]:w-full max-[760px]:flex-col max-[760px]:items-start"
      ref={dropdownRef}
    >
      <span className="text-[12px] font-black whitespace-nowrap text-text-faint">So sánh với</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group inline-flex min-h-[34px] cursor-pointer items-center gap-2 rounded-xl border border-line-blue bg-surface px-[11px] text-[12px] font-black text-primary shadow-[0_8px_18px_rgba(17,24,58,0.04)] max-[760px]:w-full max-[760px]:justify-between"
        onClick={() => setOpen((current) => !current)}
      >
        {selected.label}
        <ChevronDown size={15} className="transition-transform group-aria-expanded:rotate-180" />
      </button>
      {open && (
        <div
          className="absolute top-[calc(100%+8px)] right-0 z-20 flex w-[184px] flex-col gap-1 rounded-[14px] border border-line-blue bg-surface p-[7px] shadow-[0_18px_38px_rgba(17,24,58,0.14)] max-[760px]:right-auto max-[760px]:left-0 max-[760px]:w-full"
          role="listbox"
          aria-label="Chọn khoảng so sánh"
        >
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="option"
              aria-selected={selected.key === option.key}
              className={cn(
                'min-h-[34px] w-full cursor-pointer rounded-[10px] px-2.5 text-left text-[12px] font-[850] text-text-heading-muted hover:bg-surface-brand hover:text-primary',
                selected.key === option.key && 'bg-surface-brand text-primary'
              )}
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
