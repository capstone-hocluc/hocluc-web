import { useMemo, useState } from 'react'
import type { ColumnDef, RowData } from '@tanstack/react-table'
import { Search } from './icons'
import DataTable from './data-table'
import SelectField from './select-field'
import { Input } from '../tailgrids/core/input'

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
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-icon-tertiary" />
          <Input
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 w-full py-0 pl-10 text-sm"
          />
        </div>
        {filter && (
          <SelectField
            ariaLabel={filter.ariaLabel}
            value={filterValue}
            onChange={setFilterValue}
            options={[{ id: 'ALL', label: filter.allLabel }, ...filter.options.map((option) => ({ id: option, label: option }))]}
            triggerClassName="h-9"
          />
        )}
      </div>
      <DataTable columns={columns} data={rows} getRowKey={getRowKey} emptyMessage={emptyMessage} />
      <div className="border-t border-card-border px-5 py-3 text-sm text-text-tertiary">{rows.length} mục</div>
    </section>
  )
}

export default ListCard
