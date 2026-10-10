import { useState } from 'react'
import Button from '../../console/button'
import Panel from '../../console/panel'
import Notice from '../../console/notice'
import Status from '../../console/status'
import ConfirmDialog from '../../console/confirm-dialog'
import { ArrowLeft, RefreshCw } from '../../console/icons'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getAdminCourse, mutateCourse } from '../../../services/courseAdminService'
import CoursePhasesPanel from './course-phases-panel'
import CourseSectionsPanel from './course-sections-panel'
import CourseInstructorsPanel from './course-instructors-panel'
import { COURSE_STATUS_LABELS, type CourseMutation } from './course-labels'
import { crudError, unknownMutation } from './crud-errors'

export default function CourseDetailScreen({
  id,
  readOnly,
  onBack,
}: {
  id: string
  readOnly: boolean
  onBack: () => void
}) {
  const resource = useScheduleResource(`course-detail:${id}`, () => getAdminCourse(id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [removing, setRemoving] = useState<{ resource: string; label: string } | null>(null)
  const mutate: CourseMutation = async (target, method, body) => {
    if (busy) return false
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await mutateCourse(id, target, method, body)
      setNotice('Đã lưu thay đổi.')
      resource.reload()
      return true
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err)) {
        setNotice('Chưa rõ kết quả thao tác. Đã yêu cầu tải lại để kiểm tra.')
        resource.reload()
      }
      return false
    } finally {
      setBusy(false)
    }
  }
  const remove = (target: string, label: string) => {
    setError('')
    setRemoving({ resource: target, label })
  }
  const course = resource.data
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button appearance="ghost" onClick={onBack} disabled={busy}>
          <ArrowLeft size={16} />
          Danh sách khóa
        </Button>
        <Button
          appearance="outline"
          onClick={resource.reload}
          disabled={busy || resource.status === 'loading'}
        >
          <RefreshCw size={16} />
          Làm mới
        </Button>
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
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
      >
        {course && (
          <>
            <Panel
              title={<span className="break-words">{course.title}</span>}
              action={
                <Status
                  tone={
                    course.status === 'PUBLISHED'
                      ? 'success'
                      : course.status === 'DRAFT'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {COURSE_STATUS_LABELS[course.status]}
                </Status>
              }
            >
              <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <dt className="text-text-tertiary">Loại khóa</dt>
                  <dd className="mt-1 font-medium text-text-primary">{course.courseType}</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Danh mục</dt>
                  <dd className="mt-1 font-medium text-text-primary">
                    {course.categoryName ?? 'Chưa phân loại'}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Học phí</dt>
                  <dd className="mt-1 font-medium text-text-primary">
                    {course.paid
                      ? new Intl.NumberFormat('vi-VN').format(course.price ?? 0) + ' đ'
                      : 'Miễn phí'}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Slug</dt>
                  <dd className="mt-1 break-words font-medium text-text-primary">{course.slug}</dd>
                </div>
              </dl>
              {course.shortIntroduction && (
                <p className="mt-4 max-w-prose text-sm text-text-tertiary">
                  {course.shortIntroduction}
                </p>
              )}
            </Panel>
            {course.courseType === 'MAIN' && (
              <>
                <CoursePhasesPanel
                  course={course}
                  readOnly={readOnly}
                  busy={busy}
                  mutate={mutate}
                  remove={remove}
                  error={error}
                />
                <CourseSectionsPanel
                  course={course}
                  readOnly={readOnly}
                  busy={busy}
                  mutate={mutate}
                  remove={remove}
                />
              </>
            )}
            <CourseInstructorsPanel
              course={course}
              readOnly={readOnly}
              busy={busy}
              mutate={mutate}
              remove={remove}
            />
          </>
        )}
      </ScheduleResourceState>
      {removing && (
        <ConfirmDialog
          title="Gỡ khỏi khóa học?"
          description={
            <>
              {removing.label}. Backend sẽ kiểm tra quyền và dữ liệu liên quan.
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel="Xác nhận gỡ"
          variant="danger"
          busy={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            if (await mutate(removing.resource, 'DELETE')) setRemoving(null)
          }}
        />
      )}
    </section>
  )
}
