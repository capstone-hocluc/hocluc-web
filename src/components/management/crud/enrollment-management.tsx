import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import SelectField from '../../console/select-field'
import Status from '../../console/status'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Plus, RefreshCw } from '../../console/icons'
import { Pagination } from '../../tailgrids/core/pagination'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getAdminCourses } from '../../../services/courseAdminService'
import { getUsers } from '../../../services/userService'
import {
  ENROLLMENT_TYPES,
  getAdminEnrollments,
  type EnrollmentAdmin,
  type EnrollmentQuery,
  type EnrollmentType,
} from '../../../services/enrollmentAdminService'
import { EMPTY, formatDate } from './crud-format'
import {
  COURSE_TYPE_LABELS,
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_TONES,
  ENROLLMENT_TYPE_LABELS,
} from './enrollment-labels'
import ManualEnrollmentDialog from './manual-enrollment-dialog'
import EnrollmentStatusDialog from './enrollment-status-dialog'
import EnrollmentExpiryDialog from './enrollment-expiry-dialog'

const LIST_KEY = 'admin-enrollments'
const EXPIRY_WINDOWS = [
  { id: 'ALL', label: 'Mọi hạn dùng' },
  { id: '7', label: 'Hết hạn trong 7 ngày' },
  { id: '30', label: 'Hết hạn trong 30 ngày' },
  { id: '90', label: 'Hết hạn trong 90 ngày' },
]

