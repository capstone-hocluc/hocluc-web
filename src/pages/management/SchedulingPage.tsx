import { useMemo, useState } from 'react'
import { CalendarPlus, Info, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import type { Course } from '../../services/courseService'
import { getMainCourses } from '../../services/courseService'
import { getUsers, type UserSummary } from '../../services/userService'
import { cancelRecurringClass, getCourseRecurringClasses } from '../../services/recurringClassService'
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
  CreateScheduleRequest,
  RecurringClassResponse,
  DayOfWeek,
  ScheduleCalendarItem,
  ScheduleResponse,
  UpdateClassSessionRequest,
  UpdateScheduleRequest,
} from '../../types/scheduling'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import DropdownField from '../../components/ui/DropdownField'
import Notice from '../../components/ui/Notice'
import PageHeading from '../../components/ui/PageHeading'
import ScheduleCalendar from '../../components/scheduling/ScheduleCalendar'
import ScheduleDetailsSheet from '../../components/scheduling/ScheduleDetailsSheet'
import ScheduleFilters, { type ScheduleViewMode } from '../../components/scheduling/ScheduleFilters'
import ScheduleList from '../../components/scheduling/ScheduleList'
import ScheduleResourceState from '../../components/scheduling/ScheduleResourceState'
import ScheduleStatusBadge from '../../components/scheduling/ScheduleStatusBadge'
import ClassSessionRecordingsPanel from '../../components/scheduling/ClassSessionRecordingsPanel'
import ScheduleAttendancePanel from '../../components/scheduling/ScheduleAttendancePanel'
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
  const [recurringEditorOpen, setRecurringEditorOpen] = useState(false)
  const [cancelSeries, setCancelSeries] = useState<RecurringClassResponse | null>(null)
  const [deleteSchedule, setDeleteSchedule] = useState<ScheduleResponse | null>(null)
  const [mutationBusy, setMutationBusy] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [notice, setNotice] = useState('')
  const [attendancePanelState, setAttendancePanelState] = useState({ dirty: false, busy: false })
  const unsavedGuard = useUnsavedActionGuard(
    attendancePanelState.dirty,
    attendancePanelState.busy || mutationBusy
  )

  const courses = useScheduleResource('management-main-courses', loadMainCourses)
  const teacherResource = useScheduleResource(role === 'STAFF' ? 'management-teachers' : null, loadTeachers)
  const availableCourses = courses.data ?? []
  const activeCourseId = courseId || availableCourses[0]?.id || ''
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
  const courseSourceWarning =
    'Danh sách chỉ gồm các khóa học đang công khai và mở. Nhân viên có thể tạo lịch đơn trong nhóm này; khóa chưa mở hoặc đã kết thúc không xuất hiện. Giáo viên cần được phân công cho khóa trước khi tạo lịch.'
  const recurringSourceWarning =
    'Tạo lịch lặp tạm thời chưa khả dụng vì hệ thống chưa có danh sách lớp để chọn cho khóa học này.'

  const changeCourse = (nextCourseId: string | null) => {
    runWithUnsavedActionGuard(() => {
      setCourseId(nextCourseId ?? '')
      setSelectedItem(null)
      setScheduleEditor(null)
      setClassSessionEditor(null)
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
  const scheduleCreateLoading = courses.status === 'loading' || teacherResource.status === 'loading'

  return (
    <div className="hl-scheduling space-y-5">
      <PageHeading
        eyebrow={role === 'STAFF' ? 'NHÂN SỰ VẬN HÀNH' : 'QUẢN LÝ'}
        title="Lịch học"
        subtitle="Chọn khóa học để xem lịch đơn và các buổi học thuộc chuỗi."
      />

      <div className="flex flex-wrap justify-end gap-2">
        {role === 'STAFF' && (
          <Button
            appearance="outline"
            className="max-[767px]:min-h-11"
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
        <Button appearance="outline" className="max-[767px]:min-h-11" disabled title={recurringSourceWarning} onClick={() => setRecurringEditorOpen(true)}>
          <CalendarPlus size={16} />
          Tạo lịch lặp
        </Button>
        <Button appearance="ghost" size="icon" className="max-[767px]:size-11" aria-label="Tải lại lịch" onClick={() => {
          runWithUnsavedActionGuard(() => {
            setSelectedItem(null)
            calendar.reload()
          })
        }} disabled={mutationBusy || attendancePanelState.busy}>
          <RefreshCw size={17} />
        </Button>
      </div>

      <Notice tone="warning">
        <Info size={17} aria-hidden="true" />
        {courseSourceWarning} Lịch lặp và đề xuất hiện chưa khả dụng; bạn vẫn xem được các lịch đã tạo.
      </Notice>
      {(attendancePanelState.busy || mutationBusy) && (
        <Notice tone="info">Đang lưu dữ liệu. Hãy đợi hoàn tất trước khi rời trang.</Notice>
      )}
      {(courses.status === 'error' || courses.status === 'forbidden') && (
        <Notice tone={courses.status === 'forbidden' ? 'warning' : 'danger'}>
          Không tải được danh sách khóa học.
          <Button size="sm" appearance="outline" className="max-[767px]:min-h-11" onClick={courses.reload}>Thử lại</Button>
        </Notice>
      )}
      {courses.status === 'ready' && availableCourses.length === 0 && (
        <Notice tone="warning">Chưa có khóa học đang mở để tạo lịch đơn.</Notice>
      )}

      {teacherStatusMessage && <Notice tone={teacherResource.status === 'forbidden' ? 'warning' : 'danger'}>{teacherStatusMessage}</Notice>}
      {mutationError && <Notice tone="danger">{mutationError}</Notice>}
      {notice && <Notice tone="info">{notice}</Notice>}

      <section className="rounded-2xl border border-border-subtle bg-surface p-3 sm:p-4">
        <label className="block max-w-xl text-sm font-medium text-text-heading">
          Khóa học
          <div className="mt-2">
            <DropdownField
              contentClassName="hl-scheduling"
              ariaLabel="Chọn khóa học để xem lịch"
              options={courseOptions}
              mobileTouchTargets
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
            emptyMessage={query.trim() ? 'Không tìm thấy lịch phù hợp trong tuần đã chọn.' : 'Chưa có lịch đơn hoặc buổi học thuộc chuỗi trong tuần đã chọn.'}
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
                <h2 className="text-base font-semibold text-text-heading">Chuỗi lịch lặp</h2>
                <p className="mt-1 text-sm text-text-muted">Hủy một chuỗi sẽ hủy toàn bộ các buổi thuộc chuỗi đó.</p>
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
                  <RecurringSeriesRow key={series.id} series={series} onCancel={() => setCancelSeries(series)} />
                ))}
              </div>
            </ScheduleResourceState>
          </section>
          <TimetableProposalPanel />
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
          <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
            {selectedItem.kind === 'schedule' && role === 'STAFF' && (
              <>
                <Button
                  appearance="outline"
                  className="max-[767px]:min-h-11"
                  onClick={() => runWithUnsavedActionGuard(() => {
                    setScheduleEditor(selectedItem.item)
                    setSelectedItem(null)
                  })}
                >
                  <Pencil size={15} />
                  Sửa lịch
                </Button>
                <Button variant="danger" appearance="outline" className="max-[767px]:min-h-11" onClick={() => runWithUnsavedActionGuard(() => {
                  setDeleteSchedule(selectedItem.item)
                  setSelectedItem(null)
                })}>
                  <Trash2 size={15} />
                  Hủy lịch
                </Button>
              </>
            )}
            {selectedItem.kind === 'classSession' && (
              <Button
                appearance="outline"
                className="max-[767px]:min-h-11"
                onClick={() => runWithUnsavedActionGuard(() => {
                  setClassSessionEditor(selectedItem.item)
                  setSelectedItem(null)
                })}
              >
                <Pencil size={15} />
                Sửa buổi học
              </Button>
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

      {recurringEditorOpen && (
        <RecurringClassEditor
          teachers={teachers}
          disabledReason={recurringSourceWarning}
          busy={mutationBusy}
          errorMessage={mutationError}
          onClose={() => setRecurringEditorOpen(false)}
          onSave={() => setRecurringEditorOpen(false)}
        />
      )}

      {deleteSchedule && (
        <ConfirmDialog
          contentClassName="hl-scheduling"
          title="Hủy lịch học?"
          description="Lịch này sẽ bị hủy. Các lịch khác của khóa học không bị ảnh hưởng."
          cancelLabel="Quay lại"
          confirmLabel="Hủy lịch"
          variant="danger"
          mobileTouchTargets
          busy={mutationBusy}
          onCancel={() => setDeleteSchedule(null)}
          onConfirm={deleteOneSchedule}
        />
      )}
      {cancelSeries && (
        <ConfirmDialog
          contentClassName="hl-scheduling"
          title="Hủy toàn bộ chuỗi lịch lặp?"
          description={<>Chuỗi “{cancelSeries.title}” và tất cả buổi học thuộc chuỗi sẽ bị hủy. Không thể chỉ hủy riêng một buổi trong chuỗi.</>}
          cancelLabel="Giữ lại"
          confirmLabel="Hủy cả chuỗi"
          variant="danger"
          mobileTouchTargets
          busy={mutationBusy}
          onCancel={() => setCancelSeries(null)}
          onConfirm={cancelRecurringSeries}
        />
      )}
      {unsavedGuard.hasPendingAction && (
        <ConfirmDialog
          contentClassName="hl-scheduling"
          title="Bỏ thay đổi điểm danh chưa lưu?"
          description="Các trạng thái bạn vừa chỉnh chưa được gửi lên máy chủ. Nếu rời buổi học, những thay đổi này sẽ bị bỏ."
          cancelLabel="Tiếp tục chỉnh sửa"
          confirmLabel="Bỏ thay đổi"
          variant="danger"
          mobileTouchTargets
          onCancel={unsavedGuard.cancelDiscard}
          onConfirm={unsavedGuard.confirmDiscard}
        />
      )}
    </div>
  )
}

function RecurringSeriesRow({
  series,
  onCancel,
}: {
  series: RecurringClassResponse
  onCancel: () => void
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-text-heading">{series.title}</h3>
          <ScheduleStatusBadge status={series.status} />
        </div>
        <p className="mt-1 text-sm text-text-muted">
          {series.teacherName} · {weekdayLabels[series.dayOfWeek] ?? series.dayOfWeek} · {series.startTime.slice(0, 5)}–{series.endTime.slice(0, 5)}
          {series.sectionTitle ? ' · ' + series.sectionTitle : ''}
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {localDateLabel(series.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}
          {' – '}{localDateLabel(series.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}{series.sessions.length} buổi
        </p>
      </div>
      <Button size="sm" variant="danger" appearance="outline" className="max-[767px]:min-h-11" onClick={onCancel}>
        <Trash2 size={14} />
        Hủy cả chuỗi
      </Button>
    </article>
  )
}
