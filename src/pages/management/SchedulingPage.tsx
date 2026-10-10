import { useMemo, useState } from 'react'
import { CalendarPlus, Pencil, RefreshCw, Trash2 } from '../../components/console/icons'
import type { Course, CourseSection } from '../../services/courseService'
import { getCourseDetail, getMainCourses } from '../../services/courseService'
import { getUsers, type UserSummary } from '../../services/userService'
import { cancelRecurringClass, createRecurringClass, getCourseRecurringClasses, updateRecurringClass } from '../../services/recurringClassService'
import { ApiError } from '../../lib/api'
import {
  createSchedule,
  deleteSchedule as deleteScheduleService,
  getCourseSchedules,
  updateSchedule,
} from '../../services/scheduleService'
import { getCourseClassSessions, updateClassSession } from '../../services/classSessionService'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { runWithUnsavedActionGuard, useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'
import { addLocalDays, itemDateKey, itemSubtitle, localDateLabel, localToday, sortScheduleItems, startOfLocalWeek } from '../../lib/scheduling'
import type {
  ClassSessionResponse,
  CreateRecurringClassRequest,
  CreateScheduleRequest,
  RecurringClassResponse,
  DayOfWeek,
  ScheduleCalendarItem,
  ScheduleResponse,
  UpdateClassSessionRequest,
  UpdateRecurringClassRequest,
  UpdateScheduleRequest,
} from '../../types/scheduling'
import Button from '../../components/console/button'
import ConfirmDialog from '../../components/console/confirm-dialog'
import DropdownField from '../../components/console/dropdown-field'
import Notice from '../../components/console/notice'
import PageHeading from '../../components/console/page-heading'
import ScheduleCalendar from '../../components/console/schedule/schedule-calendar'
import ScheduleDetailsSheet from '../../components/console/schedule/schedule-details-sheet'
import ScheduleFilters, { type ScheduleViewMode } from '../../components/console/schedule/schedule-filters'
import ScheduleList from '../../components/console/schedule/schedule-list'
import ScheduleResourceState from '../../components/console/schedule/schedule-resource-state'
import ScheduleStatusBadge from '../../components/console/schedule/schedule-status-badge'
import ClassSessionRecordingsPanel from '../../components/console/schedule/class-session-recordings-panel'
import ScheduleAttendancePanel from '../../components/console/schedule/schedule-attendance-panel'
import ClassSessionEditor from './ClassSessionEditor'
import RecurringClassEditor from './RecurringClassEditor'
import ScheduleEditor from './ScheduleEditor'
import TimetableProposalPanel from './TimetableProposalPanel'
import { getErrorMessage } from '../../lib/errors'
import type { ManagementRole } from '../../components/management/ManagementRouteGuard'

interface Props {
  role: Extract<ManagementRole, 'STAFF' | 'MANAGER'>
}

const weekdayLabels: Record<DayOfWeek, string> = {
  MONDAY: 'Thứ Hai',
  TUESDAY: 'Thứ Ba',
  WEDNESDAY: 'Thứ Tư',
  THURSDAY: 'Thứ Năm',
  FRIDAY: 'Thứ Sáu',
  SATURDAY: 'Thứ Bảy',
  SUNDAY: 'Chủ Nhật',
}

function requireData<T>(response: { data?: T }, message: string): T {
  if (response.data === undefined || response.data === null) throw new Error(message)
  return response.data
}

async function loadMainCourses(): Promise<Course[]> {
  return requireData(await getMainCourses(), 'Không thể tải danh mục khóa học.')
}

async function loadTeachers(): Promise<UserSummary[]> {
  const query = { role: 'TEACHER' as const, status: 'ACTIVE' as const, size: 100 }
  const firstPage = await getUsers({ ...query, page: 0 })
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
      getUsers({ ...query, page: index + 1 })
    )
  )
  return [firstPage, ...remainingPages].flatMap((page) => page.content)
}

