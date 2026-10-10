import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Search } from '../console/icons'
import {
  useDeferredValue,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '../../lib/cn'

export interface DropdownOption {
  id: string
  label: string
  description?: ReactNode
  searchText?: string
  isDisabled?: boolean
}

export interface DropdownFieldProps {
  options: readonly DropdownOption[]
  value?: string | null
  onChange: (value: string | null) => void
  ariaLabel: string
  placeholder?: string
  selectedLabel?: string
  isSearchable?: boolean
  filterOptions?: boolean
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  isLoading?: boolean
  isError?: boolean
  loadingMessage?: ReactNode
  errorMessage?: ReactNode
  emptyMessage?: ReactNode
  isDisabled?: boolean
  /** Increase trigger and menu targets for touch use in responsive workflows. */
  mobileTouchTargets?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  ariaDescribedBy?: string
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  className?: string
  triggerClassName?: string
  contentClassName?: string
  optionClassName?: string
  appearance?: 'outline' | 'fill'
  renderValue?: (option: DropdownOption | undefined) => ReactNode
  renderOption?: (option: DropdownOption, state: { isSelected: boolean }) => ReactNode
}

interface ActiveOptionState {
  optionId: string
  selectedValue: string | null
  query: string
  visibleOptions: readonly DropdownOption[]
}

const DEFAULT_PLACEHOLDER = 'Chọn giá trị'

function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .trim()
}

