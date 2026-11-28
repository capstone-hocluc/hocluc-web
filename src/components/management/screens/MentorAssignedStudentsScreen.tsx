import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import {
  getMentorAssignedStudents,
  type MentorAssignedStudent,
} from '../../../services/roadmapService'
import Button from '../../console/button'
import DateTime from '../../console/detail/date-time'
import ListCard from '../../console/list-card'
import Notice from '../../console/notice'
import Status from '../../console/status'
import StudentDiagnosticDialog from '../../console/student-diagnostic/StudentDiagnosticDialog'
import Page from '../screen-page'
import MentorAssignedStudentsSkeleton from './MentorAssignedStudentsSkeleton'

export default function MentorAssignedStudentsScreen() {
  const resource = useScheduleResource('mentor-assigned-students', getMentorAssignedStudents)
  const [selectedStudent, setSelectedStudent] = useState<MentorAssignedStudent | null>(null)

  const columns = useMemo<ColumnDef<MentorAssignedStudent>[]>(
    () => [
      {
        id: 'student',
        header: 'Học viên',
        accessorFn: (row) => row.displayName,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-text-primary">{row.original.displayName}</p>
            <p className="text-xs text-text-tertiary">{row.original.email}</p>
          </div>
        ),
      },
      {
        id: 'weakSkillCount',
        header: 'Kỹ năng yếu',
        accessorKey: 'weakSkillCount',
        cell: ({ row }) => (
          <Status tone={row.original.weakSkillCount > 0 ? 'danger' : 'neutral'}>
            {row.original.weakSkillCount > 0
              ? `${row.original.weakSkillCount} kỹ năng`
              : 'Chưa có'}
          </Status>
        ),
      },
      {
        id: 'topWeakSkillName',
        header: 'Ưu tiên củng cố',
        accessorFn: (row) => row.topWeakSkillName ?? '',
        cell: ({ row }) => (
          <span className="text-text-secondary">{row.original.topWeakSkillName || '—'}</span>
        ),
      },
      {
        id: 'dueReviewCount',
        header: 'Cần ôn tập',
        accessorKey: 'dueReviewCount',
        cell: ({ row }) => (
          <Status tone={row.original.dueReviewCount > 0 ? 'warning' : 'neutral'}>
            {row.original.dueReviewCount > 0 ? `${row.original.dueReviewCount} kỹ năng` : '0'}
          </Status>
        ),
      },
      {
        id: 'lastConversationAt',
        header: 'Trao đổi gần nhất',
        accessorFn: (row) => row.lastConversationAt ?? '',
        cell: ({ row }) => <DateTime value={row.original.lastConversationAt} />,
      },
    ],
    []
  )

  return (
    <Page title="Học viên">
      {resource.status === 'loading' || resource.status === 'idle' ? (
        <MentorAssignedStudentsSkeleton />
      ) : resource.status === 'forbidden' ? (
        <Notice tone="danger">Bạn không có quyền xem danh sách học viên phụ trách.</Notice>
      ) : resource.status === 'error' ? (
        <Notice tone="danger">
          <span>{resource.errorMessage || 'Không thể tải danh sách học viên phụ trách.'}</span>
          <Button size="sm" appearance="ghost" onClick={resource.reload}>
            Thử lại
          </Button>
        </Notice>
      ) : (
        <ListCard
          data={resource.data ?? []}
          columns={columns}
          getRowKey={(row) => row.studentId}
          searchPlaceholder="Tìm học viên, email, kỹ năng..."
          searchText={(row) =>
            `${row.displayName} ${row.email} ${row.topWeakSkillName ?? ''}`
          }
          emptyMessage="Chưa có học viên nào được phân công."
          onRowClick={(row) => setSelectedStudent(row)}
        />
      )}

      <StudentDiagnosticDialog
        open={Boolean(selectedStudent)}
        studentId={selectedStudent?.studentId ?? null}
        studentName={selectedStudent?.displayName}
        onClose={() => setSelectedStudent(null)}
      />
    </Page>
  )
}
