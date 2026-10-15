import { useMemo, useState } from 'react'
import type { ColumnDef, RowData } from '@tanstack/react-table'
import DataTable from './data-table'
import { FilterGroup, FilterSelect, FilterToolbar, SearchInput } from './filter-toolbar'

// NextAdmin list card: search + optional filter on top, sortable table below.
interface ListCardProps<T extends RowData> {
  data: T[]
  columns: ColumnDef<T>[]
  getRowKey: (row: T) => string
  searchPlaceholder: string
  searchText: (row: T) => string
  filter?: { ariaLabel: string; allLabel: string; options: string[]; get: (row: T) => string }
  emptyMessage?: string
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .trim()

function ListCard<T extends RowData>({
  data,
  columns,
  getRowKey,
  searchPlaceholder,
  searchText,
  filter,
  emptyMessage = 'Không có dữ liệu phù hợp.',
}: ListCardProps<T>) {
  const [query, setQuery] = useState('')
  const [filterValue, setFilterValue] = useState('ALL')

  const rows = useMemo(() => {
    const needle = normalize(query)
    return data.filter(
      (row) =>
        (!needle || normalize(searchText(row)).includes(needle)) &&
        (!filter || filterValue === 'ALL' || filter.get(row) === filterValue)
    )
  }, [data, query, filter, filterValue, searchText])

  return (
    <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
      <FilterToolbar>
        <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />
        {filter && (
          <FilterGroup>
            <FilterSelect
              ariaLabel={filter.ariaLabel}
              value={filterValue}
              onChange={setFilterValue}
              options={[{ id: 'ALL', label: filter.allLabel }, ...filter.options.map((option) => ({ id: option, label: option }))]}
            />
          </FilterGroup>
        )}
      </FilterToolbar>
      <DataTable columns={columns} data={rows} getRowKey={getRowKey} emptyMessage={emptyMessage} />
      <div className="border-t border-card-border px-4 py-3 text-sm text-text-tertiary">{rows.length} mục</div>
    </section>
  )
}

export default ListCard