export function DropdownField({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder = DEFAULT_PLACEHOLDER,
  selectedLabel,
  isSearchable = false,
  filterOptions = true,
  searchPlaceholder = 'Tìm kiếm…',
  onSearchChange,
  isLoading = false,
  isError = false,
  loadingMessage = 'Đang tải danh sách…',
  errorMessage = 'Không thể tải danh sách.',
  emptyMessage = 'Không tìm thấy kết quả phù hợp.',
  isDisabled = false,
  mobileTouchTargets = false,
  isRequired = false,
  isInvalid = false,
  ariaDescribedBy,
  isOpen: controlledIsOpen,
  onOpenChange,
  className,
  triggerClassName,
  contentClassName,
  optionClassName,
  appearance = 'outline',
  renderValue,
  renderOption,
}: DropdownFieldProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeOption, setActiveOption] = useState<ActiveOptionState | null>(null)
  const deferredQuery = useDeferredValue(query)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLDivElement>(null)
  const listboxId = `dropdown-listbox-${useId().replace(/:/g, '')}`
  const isOpen = controlledIsOpen ?? uncontrolledIsOpen
  const selectedOption = options.find((option) => option.id === (value ?? null))

  const visibleOptions = useMemo(() => {
    if (!isSearchable || !filterOptions) return options

    const normalizedQuery = normalizeSearchValue(deferredQuery)
    if (!normalizedQuery) return options

    return options.filter((option) =>
      normalizeSearchValue(`${option.label} ${option.searchText ?? ''}`).includes(normalizedQuery),
    )
  }, [deferredQuery, filterOptions, isSearchable, options])

  const selectedValue = value ?? null
  const selectedIndex = visibleOptions.findIndex((option) => option.id === selectedValue)
  const defaultActiveIndex = selectedIndex >= 0 && !visibleOptions[selectedIndex].isDisabled
    ? selectedIndex
    : visibleOptions.findIndex((option) => !option.isDisabled)
  const storedActiveIndex = activeOption && activeOption.selectedValue === selectedValue && activeOption.query === query && activeOption.visibleOptions === visibleOptions
    ? visibleOptions.findIndex((option) => option.id === activeOption.optionId)
    : -1
  const activeIndex = !isOpen
    ? -1
    : storedActiveIndex >= 0
    ? storedActiveIndex
    : defaultActiveIndex

  const setActiveIndex = (index: number) => {
    const option = visibleOptions[index]
    setActiveOption(option ? { optionId: option.id, selectedValue, query, visibleOptions } : null)
  }

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (controlledIsOpen === undefined) setUncontrolledIsOpen(nextIsOpen)
    if (!nextIsOpen) {
      setQuery('')
      setActiveOption(null)
      onSearchChange?.('')
    }
    onOpenChange?.(nextIsOpen)
  }

  const handleSearchChange = (nextQuery: string) => {
    setQuery(nextQuery)
    setActiveOption(null)
    onSearchChange?.(nextQuery)
  }

  const handleSelectionChange = (option: DropdownOption) => {
    if (option.isDisabled) return
    onChange(option.id)
    handleOpenChange(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!visibleOptions.length) return

    const enabledIndexes = visibleOptions.reduce<number[]>((indexes, option, index) => {
      if (!option.isDisabled) indexes.push(index)
      return indexes
    }, [])
    if (!enabledIndexes.length) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      const currentPosition = enabledIndexes.indexOf(activeIndex)
      const nextPosition =
        currentPosition === -1
          ? direction === 1
            ? 0
            : enabledIndexes.length - 1
          : (currentPosition + direction + enabledIndexes.length) % enabledIndexes.length
      setActiveIndex(enabledIndexes[nextPosition])
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? enabledIndexes[0] : enabledIndexes.at(-1) ?? -1)
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      const activeOption = visibleOptions[activeIndex]
      if (activeOption) handleSelectionChange(activeOption)
    }
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          data-dropdown-trigger="true"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={isInvalid || undefined}
          aria-required={isRequired || undefined}
          disabled={isDisabled}
          className={cn(
            'dropdown-field-trigger inline-flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[9px] border border-border-subtle bg-surface px-3 py-2 text-left text-sm font-normal text-text-label outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-55',
            appearance === 'fill' && 'border-transparent bg-primary text-white hover:bg-primary-dark',
            isInvalid && 'border-danger focus-visible:border-danger focus-visible:ring-danger/20',
            mobileTouchTargets && 'max-[767px]:h-11',
            className,
            triggerClassName,
          )}
        >
          <span className="min-w-0 truncate">
            {renderValue
              ? renderValue(selectedOption)
              : selectedOption?.label || selectedLabel || placeholder}
          </span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-text-muted transition-transform', isOpen && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            const isCompactViewport = window.matchMedia('(max-width: 767px)').matches
            if (isSearchable && !isCompactViewport) searchInputRef.current?.focus()
            else listboxRef.current?.focus()
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'z-90 w-[var(--radix-popover-trigger-width)] min-w-40 overflow-hidden rounded-[10px] border border-border-subtle bg-surface outline-none',
            contentClassName,
          )}
        >
          {isSearchable && (
            <div className="border-b border-border-subtle p-1.5">
              <div className={cn(
                'flex h-8 items-center gap-2 rounded-md border border-border-subtle px-2 text-text-muted focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
                mobileTouchTargets && 'max-[767px]:h-11',
              )}>
                <Search size={14} aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  autoComplete="off"
                  aria-label={`Tìm ${ariaLabel.toLocaleLowerCase('vi-VN')}`}
                  className={cn(
                    'h-8 w-full border-0 bg-transparent py-1 text-xs text-text-strong outline-none',
                    mobileTouchTargets && 'max-[767px]:h-11',
                  )}
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
              </div>
            </div>
          )}
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={isSearchable ? -1 : 0}
            aria-label={`Danh sách ${ariaLabel.toLocaleLowerCase('vi-VN')}`}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
            className="max-h-64 overflow-auto p-1.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            {visibleOptions.map((option, index) => {
              const isSelected = option.id === (value ?? null)
              const isActive = index === activeIndex
              return (
                <button
                  key={option.id}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.isDisabled}
                  data-highlighted={isActive || undefined}
                  className={cn(
                    'group/item relative flex w-full cursor-pointer items-center gap-3 rounded-md py-1.5 pr-8 pl-2 text-left text-sm text-text-secondary outline-none transition data-[highlighted=true]:bg-surface-hover data-[highlighted=true]:text-text-heading disabled:pointer-events-none disabled:text-text-subtle',
                    mobileTouchTargets && 'max-[767px]:min-h-11',
                    optionClassName,
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelectionChange(option)}
                >
                  {renderOption ? (
                    renderOption(option, { isSelected })
                  ) : (
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-text-heading">{option.label}</span>
                      {option.description && (
                        <span className="truncate text-xs text-text-muted">{option.description}</span>
                      )}
                    </span>
                  )}
                  {isSelected && (
                    <span className="absolute right-1.5 flex size-5 items-center justify-center text-text-heading">
                      <Check size={14} aria-hidden="true" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {isLoading && (
            <p className="px-3 py-4 text-center text-sm text-text-muted" role="status">
              {loadingMessage}
            </p>
          )}
          {!isLoading && isError && (
            <p className="px-3 py-4 text-center text-sm text-danger" role="alert">
              {errorMessage}
            </p>
          )}
          {!isLoading && !isError && visibleOptions.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-text-muted" role="status">
              {emptyMessage}
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default DropdownField
