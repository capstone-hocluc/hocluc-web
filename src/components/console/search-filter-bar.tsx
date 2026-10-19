import type { ReactNode } from 'react'
import { FilterGroup, FilterSelect, FilterToolbar, SearchInput } from './filter-toolbar'

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

// Search box + status select + result count row above a console list (CRM toolbar style).
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
    <FilterToolbar>
      <SearchInput value={query} onChange={onQueryChange} placeholder={placeholder} />
      <FilterGroup>
        {filterOptions && (
          <FilterSelect
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
      </FilterGroup>
    </FilterToolbar>
  )
}

export default SearchFilterBar
