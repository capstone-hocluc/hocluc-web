import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import SelectField from '../../console/select-field'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Plus, RefreshCw } from '../../console/icons'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getAdminCourses } from '../../../services/courseAdminService'
import {
  deleteAdminStudyGroup,
  getAdminStudyGroups,
  type StudyGroupAdmin,
} from '../../../services/studyGroupAdminService'
import { crudError } from './crud-errors'
import { LEVEL_LABELS } from './study-group-labels'
import StudyGroupEditorDialog from './study-group-editor-dialog'
import StudyGroupDetailDialog from './study-group-detail-dialog'

export default function StudyGroupManagement({ readOnly = false }: { readOnly?: boolean }) {
  const [courseChoice, setCourseChoice] = useState('NONE')
  const [editor, setEditor] = useState<{ group: StudyGroupAdmin | null } | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<StudyGroupAdmin | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const courses = useScheduleResource('study-group-courses', () =>
    getAdminCourses({ type: 'MAIN', size: 100 })
  )
  // Only MAIN courses host groups, so the picker defaults to the first one offered.
  const courseId = courseChoice === 'NONE' ? courses.data?.content[0]?.id ?? '' : courseChoice
  const groups = useScheduleResource(courseId ? `study-groups:${courseId}` : null, () =>
    getAdminStudyGroups(courseId)
  )

  const columns = useMemo<ColumnDef<StudyGroupAdmin>[]>(
    () => [
      {
        id: 'name',
        header: 'Nhóm',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-44 max-w-72">
            <span className="block truncate font-medium text-text-primary">{row.original.name}</span>
            <span className="mt-1 block truncate text-xs text-text-tertiary">
              {row.original.houseLabel}
              {' · '}
              {row.original.level ? LEVEL_LABELS[row.original.level] : 'Mọi trình độ'}
            </span>
          </div>
        ),
      },
      {
        id: 'size',
        header: 'Sĩ số',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.activeStudentCount}
            {row.original.capacity === null ? ' · Không giới hạn' : ` / ${row.original.capacity}`}
          </span>
        ),
      },
      {
        id: 'mentors',
        header: 'Mentor',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.mentors.length === 0 ? (
            <span className="text-text-tertiary">Chưa gán</span>
          ) : (
            <span className="flex flex-col gap-1">
              {row.original.mentors.map((mentor) => (
                <span key={mentor.id} className="text-text-secondary">
                  {mentor.fullName}
                  {mentor.primaryMentor ? ' · Chính' : ''}
                </span>
              ))}
            </span>
          ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              appearance="outline"
              disabled={busy}
              onClick={() => setSelectedGroupId(row.original.id)}
            >
              Chi tiết
            </Button>
            {!readOnly && (
              <>
                <Button
                  size="sm"
                  appearance="ghost"
                  disabled={busy}
                  onClick={() => setEditor({ group: row.original })}
                >
                  Sửa
                </Button>
                <Button
                  size="sm"
                  appearance="ghost"
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    setError('')
                    setDeleting(row.original)
                  }}
                >
                  Xóa
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [busy, readOnly]
  )

  async function confirmDelete() {
    if (!deleting || busy) return
    setBusy(true)
    setError('')
    try {
      await deleteAdminStudyGroup(courseId, deleting.id)
      setNotice('Đã xóa nhóm học.')
      setDeleting(null)
      groups.reload()
    } catch (err) {
      setError(crudError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SelectField
            ariaLabel="Khóa học của nhóm"
            value={courseId || 'NONE'}
            onChange={setCourseChoice}
            disabled={courses.status !== 'ready'}
            options={[
              ...(courses.data?.content ?? []).map((course) => ({ id: course.id, label: course.title })),
              ...(courseId ? [] : [{ id: 'NONE', label: 'Chưa có khóa trọn bộ' }]),
            ]}
          />
          <Button appearance="outline" onClick={groups.reload} disabled={busy}>
            <RefreshCw size={16} />
            Làm mới
          </Button>
        </div>
        {!readOnly && (
          <Button onClick={() => setEditor({ group: null })} disabled={busy || !courseId}>
            <Plus size={16} />
            Tạo nhóm
          </Button>
        )}
      </div>

      {notice && (
        <Notice tone="info">
          <span role="status">{notice}</span>
        </Notice>
      )}
      {error && (
        <Notice tone="danger">
          <span role="alert">{error}</span>
        </Notice>
      )}

      {courses.status === 'error' ? (
        <Notice tone="warning">
          Không tải được danh sách khóa.{' '}
          <Button appearance="outline" size="sm" onClick={courses.reload}>
            Thử lại
          </Button>
        </Notice>
      ) : courses.status === 'ready' && !courseId ? (
        <Notice tone="warning">Chưa có khóa trọn bộ (MAIN) nào để quản lý nhóm.</Notice>
      ) : (
        <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
          <ScheduleResourceState
            status={groups.status}
            errorMessage={groups.errorMessage}
            onRetry={groups.reload}
          >
            <DataTable
              columns={columns}
              data={groups.data ?? []}
              getRowKey={(group) => group.id}
              emptyMessage="Khóa này chưa có nhóm học."
            />
          </ScheduleResourceState>
        </section>
      )}

      {selectedGroupId && (
        <StudyGroupDetailDialog
          key={selectedGroupId}
          courseId={courseId}
          groupId={selectedGroupId}
          readOnly={readOnly}
          onClose={() => setSelectedGroupId(null)}
          onChanged={() => groups.reload()}
        />
      )}

      {editor && (
        <StudyGroupEditorDialog
          key={editor.group?.id ?? 'new'}
          courseId={courseId}
          group={editor.group}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            setNotice('Đã lưu nhóm học.')
            groups.reload()
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Xóa nhóm học?"
          description={
            <>
              <strong>{deleting.name}</strong>. Chỉ xóa được khi nhóm không còn học viên đang học.
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel="Xóa nhóm"
          variant="danger"
          busy={busy}
          busyLabel="Đang xóa..."
          onCancel={() => {
            if (!busy) setDeleting(null)
          }}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </section>
  )
}
