import type { ReactNode } from 'react'
import {
  type ColumnDef,
  type RowData,
  type TableOptions,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
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
    meta,
  })
  const columnCount = table.getHeaderGroups()[0]?.headers.length ?? 1

  return (
    <TableRoot fullBleed>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id} scope="col" className="bg-background-gray-secondary whitespace-nowrap">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
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
              <TableCell key={cell.id} className="align-middle font-normal text-text-body">
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
