import { useState, type FormEvent, type ReactNode } from 'react'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Notice from '../../console/notice'
import SearchSelectField from '../../console/search-select-field'
import { getAdminCourses } from '../../../services/courseAdminService'
import { getUsers } from '../../../services/userService'
import { createManualEnrollment } from '../../../services/enrollmentAdminService'
import { crudError } from './crud-errors'
import { COURSE_TYPE_LABELS } from './enrollment-labels'

const PAGE_SIZE = 20

const studentLabel = (student: { displayName?: string; firstName?: string; lastName?: string }) =>
  student.displayName || `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()

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
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang ghi danh...' : 'Ghi danh'}
          </Button>
        </>
      }
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        <Picker label="Học viên" hint="Tìm theo tên hoặc email; chỉ tài khoản có vai trò đang hoạt động là STUDENT.">
          <SearchSelectField
            ariaLabel="Học viên"
            value={studentId}
            onChange={setStudentId}
            disabled={busy}
            placeholder="Chọn học viên"
            searchPlaceholder="Tìm học viên theo tên hoặc email"
            triggerClassName="w-full"
            loadPage={(term, page) =>
              getUsers({ role: 'STUDENT', query: term, page, size: PAGE_SIZE, sort: 'displayName,asc' }).then(
                (result) => ({
                  options: result.content.map((student) => ({
                    id: student.id,
                    label: studentLabel(student),
                  })),
                  last: result.last,
                })
              )
            }
          />
        </Picker>
        <Picker label="Khóa học" hint="Khóa trọn bộ mở cả lộ trình; khóa nhỏ chỉ mở chính nó.">
          <SearchSelectField
            ariaLabel="Khóa học"
            value={courseId}
            onChange={setCourseId}
            disabled={busy}
            placeholder="Chọn khóa học"
            searchPlaceholder="Tìm khóa học theo tên"
            triggerClassName="w-full"
            loadPage={(term, page) =>
              getAdminCourses({ query: term, page, size: PAGE_SIZE }).then((result) => ({
                options: result.content.map((course) => ({
                  id: course.id,
                  label: `${course.title} · ${COURSE_TYPE_LABELS[course.courseType]}`,
                })),
                last: result.last,
              }))
            }
          />
        </Picker>
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
      </div>
    </ConsoleDialog>
  )
}
