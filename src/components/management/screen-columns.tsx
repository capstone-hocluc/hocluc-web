import type { ColumnDef } from '@tanstack/react-table'

// Plain text column over a row key.
export const text = <T,>(id: keyof T & string, header: string, className = 'text-text-secondary'): ColumnDef<T> => ({
  id,
  header,
  accessorFn: (row) => row[id] as string | number,
  cell: ({ getValue }) => <span className={className}>{String(getValue())}</span>,
})