export default function SchedulingPage({ role }: Props) {
  const [date, setDate] = useState(localToday())
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ScheduleViewMode>('agenda')
  const [courseId, setCourseId] = useState('')
  const [selectedItem, setSelectedItem] = useState<ScheduleCalendarItem | null>(null)
  const [scheduleEditor, setScheduleEditor] = useState<ScheduleResponse | null | 'create'>(null)
  const [classSessionEditor, setClassSessionEditor] = useState<ClassSessionResponse | null>(null)
  const [cancelSession, setCancelSession] = useState<ClassSessionResponse | null>(null)
  const [recurringEditor, setRecurringEditor] = useState<RecurringClassResponse | 'create' | null>(null)
  const [cancelSeries, setCancelSeries] = useState<RecurringClassResponse | null>(null)
  const [deleteSchedule, setDeleteSchedule] = useState<ScheduleResponse | null>(null)
  const [mutationBusy, setMutationBusy] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [notice, setNotice] = useState('')
  const [recurringCreateUnknown, setRecurringCreateUnknown] = useState(false)
  const [proposalConfirmationBlockedCourses, setProposalConfirmationBlockedCourses] = useState<Set<string>>(() => new Set())
  const [attendancePanelState, setAttendancePanelState] = useState({ dirty: false, busy: false })
  const unsavedGuard = useUnsavedActionGuard(
    attendancePanelState.dirty,
    attendancePanelState.busy || mutationBusy
  )

  const courses = useScheduleResource('management-main-courses', loadMainCourses)
  const teacherResource = useScheduleResource(role === 'STAFF' ? 'management-teachers' : null, loadTeachers)
  const availableCourses = courses.data ?? []
  const activeCourseId = courseId || availableCourses[0]?.id || ''
  const courseDetails = useScheduleResource(
    activeCourseId ? 'management-course-detail:' + activeCourseId : null,
    async () => requireData(await getCourseDetail(activeCourseId), 'Không thể tải danh sách môn của khóa học.')
  )
  const courseSections = useMemo<CourseSection[]>(
    () => (courseDetails.data?.phases ?? []).flatMap((phase) => phase.sections ?? []),
    [courseDetails.data]
  )
  const weekStart = startOfLocalWeek(date)
  const weekEnd = addLocalDays(weekStart, 6)
  const scheduleRange = { startDate: weekStart, endDate: weekEnd }

  const calendar = useScheduleResource(
    activeCourseId ? 'management-calendar:' + activeCourseId + ':' + weekStart : null,
    async () => {
      const [scheduleItems, recurringClasses, sessions] = await Promise.all([
        getCourseSchedules(activeCourseId),
        getCourseRecurringClasses(activeCourseId),
        getCourseClassSessions(activeCourseId, scheduleRange),
      ])
      return { scheduleItems, recurringClasses, sessions }
    }
  )

  const allItems = useMemo<ScheduleCalendarItem[]>(() => [
    ...(calendar.data?.scheduleItems ?? []).map((item) => ({ kind: 'schedule' as const, sourceId: item.id, item })),
    ...(calendar.data?.sessions ?? []).map((item) => ({ kind: 'classSession' as const, sourceId: item.id, item })),
  ], [calendar.data])
  const weekItems = useMemo(() => allItems.filter((item) => {
    const key = itemDateKey(item)
    return key >= weekStart && key <= weekEnd
  }), [allItems, weekStart, weekEnd])
  const visibleItems = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('vi-VN')
    const sorted = sortScheduleItems(weekItems)
    if (!text) return sorted
    return sorted.filter((item) =>
      (item.item.title + ' ' + itemSubtitle(item)).toLocaleLowerCase('vi-VN').includes(text)
    )
  }, [weekItems, query])

  const courseOptions = availableCourses.map((course) => ({ id: course.id, label: course.title }))
  const teachers = teacherResource.data ?? []
  const changeCourse = (nextCourseId: string | null) => {
    runWithUnsavedActionGuard(() => {
      setCourseId(nextCourseId ?? '')
      setSelectedItem(null)
      setScheduleEditor(null)
      setClassSessionEditor(null)
      setRecurringEditor(null)
    })
  }
  const changeDate = (nextDate: string) => {
    runWithUnsavedActionGuard(() => {
      setDate(nextDate)
      setSelectedItem(null)
      setScheduleEditor(null)
      setClassSessionEditor(null)
    })
  }
  const selectItem = (item: ScheduleCalendarItem) => {
    if (selectedItem?.kind === item.kind && selectedItem.sourceId === item.sourceId) return
    runWithUnsavedActionGuard(() => setSelectedItem(item))
  }
  const closeDetails = () => setSelectedItem(null)

  const runMutation = async (action: () => Promise<unknown>, success: string, reload = true) => {
    setMutationBusy(true)
    setMutationError('')
    setNotice('')
    try {
      await action()
      setNotice(success)
      if (reload) calendar.reload()
      return true
    } catch (error) {
      setMutationError(getErrorMessage(error))
      return false
    } finally {
      setMutationBusy(false)
    }
  }

  const saveSchedule = async (payload: CreateScheduleRequest | UpdateScheduleRequest) => {
    if (scheduleEditor === null || (scheduleEditor === 'create' && !activeCourseId)) return
    const creating = scheduleEditor === 'create'
    const saved = await runMutation(
      () => creating
        ? createSchedule(activeCourseId, payload as CreateScheduleRequest)
        : updateSchedule(scheduleEditor.id, payload as UpdateScheduleRequest),
      creating ? 'Đã tạo lịch học.' : 'Đã cập nhật lịch học.'
    )
    if (saved) setScheduleEditor(null)
  }

  const saveRecurringClass = async (payload: CreateRecurringClassRequest | UpdateRecurringClassRequest) => {
    if (!activeCourseId || mutationBusy) return
    const editingSeries = recurringEditor !== null && recurringEditor !== 'create' ? recurringEditor : null
    if (!editingSeries && recurringCreateUnknown) return
    setMutationBusy(true)
    setMutationError('')
    setNotice('')
    try {
      if (editingSeries) {
        await updateRecurringClass(editingSeries.id, payload)
        setNotice('Đã cập nhật chuỗi lịch lặp; các buổi chưa diễn ra đã được sinh lại.')
      } else {
        await createRecurringClass(activeCourseId, payload as CreateRecurringClassRequest)
        setNotice('Đã tạo chuỗi lịch lặp.')
      }
      calendar.reload()
      setRecurringEditor(null)
    } catch (error) {
      setMutationError(getErrorMessage(error))
      // An edit is a safe retry (the BE keys off the current state), so only a create can end
      // with an unknown outcome.
      if (!editingSeries && (!(error instanceof ApiError) || error.status === 408 || error.status >= 500)) {
        setRecurringCreateUnknown(true)
        calendar.reload()
      }
    } finally {
      setMutationBusy(false)
    }
  }

  const cancelOneSession = async () => {
    if (!cancelSession) return
    const saved = await runMutation(
      () => updateClassSession(cancelSession.id, { status: 'CANCELLED' }),
      'Đã hủy buổi học.'
    )
    if (saved) setCancelSession(null)
  }

  const saveClassSession = async (payload: UpdateClassSessionRequest) => {
    if (!classSessionEditor) return
    const saved = await runMutation(
      () => updateClassSession(classSessionEditor.id, payload),
      'Đã cập nhật buổi học.'
    )
    if (saved) setClassSessionEditor(null)
  }

  const deleteOneSchedule = async () => {
    if (!deleteSchedule) return
    const saved = await runMutation(() => deleteScheduleService(deleteSchedule.id), 'Đã hủy lịch học.')
    if (saved) setDeleteSchedule(null)
  }

  const cancelRecurringSeries = async () => {
    if (!cancelSeries) return
    const saved = await runMutation(
      () => cancelRecurringClass(cancelSeries.id),
      'Đã hủy toàn bộ chuỗi lịch lặp và các buổi trực thuộc.'
    )
    if (saved) setCancelSeries(null)
  }

  const teacherStatusMessage =
    teacherResource.status === 'forbidden'
      ? 'Tài khoản hiện tại không có quyền tải danh sách giáo viên.'
      : teacherResource.status === 'error'
        ? teacherResource.errorMessage
        : teacherResource.status === 'ready' && !teachers.length
          ? 'Chưa tải được danh sách giáo viên để tạo lịch.'
        : ''
  const courseSectionsStatusMessage =
    courseDetails.status === 'loading'
      ? 'Đang tải danh sách môn của khóa học.'
      : courseDetails.status === 'forbidden'
        ? 'Tài khoản hiện tại không có quyền xem nội dung khóa học.'
        : courseDetails.status === 'not-found'
          ? 'Không tìm thấy khóa học đã chọn.'
          : courseDetails.status === 'error'
            ? courseDetails.errorMessage || 'Không tải được danh sách môn của khóa học.'
            : courseDetails.status === 'ready' && !courseSections.length
              ? 'Khóa học chưa có môn để xếp lịch.'
              : ''
  const recurringCreateDisabledReason = courseSectionsStatusMessage ||
    (teacherResource.status !== 'ready'
      ? teacherStatusMessage || 'Đang tải danh sách giáo viên.'
      : !teachers.length
        ? 'Chưa có giáo viên để tạo lịch lặp.'
        : '')
  const recurringCreateButtonReason = recurringCreateUnknown
    ? 'Kết quả lần tạo trước chưa rõ. Hãy kiểm tra lịch rồi mở lại trang.'
    : recurringCreateDisabledReason
  const scheduleCreateLoading = courses.status === 'loading' || teacherResource.status === 'loading'

  return (
    <div className="space-y-5">
      <PageHeading
        title="Lịch học"
      />

      <div className="flex flex-wrap justify-end gap-2">
        {role === 'STAFF' && (
          <Button
            appearance="outline"
           
            disabled={!activeCourseId || courses.status !== 'ready' || teacherResource.status !== 'ready' || !teachers.length || mutationBusy || attendancePanelState.busy}
            title={!activeCourseId ? 'Chọn khóa học trước khi tạo lịch.' : undefined}
            onClick={() => runWithUnsavedActionGuard(() => {
              setMutationError('')
              setSelectedItem(null)
              setScheduleEditor('create')
            })}
          >
            <CalendarPlus size={16} />
            {scheduleCreateLoading ? 'Đang tải dữ liệu…' : 'Tạo lịch đơn'}
          </Button>
        )}
        {role === 'STAFF' && (
          <Button
            appearance="outline"
           
            disabled={!activeCourseId || recurringCreateButtonReason !== '' || mutationBusy || attendancePanelState.busy}
            title={!activeCourseId ? 'Chọn khóa học trước khi tạo lịch lặp.' : recurringCreateButtonReason || undefined}
            onClick={() => runWithUnsavedActionGuard(() => {
              setMutationError('')
              setSelectedItem(null)
              setRecurringEditor('create')
            })}
          >
            <CalendarPlus size={16} />
            Tạo lịch lặp
          </Button>
        )}
        <Button appearance="ghost" size="icon" aria-label="Tải lại lịch" onClick={() => {
          runWithUnsavedActionGuard(() => {
            setSelectedItem(null)
            calendar.reload()
          })
        }} disabled={mutationBusy || attendancePanelState.busy}>
          <RefreshCw size={17} />
        </Button>
      </div>
      {(attendancePanelState.busy || mutationBusy) && (
        <Notice tone="info">Đang lưu…</Notice>
      )}
      {recurringCreateUnknown && (
        <Notice tone="warning">Kết quả tạo chưa rõ. Đừng gửi lại; hãy kiểm tra danh sách rồi mở lại trang.</Notice>
      )}
      {(courses.status === 'error' || courses.status === 'forbidden') && (
        <Notice tone={courses.status === 'forbidden' ? 'warning' : 'danger'}>
          Không tải được danh sách khóa học.
          <Button size="sm" appearance="outline" onClick={courses.reload}>Thử lại</Button>
        </Notice>
      )}
      {courses.status === 'ready' && availableCourses.length === 0 && (
        <Notice tone="warning">Chưa có khóa học đang mở để tạo lịch đơn.</Notice>
      )}

      {teacherStatusMessage && <Notice tone={teacherResource.status === 'forbidden' ? 'warning' : 'danger'}>{teacherStatusMessage}</Notice>}
      {mutationError && <Notice tone="danger">{mutationError}</Notice>}
      {notice && <Notice tone="info">{notice}</Notice>}

      <section className="rounded-xl border border-card-border bg-card-background p-3 sm:p-4">
        <label className="block max-w-xl text-sm font-medium text-text-primary">
          Khóa học
          <div className="mt-2">
            <DropdownField
              ariaLabel="Chọn khóa học để xem lịch"
              options={courseOptions}
              value={activeCourseId || null}
              onChange={changeCourse}
              isSearchable
              searchPlaceholder="Tìm khóa học…"
              isLoading={courses.status === 'loading'}
              isError={courses.status === 'error' || courses.status === 'forbidden'}
              errorMessage="Không thể tải danh sách khóa học."
              emptyMessage="Danh mục chưa có khóa học để hiển thị."
              placeholder="Chọn khóa học"
            />
          </div>
        </label>
      </section>

      {activeCourseId && (
        <>
          <ScheduleFilters
            date={date}
            onDateChange={changeDate}
            query={query}
            onQueryChange={setQuery}
            view={view}
            onViewChange={setView}
          />
          <ScheduleResourceState
            status={calendar.status}
            errorMessage={calendar.errorMessage}
            empty={!visibleItems.length}
            emptyMessage={query.trim() ? 'Không có lịch phù hợp.' : 'Chưa có lịch trong tuần này.'}
            onRetry={calendar.reload}
          >
            {view === 'agenda' ? (
              <ScheduleList items={visibleItems} onSelect={selectItem} />
            ) : (
              <ScheduleCalendar items={visibleItems} date={date} onDateChange={changeDate} onSelect={selectItem} />
            )}
          </ScheduleResourceState>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-medium text-text-primary">Chuỗi lịch lặp</h2>
                
              </div>
            </div>
            <ScheduleResourceState
              status={calendar.status}
              errorMessage={calendar.errorMessage}
              empty={!calendar.data?.recurringClasses.length}
              emptyMessage="Khóa học này chưa có lịch lặp."
              onRetry={calendar.reload}
            >
              <div className="space-y-2">
                {(calendar.data?.recurringClasses ?? []).map((series) => (
                  <RecurringSeriesRow
                    key={series.id}
                    series={series}
                    onEdit={() => runWithUnsavedActionGuard(() => {
                      setMutationError('')
                      setSelectedItem(null)
                      setRecurringEditor(series)
                    })}
                    onCancel={() => setCancelSeries(series)}
                  />
                ))}
              </div>
            </ScheduleResourceState>
          </section>
          <TimetableProposalPanel
            key={activeCourseId}
            courseId={activeCourseId}
            sections={courseSections}
            sectionsStatus={courseDetails.status}
            sectionsErrorMessage={courseDetails.errorMessage}
            confirmationBlocked={proposalConfirmationBlockedCourses.has(activeCourseId)}
            onConfirmationUnknown={() => {
              if (activeCourseId) {
                setProposalConfirmationBlockedCourses((current) => new Set(current).add(activeCourseId))
              }
            }}
            onConfirmed={calendar.reload}
          />
        </>
      )}

      <ScheduleDetailsSheet
        item={selectedItem}
        onClose={closeDetails}
        body={selectedItem?.kind === 'classSession' ? (
          <ClassSessionRecordingsPanel session={selectedItem.item} role={role} />
        ) : selectedItem?.kind === 'schedule' && role === 'STAFF' ? (
          <ScheduleAttendancePanel scheduleId={selectedItem.item.id} onStateChange={setAttendancePanelState} />
        ) : undefined}
        footer={selectedItem && (
          <div className="flex flex-wrap gap-2 border-t border-card-border pt-4">
            {selectedItem.kind === 'schedule' && role === 'STAFF' && (
              <>
                <Button
                  appearance="outline"
                 
                  onClick={() => runWithUnsavedActionGuard(() => {
                    setScheduleEditor(selectedItem.item)
                    setSelectedItem(null)
                  })}
                >
                  <Pencil size={15} />
                  Sửa lịch
                </Button>
                <Button variant="danger" appearance="outline" onClick={() => runWithUnsavedActionGuard(() => {
                  setDeleteSchedule(selectedItem.item)
                  setSelectedItem(null)
                })}>
                  <Trash2 size={15} />
                  Hủy lịch
                </Button>
              </>
            )}
            {selectedItem.kind === 'classSession' && (
              <>
                <Button
                  appearance="outline"
                 
                  onClick={() => runWithUnsavedActionGuard(() => {
                    setClassSessionEditor(selectedItem.item)
                    setSelectedItem(null)
                  })}
                >
                  <Pencil size={15} />
                  Sửa buổi học
                </Button>
                {selectedItem.item.status !== 'CANCELLED' && (
                  <Button
                    variant="danger"
                    appearance="outline"
                    onClick={() => runWithUnsavedActionGuard(() => {
                      setCancelSession(selectedItem.item)
                      setSelectedItem(null)
                    })}
                  >
                    <Trash2 size={15} />
                    Hủy buổi
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      />

      {scheduleEditor !== null && (
        <ScheduleEditor
          initial={scheduleEditor === 'create' ? undefined : scheduleEditor}
          courseName={scheduleEditor === 'create' ? availableCourses.find((course) => course.id === activeCourseId)?.title : undefined}
          teachers={teachers}
          teachersLoading={teacherResource.status === 'loading'}
          teachersError={teacherResource.status === 'error' || teacherResource.status === 'forbidden' ? teacherStatusMessage : undefined}
          busy={mutationBusy}
          errorMessage={mutationError}
          onClose={() => {
            setScheduleEditor(null)
            setMutationError('')
          }}
          onSave={saveSchedule}
        />
      )}

      {classSessionEditor && (
        <ClassSessionEditor
          session={classSessionEditor}
          busy={mutationBusy}
          errorMessage={mutationError}
          onClose={() => {
            setClassSessionEditor(null)
            setMutationError('')
          }}
          onSave={saveClassSession}
        />
      )}

      {recurringEditor !== null && (
        <RecurringClassEditor
          key={recurringEditor === 'create' ? 'create' : recurringEditor.id}
          initial={recurringEditor === 'create' ? undefined : recurringEditor}
          teachers={teachers}
          sections={courseSections}
          sectionsLoading={courseDetails.status === 'loading'}
          disabledReason={recurringEditor === 'create' ? recurringCreateDisabledReason : ''}
          outcomeUnknown={recurringEditor === 'create' && recurringCreateUnknown}
          busy={mutationBusy}
          errorMessage={mutationError}
          onClose={() => {
            setRecurringEditor(null)
            setMutationError('')
          }}
          onSave={(payload) => void saveRecurringClass(payload)}
        />
      )}

      {deleteSchedule && (
        <ConfirmDialog
          title="Hủy lịch học?"
          description="Chỉ lịch này bị hủy."
          cancelLabel="Quay lại"
          confirmLabel="Hủy lịch"
          variant="danger"
          busy={mutationBusy}
          onCancel={() => setDeleteSchedule(null)}
          onConfirm={deleteOneSchedule}
        />
      )}
      {cancelSeries && (
        <ConfirmDialog
          title="Hủy toàn bộ chuỗi lịch lặp?"
          description={<>Chuỗi “{cancelSeries.title}” và mọi buổi thuộc chuỗi sẽ bị hủy.</>}
          cancelLabel="Giữ lại"
          confirmLabel="Hủy cả chuỗi"
          variant="danger"
          busy={mutationBusy}
          onCancel={() => setCancelSeries(null)}
          onConfirm={cancelRecurringSeries}
        />
      )}
      {cancelSession && (
        <ConfirmDialog
          title="Hủy buổi học này?"
          description={<>Buổi “{cancelSession.title}” sẽ chuyển sang trạng thái đã hủy. Chuỗi lịch lặp không bị ảnh hưởng.</>}
          cancelLabel="Giữ lại"
          confirmLabel="Hủy buổi"
          variant="danger"
          busy={mutationBusy}
          onCancel={() => setCancelSession(null)}
          onConfirm={cancelOneSession}
        />
      )}
      {unsavedGuard.hasPendingAction && (
        <ConfirmDialog
          title="Bỏ thay đổi chưa lưu?"
          description="Điểm danh vừa chỉnh chưa được lưu."
          cancelLabel="Tiếp tục chỉnh sửa"
          confirmLabel="Bỏ thay đổi"
          variant="danger"
          onCancel={unsavedGuard.cancelDiscard}
          onConfirm={unsavedGuard.confirmDiscard}
        />
      )}
    </div>
  )
}

function RecurringSeriesRow({
  series,
  onEdit,
  onCancel,
}: {
  series: RecurringClassResponse
  onEdit: () => void
  onCancel: () => void
}) {
  const overriddenCount = series.sessions.filter((session) => session.overridden).length
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-background p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium text-text-primary">{series.title}</h3>
          <ScheduleStatusBadge status={series.status} />
        </div>
        <p className="mt-1 text-sm text-text-tertiary">
          {series.teacherName} · {weekdayLabels[series.dayOfWeek] ?? series.dayOfWeek} · {series.startTime.slice(0, 5)}–{series.endTime.slice(0, 5)}
          {series.sectionTitle ? ' · ' + series.sectionTitle : ''}
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          {localDateLabel(series.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}
          {' – '}{localDateLabel(series.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}{series.sessions.length} buổi
          {overriddenCount ? ' (' + overriddenCount + ' buổi đã sửa riêng)' : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" appearance="outline" onClick={onEdit}>
          <Pencil size={14} />
          Sửa chuỗi
        </Button>
        <Button size="sm" variant="danger" appearance="outline" onClick={onCancel}>
          <Trash2 size={14} />
          Hủy cả chuỗi
        </Button>
      </div>
    </article>
  )
}
