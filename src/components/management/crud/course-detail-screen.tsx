import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import Button from '../../console/button'
import Panel from '../../console/panel'
import Notice from '../../console/notice'
import Status, { type StatusTone } from '../../console/status'
import ConfirmDialog from '../../console/confirm-dialog'
import DetailHeader from '../../console/detail/detail-header'
import {
  ConsoleTabs,
  ConsoleTabsContent,
  ConsoleTabsList,
  ConsoleTabsTrigger,
} from '../../console/tabs'
import { ArrowLeft, Clock3, Pencil, Send } from '../../console/icons'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { ApiError } from '../../../lib/api'
import {
  approveCourseReview,
  changeCourseStatus,
  getAdminCourse,
  mutateCourse,
  rejectCourseReview,
  submitCourseReview,
  type CourseAdmin,
} from '../../../services/courseAdminService'
import { getCategories } from '../../../services/categoryService'
import { getContentSections } from '../../../services/contentSectionService'
import type { ChapterAdmin } from '../../../services/chapterAdminService'
import CoursePhasesPanel from './course-phases-panel'
import CourseSectionsPanel from './course-sections-panel'
import CourseInstructorsPanel from './course-instructors-panel'
import CourseContentPanel from './course-content-panel'
import ContentSectionsPanel from './content-sections-panel'
import CourseEditorDialog from './course-editor-dialog'
import CourseRejectDialog from './course-reject-dialog'
import CourseStepper from './course-stepper'
import { courseSteps, firstBlocker, type CourseStep, type CourseStepTab } from './course-steps'
import { COURSE_STATUS_LABELS, REVIEW_STATE_LABELS, type CourseMutation } from './course-labels'
import { crudError, unknownMutation } from './crud-errors'

type ReviewAction = 'submit' | 'approve' | 'sell' | 'archive'

const ACTION_COPY: Record<
  ReviewAction,
  { title: string; body: string; confirm: string; done: string }
> = {
  submit: {
    title: 'Gửi duyệt khóa học?',
    body: 'Quản lý hoặc trưởng bộ môn sẽ xem và quyết định cho khóa lên bán. Trong lúc chờ duyệt bạn vẫn xem được khóa nhưng không nên sửa.',
    confirm: 'Gửi duyệt',
    done: 'Đã gửi duyệt. Khóa đang chờ người duyệt xử lý.',
  },
  approve: {
    title: 'Duyệt và bán khóa học?',
    body: 'Khóa sẽ hiện ngay ở trang chủ để học viên mua.',
    confirm: 'Duyệt và bán',
    done: 'Đã duyệt. Khóa đang được bán.',
  },
  sell: {
    title: 'Bán khóa học?',
    body: 'Khóa sẽ hiện ngay ở trang chủ để học viên mua.',
    confirm: 'Bán khóa',
    done: 'Khóa đang được bán.',
  },
  archive: {
    title: 'Lưu trữ khóa học?',
    body: 'Khóa sẽ ngừng bán nhưng học viên đã mua vẫn học được. Muốn bán lại, cần gửi duyệt hoặc bán lại sau khi chỉnh sửa.',
    confirm: 'Lưu trữ',
    done: 'Đã lưu trữ khóa học.',
  },
}

const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value)
      )
    : ''

