import { useState } from 'react'
import Panel from '../../console/panel'
import Button from '../../console/button'
import SelectField from '../../console/select-field'
import Status from '../../console/status'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getUsers } from '../../../services/userService'
import type { CourseAdmin } from '../../../services/courseAdminService'
import type { CourseMutation, CourseRemoval } from './course-labels'

interface Props {
  course: CourseAdmin
  readOnly: boolean
  busy: boolean
  mutate: CourseMutation
  remove: CourseRemoval
}
export default function CourseInstructorsPanel({ course, readOnly, busy, mutate, remove }: Props) {
  const [teacherId, setTeacherId] = useState('NONE')
  const [page, setPage] = useState(0)
  const teachers = useScheduleResource(readOnly ? null : `course-teachers:${page}`, () =>
    getUsers({ role: 'TEACHER', status: 'ACTIVE', page, size: 20 })
  )
  const options = (teachers.data?.content ?? []).filter(
    (t) => !course.instructors.some((i) => i.instructorId === t.id)
  )
  return (
    <Panel title="Giảng viên">
      {!readOnly && (
        <ScheduleResourceState
          status={teachers.status}
          errorMessage={teachers.errorMessage}
          onRetry={teachers.reload}
        >
          <div className="mb-4 flex flex-col gap-3 border-b border-card-border pb-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <SelectField
                ariaLabel="Giảng viên cần gán"
                value={teacherId}
                onChange={setTeacherId}
                disabled={busy}
                options={[
                  { id: 'NONE', label: 'Chọn giáo viên' },
                  ...options.map((t) => ({
                    id: t.id,
                    label:
                      t.displayName || `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || t.email,
                  })),
                ]}
              />
              <Button
                disabled={busy || teacherId === 'NONE'}
                onClick={async () => {
                  if (
                    await mutate(`instructors/${teacherId}`, 'PUT', {
                      primaryInstructor: !course.instructors.length,
                      displayOrder: course.instructors.length,
                    })
                  )
                    setTeacherId('NONE')
                }}
              >
                Gán giảng viên
              </Button>
            </div>
            {teachers.data && teachers.data.totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm text-text-tertiary">
                <Button
                  size="sm"
                  appearance="outline"
                  disabled={busy || page === 0}
                  onClick={() => {
                    setPage(page - 1)
                    setTeacherId('NONE')
                  }}
                >
                  Trước
                </Button>
                Trang {page + 1}/{teachers.data.totalPages}
                <Button
                  size="sm"
                  appearance="outline"
                  disabled={busy || teachers.data.last}
                  onClick={() => {
                    setPage(page + 1)
                    setTeacherId('NONE')
                  }}
                >
                  Sau
                </Button>
              </div>
            )}
          </div>
        </ScheduleResourceState>
      )}
      {!course.instructors.length ? (
        <p className="text-sm text-text-tertiary">Chưa gán giảng viên.</p>
      ) : (
        <ul className="divide-y divide-card-border">
          {course.instructors.map((teacher) => (
            <li
              key={teacher.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-text-primary">{teacher.name}</span>
                {teacher.primaryInstructor && <Status tone="info">Giảng viên chính</Status>}
              </div>
              {!readOnly && (
                <div className="flex gap-2">
                  {!teacher.primaryInstructor && (
                    <Button
                      size="sm"
                      appearance="outline"
                      disabled={busy}
                      onClick={() =>
                        void mutate(`instructors/${teacher.instructorId}`, 'PUT', {
                          primaryInstructor: true,
                          displayOrder: teacher.displayOrder,
                        })
                      }
                    >
                      Đặt làm chính
                    </Button>
                  )}
                  <Button
                    size="sm"
                    appearance="ghost"
                    variant="danger"
                    disabled={busy}
                    onClick={() => remove(`instructors/${teacher.instructorId}`, teacher.name)}
                  >
                    Gỡ
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
