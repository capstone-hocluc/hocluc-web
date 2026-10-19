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
import { cn } from '../../lib/cn'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from '../tailgrids/core/table'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Width / alignment classes applied to the column's header and cells. */
    className?: string
  }
}

// Management-area table: tailgrids table parts driven by tanstack-table, styled like the CRM dashboard
// (grey header band with small bold labels, compact cells, hover row), same props as ui/DataTable.
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
      <TableHeader className="bg-background-gray-secondary [&_th]:border-border-secondary">
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const sorted = header.column.getIsSorted()
              return (
                <TableHead
                  key={header.id}
                  scope="col"
                  aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold whitespace-nowrap text-text-secondary',
                    header.column.columnDef.meta?.className
                  )}
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
            className={cn(
              'transition-colors focus-within:bg-background-gray-primary hover:bg-background-gray-primary [&>td]:align-middle',
              onRowClick && 'cursor-pointer'
            )}
            onClick={onRowClick ? () => onRowClick(row.original) : undefined}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn(
                  'px-4 py-3.5 align-middle text-sm leading-5 font-normal text-text-primary',
                  cell.column.columnDef.meta?.className
                )}
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
