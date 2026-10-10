import type { ReactNode } from 'react'
import {
  type ColumnDef,
  type RowData,
  type TableOptions,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronBothDirection } from '@tailgrids/icons'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from '../tailgrids/core/table'

// Management-area table: NextAdmin table parts driven by tanstack-table,
// same props as ui/DataTable.
interface DataTableProps<T extends RowData> {
  columns: ColumnDef<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: ReactNode
  getRowKey: (row: T) => string
  meta?: TableOptions<T>['meta']
}

function DataTable<T extends RowData>({
  columns,
  data,
  onRowClick,
  emptyMessage,
  getRowKey,
  meta,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getRowId: getRowKey,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta,
  })
  const columnCount = table.getHeaderGroups()[0]?.headers.length ?? 1

  return (
    <TableRoot fullBleed>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="[&_th]:border-t">
            {group.headers.map((header) => {
              const sorted = header.column.getIsSorted()
              return (
                <TableHead
                  key={header.id}
                  scope="col"
                  aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                  className="px-6 py-3 text-sm leading-5 font-medium whitespace-nowrap text-text-secondary"
                >
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="flex cursor-pointer items-center gap-1.5 outline-none focus-visible:text-text-primary"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <ChevronBothDirection className={sorted ? 'size-4 text-text-primary' : 'size-4'} aria-hidden="true" />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            className={onRowClick ? 'cursor-pointer hover:bg-background-gray-secondary' : undefined}
            onClick={onRowClick ? () => onRowClick(row.original) : undefined}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className="px-6 py-3.5 align-middle text-sm leading-5 font-normal tracking-[-0.15px] text-text-primary"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {!data.length && (
          <TableRow>
            <TableCell colSpan={columnCount} className="py-7 text-center text-text-subtle">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </TableRoot>
  )
}

export default DataTable
