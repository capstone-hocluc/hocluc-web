import { useState, type FormEvent, type ReactNode } from 'react'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Notice from '../../console/notice'
import SelectField from '../../console/select-field'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getAdminCourses } from '../../../services/courseAdminService'
import { getUsers } from '../../../services/userService'
import { createManualEnrollment } from '../../../services/enrollmentAdminService'
import { crudError } from './crud-errors'
import { COURSE_TYPE_LABELS } from './enrollment-labels'

// A picker needs a visible label and a hint, but a <label> wrapping the select button would
// hijack clicks, so the label sits beside the control and the control keeps its aria-label.
function Picker({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 text-sm font-medium text-text-primary">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-text-tertiary">{hint}</span>}
    </div>
  )
}

/** Staff enrolls a student by hand; the access window comes from the course configuration. */
export default function ManualEnrollmentDialog({
  onClose,
  onEnrolled,
}: {
  onClose: () => void
  onEnrolled: () => void
}) {
  const [studentId, setStudentId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const students = useScheduleResource('enroll-students', () =>
    getUsers({ role: 'STUDENT', size: 100, sort: 'displayName,asc' })
  )
  const courses = useScheduleResource('enroll-courses', () => getAdminCourses({ size: 100 }))

  const ready = students.status === 'ready' && courses.status === 'ready'
  const loadFailed = students.status === 'error' || courses.status === 'error'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!studentId || !courseId) {
      setError('Chọn học viên và khóa học.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await createManualEnrollment({ studentId, courseId })
      onEnrolled()
    } catch (err) {
      setError(crudError(err))
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title="Ghi danh thủ công"
      description="Cấp quyền học ngay, dùng đúng hạn truy cập của khóa."
      maxWidth={560}
      dismissable={!busy}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy || !ready}>
            {busy ? 'Đang ghi danh...' : 'Ghi danh'}
          </Button>
        </>
      }
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        <Picker label="Học viên" hint="Chỉ tài khoản có vai trò đang hoạt động là STUDENT.">
          <SelectField
            ariaLabel="Học viên"
            value={studentId}
            onChange={setStudentId}
            disabled={busy || students.status !== 'ready'}
            placeholder="Chọn học viên"
            triggerClassName="w-full"
            options={(students.data?.content ?? []).map((student) => ({
              id: student.id,
              label: student.displayName || `${student.firstName} ${student.lastName}`.trim(),
            }))}
          />
        </Picker>
        <Picker label="Khóa học" hint="Khóa trọn bộ mở cả lộ trình; khóa nhỏ chỉ mở chính nó.">
          <SelectField
            ariaLabel="Khóa học"
            value={courseId}
            onChange={setCourseId}
            disabled={busy || courses.status !== 'ready'}
            placeholder="Chọn khóa học"
            triggerClassName="w-full"
            options={(courses.data?.content ?? []).map((course) => ({
              id: course.id,
              label: `${course.title} · ${COURSE_TYPE_LABELS[course.courseType]}`,
            }))}
          />
        </Picker>
        {loadFailed && (
          <Notice tone="warning">
            Không tải được danh sách.{' '}
            <Button
              appearance="outline"
              size="sm"
              onClick={() => {
                students.reload()
                courses.reload()
              }}
            >
              Thử lại
            </Button>
          </Notice>
        )}
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
      </div>
    </ConsoleDialog>
  )
}