export default function EnrollmentManagement({ readOnly = false }: { readOnly?: boolean }) {
  const [query, setQuery] = useState<EnrollmentQuery>({ page: 0, size: 20 })
  const [editing, setEditing] = useState<{ kind: 'status' | 'expiry'; row: EnrollmentAdmin } | null>(
    null
  )
  const [enrolling, setEnrolling] = useState(false)
  const resource = useScheduleResource(`${LIST_KEY}:${JSON.stringify(query)}`, () =>
    getAdminEnrollments(query)
  )
  const students = useScheduleResource(`${LIST_KEY}-students`, () =>
    getUsers({ role: 'STUDENT', size: 100, sort: 'displayName,asc' })
  )
  const courses = useScheduleResource(`${LIST_KEY}-courses`, () => getAdminCourses({ size: 100 }))

  const columns = useMemo<ColumnDef<EnrollmentAdmin>[]>(
    () => [
      {
        id: 'student',
        header: 'Học viên',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-44 max-w-64">
            <span className="block truncate font-medium text-text-primary">
              {row.original.studentName ?? row.original.studentEmail}
            </span>
            <span className="mt-1 block truncate text-xs text-text-tertiary">
              {row.original.studentEmail}
            </span>
          </div>
        ),
      },
      {
        id: 'course',
        header: 'Khóa học',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-40 max-w-72">
            <span className="block truncate font-medium text-text-primary">
              {row.original.courseTitle}
            </span>
            <span className="mt-1 block text-xs text-text-tertiary">
              {COURSE_TYPE_LABELS[row.original.courseType]}
              {row.original.mainCourseId ? ' · thuộc khóa trọn bộ' : ''}
            </span>
          </div>
        ),
      },
      {
        id: 'enrollmentType',
        header: 'Nguồn',
        enableSorting: false,
        cell: ({ row }) => ENROLLMENT_TYPE_LABELS[row.original.enrollmentType],
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Status tone={ENROLLMENT_STATUS_TONES[row.original.status]}>
            {ENROLLMENT_STATUS_LABELS[row.original.status]}
          </Status>
        ),
      },
      {
        id: 'expiresAt',
        header: 'Hạn dùng',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.expiresAt ? formatDate(row.original.expiresAt) : 'Không giới hạn'}
          </span>
        ),
      },
      {
        id: 'progress',
        header: 'Tiến độ',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.progressPercentage === null
            ? EMPTY
            : `${Math.round(row.original.progressPercentage)}%`,
      },
      {
        id: 'actions',
        header: 'Thao tác',
        enableSorting: false,
        cell: ({ row }) =>
          readOnly ? (
            <span className="text-text-tertiary">{EMPTY}</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                appearance="outline"
                onClick={() => setEditing({ kind: 'status', row: row.original })}
              >
                Trạng thái
              </Button>
              <Button
                size="sm"
                appearance="ghost"
                onClick={() => setEditing({ kind: 'expiry', row: row.original })}
              >
                Hạn dùng
              </Button>
            </div>
          ),
      },
    ],
    [readOnly]
  )

  const setFilter = <K extends keyof EnrollmentQuery>(key: K, value: EnrollmentQuery[K]) =>
    setQuery((old) => ({ ...old, [key]: value, page: 0 }))

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-tertiary">
          Quyền học của học viên, kèm nguồn ghi danh và hạn truy cập.
        </p>
        <div className="flex gap-2">
          <Button
            appearance="outline"
            onClick={resource.reload}
            disabled={resource.status === 'loading'}
          >
            <RefreshCw size={16} />
            Làm mới
          </Button>
          {!readOnly && (
            <Button onClick={() => setEnrolling(true)}>
              <Plus size={16} />
              Ghi danh
            </Button>
          )}
        </div>
      </div>
      <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
        <div className="flex flex-wrap gap-3 px-5 py-4">
          <SelectField
            ariaLabel="Học viên lọc"
            value={query.studentId ?? 'ALL'}
            onChange={(value) => setFilter('studentId', value === 'ALL' ? undefined : value)}
            disabled={students.status !== 'ready'}
            options={[
              { id: 'ALL', label: 'Tất cả học viên' },
              ...(students.data?.content ?? []).map((student) => ({
                id: student.id,
                label: student.displayName || `${student.firstName} ${student.lastName}`.trim(),
              })),
            ]}
          />
          <SelectField
            ariaLabel="Khóa học lọc"
            value={query.courseId ?? 'ALL'}
            onChange={(value) => setFilter('courseId', value === 'ALL' ? undefined : value)}
            disabled={courses.status !== 'ready'}
            options={[
              { id: 'ALL', label: 'Tất cả khóa học' },
              ...(courses.data?.content ?? []).map((course) => ({ id: course.id, label: course.title })),
            ]}
          />
          <SelectField
            ariaLabel="Trạng thái ghi danh lọc"
            value={query.status ?? 'ALL'}
            onChange={(value) =>
              setFilter('status', value === 'ALL' ? undefined : (value as EnrollmentAdmin['status']))
            }
            options={[
              { id: 'ALL', label: 'Tất cả trạng thái' },
              ...Object.entries(ENROLLMENT_STATUS_LABELS).map(([id, label]) => ({ id, label })),
            ]}
          />
          <SelectField
            ariaLabel="Nguồn ghi danh lọc"
            value={query.type ?? 'ALL'}
            onChange={(value) =>
              setFilter('type', value === 'ALL' ? undefined : (value as EnrollmentType))
            }
            options={[
              { id: 'ALL', label: 'Tất cả nguồn' },
              ...ENROLLMENT_TYPES.map((id) => ({ id, label: ENROLLMENT_TYPE_LABELS[id] })),
            ]}
          />
          <SelectField
            ariaLabel="Hạn dùng lọc"
            value={query.expiringInDays === undefined ? 'ALL' : String(query.expiringInDays)}
            onChange={(value) => setFilter('expiringInDays', value === 'ALL' ? undefined : Number(value))}
            options={EXPIRY_WINDOWS}
          />
        </div>
        <ScheduleResourceState
          status={resource.status}
          errorMessage={resource.errorMessage}
          onRetry={resource.reload}
        >
          <DataTable
            columns={columns}
            data={resource.data?.content ?? []}
            getRowKey={(row) => row.id}
            emptyMessage="Chưa có ghi danh phù hợp."
          />
          <div className="flex flex-col gap-3 border-t border-card-border px-5 py-4">
            <p className="text-sm text-text-tertiary">
              {resource.data?.totalElements ?? 0} ghi danh
            </p>
            {(resource.data?.totalPages ?? 0) > 1 && (
              <Pagination
                currentPage={(query.page ?? 0) + 1}
                totalPages={resource.data?.totalPages ?? 1}
                onPageChange={(page) => setQuery((old) => ({ ...old, page: page - 1 }))}
                sideLayout="icon"
              />
            )}
          </div>
        </ScheduleResourceState>
      </section>

      {enrolling && (
        <ManualEnrollmentDialog
          onClose={() => setEnrolling(false)}
          onEnrolled={() => {
            setEnrolling(false)
            resource.reload()
          }}
        />
      )}
      {editing?.kind === 'status' && (
        <EnrollmentStatusDialog
          enrollment={editing.row}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            resource.reload()
          }}
        />
      )}
      {editing?.kind === 'expiry' && (
        <EnrollmentExpiryDialog
          enrollment={editing.row}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            resource.reload()
          }}
        />
      )}
    </section>
  )
}
