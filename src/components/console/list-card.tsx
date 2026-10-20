import { useMemo, useState, type ReactNode } from 'react'
import type { ColumnDef, RowData } from '@tanstack/react-table'
import DataTable from './data-table'
import { FilterGroup, FilterSelect, FilterToolbar, SearchInput } from './filter-toolbar'
import { matchesSearch } from '../../lib/search'

// NextAdmin list card: search + optional filter on top, sortable table below.
interface ListCardProps<T extends RowData> {
  data: T[]
  columns: ColumnDef<T>[]
  getRowKey: (row: T) => string
  searchPlaceholder: string
  searchText: (row: T) => string
  filter?: { ariaLabel: string; allLabel: string; options: string[]; get: (row: T) => string }
  extraFilters?: ReactNode
  searchState?: { value: string; onChange: (value: string) => void }
  filterState?: { value: string; onChange: (value: string) => void }
  emptyMessage?: string
}

function ListCard<T extends RowData>({
  data,
  columns,
  getRowKey,
  searchPlaceholder,
  searchText,
  filter,
  extraFilters,
  searchState,
  filterState,
  emptyMessage = 'Không có dữ liệu phù hợp.',
}: ListCardProps<T>) {
  const [localQuery, setLocalQuery] = useState('')
  const [localFilterValue, setLocalFilterValue] = useState('ALL')
  const query = searchState?.value ?? localQuery
  const setQuery = searchState?.onChange ?? setLocalQuery
  const filterValue = filterState?.value ?? localFilterValue
  const setFilterValue = filterState?.onChange ?? setLocalFilterValue

  const rows = useMemo(() => {
    return data.filter(
      (row) =>
        matchesSearch(query, searchText(row)) &&
        (!filter || filterValue === 'ALL' || filter.get(row) === filterValue)
    )
  }, [data, query, filter, filterValue, searchText])

  return (
    <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
      <FilterToolbar>
        <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />
        {(filter || extraFilters) && (
          <FilterGroup>
            {filter && <FilterSelect
              ariaLabel={filter.ariaLabel}
              value={filterValue}
              onChange={setFilterValue}
              options={[{ id: 'ALL', label: filter.allLabel }, ...filter.options.map((option) => ({ id: option, label: option }))]}
            />}
            {extraFilters}
          </FilterGroup>
        )}
      </FilterToolbar>
      <DataTable columns={columns} data={rows} getRowKey={getRowKey} emptyMessage={emptyMessage} />
      <div className="border-t border-card-border px-4 py-3 text-sm text-text-tertiary">{rows.length} mục</div>
    </section>
  )
}

export default ListCard
