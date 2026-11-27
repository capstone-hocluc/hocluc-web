import type { ColumnDef } from '@tanstack/react-table'
import type { CreditStudentBalance } from '../../../services/creditAdminService'
import DataTable from '../../console/data-table'
import { SearchInput } from '../../console/filter-toolbar'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { CreditAmount } from '../../credits/CreditIcon'
import { Pagination } from '../../tailgrids/core/pagination'
import { useCreditStudentList } from './use-credit-student-list'

const amounts: { key: 'available' | 'bonus' | 'paid' | 'held'; label: string }[] = [
  { key: 'available', label: 'Có thể dùng' },
  { key: 'bonus', label: 'Thưởng' },
  { key: 'paid', label: 'Đã mua' },
  { key: 'held', label: 'Tạm giữ' },
]

export default function CreditStudentList({ version, onSelect }: {
  version: number
  onSelect: (student: CreditStudentBalance) => void
}) {
  const { query, setQuery, page, setPage, data, status, errorMessage, reload } = useCreditStudentList(version)
  const columns: ColumnDef<CreditStudentBalance>[] = [
    {
      id: 'student',
      header: 'Học viên',
      enableSorting: false,
      cell: ({ row: { original: student } }) => (
        <div className="min-w-40">
          <button
            type="button"
            className="block text-left font-medium text-text-primary hover:underline"
            onClick={(event) => {
              event.stopPropagation()
              onSelect(student)
            }}
          >
            {student.displayName}
          </button>
          <span className="block text-xs text-text-tertiary">{student.email}</span>
        </div>
      ),
    },
    ...amounts.map(({ key, label }): ColumnDef<CreditStudentBalance> => ({
      id: key,
      header: label,
      enableSorting: false,
      cell: ({ row }) => <CreditAmount value={row.original[key]} />,
    })),
  ]

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Tìm học viên theo tên hoặc email" />
      <div className="overflow-hidden rounded-xl border border-card-border bg-card-background">
        <ScheduleResourceState skeleton="table" inset status={status} errorMessage={errorMessage} onRetry={reload}>
          <DataTable columns={columns} data={data?.content ?? []} getRowKey={(row) => row.userId}
            onRowClick={onSelect} emptyMessage="Không tìm thấy học viên." />
          {data && data.totalPages > 1 && (
            <div className="border-t border-card-border px-5 py-4">
              <Pagination currentPage={page + 1} totalPages={data.totalPages}
                onPageChange={(next) => setPage(next - 1)} sideLayout="icon" />
            </div>
          )}
        </ScheduleResourceState>
      </div>
    </div>
  )
}
