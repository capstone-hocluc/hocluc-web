import type { ReactNode } from 'react'
import { Search } from './icons'
import SelectField from './select-field'
import { fieldControlClass } from './form-field'

interface SearchFilterBarProps {
  query: string
  onQueryChange: (value: string) => void
  placeholder?: string
  filter?: string
  onFilterChange?: (value: string) => void
  filterOptions?: readonly string[]
  additionalFilters?: ReactNode
  resultCount?: number
  resultLabel?: ReactNode
}

// Search box + status select + result count row above a console list.
function SearchFilterBar({
  query,
  onQueryChange,
  placeholder = 'Tìm kiếm',
  filter,
  onFilterChange,
  filterOptions,
  additionalFilters,
  resultCount,
  resultLabel,
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-card-border px-5 py-4 max-sm:items-stretch">
      <label className="relative min-w-40 flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-icon-tertiary" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          className={`${fieldControlClass} pl-10`}
        />
      </label>
      {filterOptions && (
        <SelectField
          ariaLabel="Bộ lọc"
          options={filterOptions.map((option) => ({ id: option, label: option }))}
          value={filter ?? ''}
          onChange={(value) => onFilterChange?.(value)}
        />
      )}
      {additionalFilters}
      {resultCount !== undefined && (
        <span className="text-sm whitespace-nowrap text-text-tertiary">
          {resultCount} {resultLabel}
        </span>
      )}
    </div>
  )
}

export default SearchFilterBar