function courseStatusLine(
  course: CourseAdmin,
  { waiting, readOnly, hint }: { waiting: boolean; readOnly: boolean; hint?: CourseStep }
): { tone: 'info' | 'warning' | 'neutral'; body: ReactNode } | null {
  if (course.status === 'PUBLISHED') {
    return readOnly
      ? null
      : {
          tone: 'neutral',
          body: 'Khóa đang bán. Muốn chỉnh sửa nội dung, hãy lưu trữ khóa trước rồi gửi duyệt lại.',
        }
  }
  if (waiting) {
    return {
      tone: 'info',
      body: `Chờ duyệt${course.reviewRequestedByName ? ` — gửi bởi ${course.reviewRequestedByName}` : ''}${
        course.reviewRequestedAt ? ` lúc ${dateTime(course.reviewRequestedAt)}` : ''
      }.`,
    }
  }
  if (course.reviewState === 'REJECTED') {
    return {
      tone: 'warning',
      body: (
        <div className="flex flex-col gap-1">
          <strong>
            Khóa bị trả lại
            {course.reviewedByName ? ` bởi ${course.reviewedByName}` : ''}
            {course.reviewedAt ? ` lúc ${dateTime(course.reviewedAt)}` : ''}
          </strong>
          {course.reviewNote && <span className="whitespace-pre-line">{course.reviewNote}</span>}
          <span>Sửa theo góp ý rồi gửi duyệt lại.</span>
        </div>
      ),
    }
  }
  if (hint?.note) {
    return {
      tone: 'neutral',
      body: (
        <>
          <strong className="font-medium text-text-primary">Tiếp theo: {hint.title}.</strong>{' '}
          {hint.note}
        </>
      ),
    }
  }
  return null
}

function statusTone(course: CourseAdmin): StatusTone {
  return course.status === 'PUBLISHED'
    ? 'success'
    : course.status === 'DRAFT'
      ? 'warning'
      : 'neutral'
}

export default function CourseDetailScreen({
  id,
  readOnly,
  onBack,
  initialTab = 'overview',
}: {
  id: string
  readOnly: boolean
  onBack: () => void
  initialTab?: CourseStepTab
}) {
  const { profile } = useCurrentUser()
  const resource = useScheduleResource(`course-detail:${id}`, () => getAdminCourse(id))
  const sectionsResource = useScheduleResource(`content-sections:${id}`, () =>
    getContentSections(id)
  )
  const categories = useScheduleResource('course-categories', getCategories)
  const [tab, setTab] = useState<CourseStepTab | 'instructors'>(initialTab)
  const [chapters, setChapters] = useState<ChapterAdmin[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [removing, setRemoving] = useState<{ resource: string; label: string } | null>(null)
  const [action, setAction] = useState<ReviewAction | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [editing, setEditing] = useState(false)

  const course = resource.data
  const onChapters = useCallback((items: ChapterAdmin[]) => setChapters(items), [])
  const reloadContent = useCallback(() => sectionsResource.reload(), [sectionsResource])
  // Backend field when present (it knows per-subject reviewers); otherwise the roles that always review.
  const canReview =
    course?.canReview ?? (profile?.role === 'ADMINISTRATOR' || profile?.role === 'MANAGER')

  const steps = useMemo(
    () => (course ? courseSteps(course, chapters, canReview) : []),
    [course, chapters, canReview]
  )
  const blocker = firstBlocker(steps)

  // Runs one request; a stale copy (409) or an unknown outcome reloads so the next click is on fresh data.
  async function run<T>(request: () => Promise<T>, success: string) {
    if (busy) return false
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await request()
      setNotice(success)
      resource.reload()
      return true
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err) || (err instanceof ApiError && err.status === 409)) {
        setNotice(
          unknownMutation(err)
            ? 'Chưa rõ kết quả thao tác. Đã yêu cầu tải lại để kiểm tra.'
            : 'Khóa vừa được người khác thay đổi. Đã tải lại, hãy kiểm tra rồi thử lại.'
        )
        resource.reload()
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  const mutate: CourseMutation = (target, method, body) =>
    run(() => mutateCourse(id, target, method, body), 'Đã lưu thay đổi.')
  const remove = (target: string, label: string) => {
    setError('')
    setRemoving({ resource: target, label })
  }

  // Content edits move the course's version, so a review step always starts from the latest copy.
  async function confirmAction(current: ReviewAction) {
    const request = async () => {
      const latest = await getAdminCourse(id)
      switch (current) {
        case 'submit':
          return submitCourseReview(latest)
        case 'approve':
          return approveCourseReview(latest)
        case 'sell':
          return changeCourseStatus(latest, 'PUBLISHED')
        case 'archive':
          return changeCourseStatus(latest, 'ARCHIVED')
      }
    }
    if (await run(request, ACTION_COPY[current].done)) setAction(null)
  }

  const canAct = !readOnly || canReview
  const goTo = (target: CourseStepTab) => setTab(target)
  const isMain = course?.courseType === 'MAIN'
  const waiting = course?.reviewState === 'PENDING'

  const hint = canAct && !waiting ? steps.find((step) => step.state === 'current') : undefined
  // One line under the steps: what is happening now, or what to do next.
  const statusLine = course
    ? courseStatusLine(course, { waiting: !!waiting, readOnly, hint })
    : null

  function primaryActions(current: CourseAdmin) {
    if (!canAct) return null
    // Reviewers act on review state even where the console is view-only for course content.
    if (current.status === 'PUBLISHED') {
      return (
        <>
          <Button appearance="outline" disabled={busy} onClick={() => setAction('archive')}>
            Lưu trữ
          </Button>
        </>
      )
    }
    if (waiting && !canReview) {
      return (
        <>
          <span className="inline-flex h-10 items-center gap-2 px-2 text-sm font-medium text-text-secondary">
            <Clock3 size={16} aria-hidden />
            Đang chờ duyệt
          </span>
        </>
      )
    }
    if (waiting) {
      return (
        <>
          <Button
            appearance="outline"
            variant="danger"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            Trả lại
          </Button>
          <Button
            disabled={busy || !!blocker}
            aria-describedby="course-action-reason"
            onClick={() => setAction('approve')}
          >
            Duyệt và bán
          </Button>
        </>
      )
    }
    return (
      <>
        {canReview ? (
          <Button
            disabled={busy || !!blocker}
            aria-describedby="course-action-reason"
            onClick={() => setAction('sell')}
          >
            Bán khóa
          </Button>
        ) : (
          <Button
            disabled={busy || !!blocker}
            aria-describedby="course-action-reason"
            onClick={() => setAction('submit')}
          >
            <Send size={16} />
            Gửi duyệt
          </Button>
        )}
      </>
    )
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button appearance="ghost" onClick={onBack} disabled={busy}>
          <ArrowLeft size={16} />
          Danh sách khóa
        </Button>
      </div>
      {notice && (
        <Notice tone="info">
          <span role="status">{notice}</span>
        </Notice>
      )}
      {error && !action && !rejecting && !removing && (
        <Notice tone="danger">
          <span role="alert">{error}</span>
        </Notice>
      )}
      <ScheduleResourceState
        skeleton="detail"
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
      >
        {course && (
          <>
            <Panel className="overflow-hidden">
              <DetailHeader
                title={course.title}
                subtitle={[
                  isMain ? 'Khóa chính' : 'Khóa tặng kèm',
                  course.categoryName ?? 'Chưa phân loại',
                  course.paid
                    ? `${new Intl.NumberFormat('vi-VN').format(course.price ?? 0)} đ`
                    : 'Miễn phí',
                ].join(' · ')}
                chips={
                  course.status !== 'PUBLISHED' && course.reviewState !== 'NONE' ? (
                    <Status tone={waiting ? 'info' : 'danger'}>
                      {REVIEW_STATE_LABELS[course.reviewState]}
                    </Status>
                  ) : (
                    <Status tone={statusTone(course)}>{COURSE_STATUS_LABELS[course.status]}</Status>
                  )
                }
                actions={primaryActions(course)}
              />
              {canAct && (
                <div className="mt-5 border-t border-card-border pt-3">
                  <CourseStepper steps={steps} onGo={goTo} />
                </div>
              )}
              {statusLine && (
                <div
                  id={hint ? 'course-action-reason' : undefined}
                  className={cn(
                    '-mx-5 -mb-5 mt-4 border-t px-5 py-3 text-sm',
                    statusLine.tone === 'warning'
                      ? 'border-transparent bg-badge-warning-background text-badge-warning-text'
                      : statusLine.tone === 'info'
                        ? 'border-transparent bg-badge-blue-background text-badge-blue-text'
                        : 'border-card-border bg-background-gray-secondary/50 text-text-secondary'
                  )}
                >
                  {statusLine.body}
                </div>
              )}
            </Panel>

            <ConsoleTabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
              <ConsoleTabsList aria-label="Nội dung khóa học">
                <ConsoleTabsTrigger value="overview">Tổng quan</ConsoleTabsTrigger>
                <ConsoleTabsTrigger value="content">Nội dung</ConsoleTabsTrigger>
                {isMain && <ConsoleTabsTrigger value="gifts">Khóa tặng kèm</ConsoleTabsTrigger>}
                <ConsoleTabsTrigger value="instructors">Giảng viên</ConsoleTabsTrigger>
              </ConsoleTabsList>

              <ConsoleTabsContent value="overview">
                <Panel
                  title="Thông tin khóa"
                  action={
                    readOnly ? undefined : (
                      <Button
                        appearance="outline"
                        onClick={() => setEditing(true)}
                        disabled={busy || !categories.data}
                      >
                        <Pencil size={16} />
                        Sửa thông tin
                      </Button>
                    )
                  }
                >
                  <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <dt className="text-text-tertiary">Loại khóa</dt>
                      <dd className="mt-1 font-medium text-text-primary">
                        {isMain ? 'Khóa chính' : 'Khóa tặng kèm'}
                      </dd>
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
                  </dl>
                  {course.shortIntroduction && (
                    <p className="mt-4 max-w-prose text-sm text-text-tertiary">
                      {course.shortIntroduction}
                    </p>
                  )}
                </Panel>
              </ConsoleTabsContent>

              <ConsoleTabsContent value="content">
                {isMain && (
                  <>
                    <CoursePhasesPanel
                      course={course}
                      readOnly={readOnly}
                      busy={busy}
                      mutate={mutate}
                      remove={remove}
                      error={error}
                    />
                    <ScheduleResourceState
                      status={sectionsResource.status}
                      errorMessage={sectionsResource.errorMessage}
                      onRetry={sectionsResource.reload}
                    >
                      <ContentSectionsPanel
                        courseId={course.id}
                        sections={sectionsResource.data ?? []}
                        phases={course.phases}
                        readOnly={readOnly}
                        onChanged={() => {
                          reloadContent()
                          resource.reload()
                        }}
                      />
                    </ScheduleResourceState>
                  </>
                )}
                <CourseContentPanel
                  courseId={course.id}
                  readOnly={readOnly}
                  title="Chương và bài học"
                  sections={sectionsResource.data ?? []}
                  onChapters={onChapters}
                  onChange={reloadContent}
                />
              </ConsoleTabsContent>

              {isMain && (
                <ConsoleTabsContent value="gifts">
                  <CourseSectionsPanel
                    course={course}
                    readOnly={readOnly}
                    busy={busy}
                    mutate={mutate}
                    remove={remove}
                  />
                </ConsoleTabsContent>
              )}

              <ConsoleTabsContent value="instructors">
                <CourseInstructorsPanel
                  course={course}
                  readOnly={readOnly}
                  busy={busy}
                  mutate={mutate}
                  remove={remove}
                />
              </ConsoleTabsContent>
            </ConsoleTabs>
          </>
        )}
      </ScheduleResourceState>

      {editing && course && categories.data && (
        <CourseEditorDialog
          course={course}
          categories={categories.data}
          onClose={() => {
            setEditing(false)
            resource.reload()
          }}
          onSaved={() => {
            setEditing(false)
            setNotice('Đã lưu khóa học.')
            resource.reload()
          }}
        />
      )}
      {action && course && (
        <ConfirmDialog
          title={ACTION_COPY[action].title}
          description={
            <>
              {course.title}. {ACTION_COPY[action].body}
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel={ACTION_COPY[action].confirm}
          busy={busy}
          onCancel={() => setAction(null)}
          onConfirm={() => void confirmAction(action)}
        />
      )}
      {rejecting && course && (
        <CourseRejectDialog
          courseTitle={course.title}
          busy={busy}
          error={error}
          onCancel={() => setRejecting(false)}
          onSubmit={async (note) => {
            if (
              await run(
                async () => rejectCourseReview(await getAdminCourse(id), note),
                'Đã trả lại khóa kèm lý do.'
              )
            )
              setRejecting(false)
          }}
        />
      )}
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
