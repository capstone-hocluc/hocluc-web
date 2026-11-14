import { useMemo, useState } from 'react'
import { matchesSearch } from '../../lib/search'
import { CalendarDays } from '../../components/console/icons'
import { ApiError } from '../../lib/api'
import type {
  AttendanceResponse,
  AttendanceStatus,
  ClassSessionResponse,
  ScheduleCalendarItem,
} from '../../types/scheduling'
import { getMyCourses, type MyCourseEnrollment } from '../../services/courseService'
import { getStudentSchedules } from '../../services/scheduleService'
import { getCourseClassSessions } from '../../services/classSessionService'
import { getClassSessionRecordings } from '../../services/classSessionRecordingService'
import { getMyAttendanceForSchedule, getMyCourseAttendance } from '../../services/attendanceService'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import {
  addLocalDays,
  filterScheduleItemsToInstantRange,
  itemSubtitle,
  localDateTimeToInstant,
  localToday,
  safeExternalUrl,
  sortScheduleItems,
  startOfLocalWeek,
  SCHEDULING_TIMEZONE,
} from '../../lib/scheduling'
import Card from '../../components/ui/Card'
import DropdownField from '../../components/ui/DropdownField'
import Notice from '../../components/ui/Notice'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import Button from '../../components/ui/Button'
import ScheduleCalendar from '../../components/scheduling/ScheduleCalendar'
import ScheduleDetailsSheet from '../../components/scheduling/ScheduleDetailsSheet'
import ScheduleFilters, { type ScheduleViewMode } from '../../components/scheduling/ScheduleFilters'
import ScheduleList from '../../components/scheduling/ScheduleList'
import ScheduleResourceState from '../../components/scheduling/ScheduleResourceState'
import StatusBadge from '../../components/ui/StatusBadge'

function responseData<T>(response: { data?: T }, message: string): T {
  if (response.data === undefined || response.data === null) throw new Error(message)
  return response.data
}

function getWeekRange(start: string) {
  const end = addLocalDays(start, 7)
  return {
    startDate: localDateTimeToInstant(start, 0, 0),
    endDate: localDateTimeToInstant(end, 0, 0),
  }
}

async function loadCourseSessions(courseIds: string[], startDate: string) {
  // This endpoint takes inclusive local dates, unlike the weekly schedule endpoint.
  const range = { startDate, endDate: addLocalDays(startDate, 6) }
  const results = await Promise.allSettled(courseIds.map((id) => getCourseClassSessions(id, range)))
  const sessions = new Map<string, ClassSessionResponse>()
  let incomplete = false
  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const session of result.value) sessions.set(session.id, session)
    } else {
      const error: unknown = result.reason
      const noAccess = error instanceof ApiError && error.status === 403 && error.code === 'COURSE_NOT_PURCHASED'
      incomplete ||= !noAccess
    }
  }
  return { sessions: [...sessions.values()], incomplete }
}

function courseIdOf(enrollment: MyCourseEnrollment) {
  return enrollment.course.id
}

export default function StudentSchedulePage() {
  const [date, setDate] = useState(localToday())
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ScheduleViewMode>('agenda')
  const [selectedItem, setSelectedItem] = useState<ScheduleCalendarItem | null>(null)
  const [courseId, setCourseId] = useState('')

  const courses = useScheduleResource('student-enrolled-courses', async () => {
    const response = await getMyCourses()
    return responseData(response, 'Không thể tải danh sách khóa học của bạn.')
  })

  const weekStart = startOfLocalWeek(date)
  const scheduleRange = useMemo(() => getWeekRange(weekStart), [weekStart])
  const schedules = useScheduleResource(
    'student-schedules:' + scheduleRange.startDate + ':' + scheduleRange.endDate,
    () => getStudentSchedules(scheduleRange)
  )
  const courseNames = useMemo(
    () => new Map(courses.data?.map(({ course }) => [course.id, course.title])),
    [courses.data]
  )
  const courseIds = [...courseNames.keys()].sort()
  const classSessions = useScheduleResource(
    courseIds.length ? `student-class-sessions:${weekStart}:${courseIds.join(',')}` : null,
    () => loadCourseSessions(courseIds, weekStart)
  )

  const availableCourses = courses.data ?? []
  const activeCourseId = courseNames.has(courseId) ? courseId : availableCourses[0]?.course.id ?? ''
  const attendance = useScheduleResource(
    activeCourseId ? 'student-attendance:' + activeCourseId : null,
    () => getMyCourseAttendance(activeCourseId)
  )

  const items = useMemo<ScheduleCalendarItem[]>(
    () =>
      filterScheduleItemsToInstantRange(
        [
          ...(schedules.data ?? []).map((item) => ({ kind: 'schedule' as const, sourceId: item.id, item })),
          ...(classSessions.data?.sessions ?? []).map((item) => ({
            kind: 'classSession' as const, sourceId: item.id, item, courseName: courseNames.get(item.courseId),
          })),
        ],
        scheduleRange
      ),
    [scheduleRange, schedules.data, classSessions.data, courseNames]
  )
  const filteredItems = useMemo(() => {
    const scoped = sortScheduleItems(items)
    return scoped.filter((item) => matchesSearch(query, item.item.title, itemSubtitle(item)))
  }, [items, query])
  const calendarLoading = schedules.status === 'loading' || courses.status === 'loading' || classSessions.status === 'loading'
  const calendarIncomplete = [schedules.status, courses.status, classSessions.status].some(
    (status) => status === 'error' || status === 'forbidden' || status === 'not-found'
  ) || classSessions.data?.incomplete
  const reloadCalendar = () => {
    setSelectedItem(null)
    schedules.reload()
    courses.reload()
    classSessions.reload()
  }
  const changeDate = (nextDate: string) => {
    setDate(nextDate)
    setSelectedItem(null)
  }

  const courseOptions = availableCourses.map((enrollment) => ({
    id: courseIdOf(enrollment),
    label: enrollment.course.title,
  }))

  return (
    <StudentPageContainer width="wide" className="space-y-6">
      <StudentPageHeader
        title="Lịch học"
        description="Theo dõi các lịch học đã đăng ký trong tài khoản của bạn."
        actions={
          <Button
            appearance="outline"
            className="max-[767px]:min-h-11"
            onClick={reloadCalendar}
          >
            <CalendarDays size={16} />
            Tải lại
          </Button>
        }
      />

      <ScheduleFilters
        date={date}
        onDateChange={changeDate}
        query={query}
        onQueryChange={setQuery}
        view={view}
        onViewChange={setView}
      />

      {calendarIncomplete && (
        <Notice tone="warning" className="flex-wrap justify-between gap-3">
          Chưa tải được đầy đủ lịch học.
          <Button size="sm" appearance="outline" onClick={reloadCalendar}>Thử tải lại lịch</Button>
        </Notice>
      )}
      <ScheduleResourceState
        status={calendarLoading && !filteredItems.length ? 'loading' : 'ready'}
        empty={!filteredItems.length && !calendarIncomplete}
        emptyMessage={
          query.trim()
            ? 'Không tìm thấy lịch phù hợp trong tuần này.'
            : 'Bạn chưa có lịch học trong tuần này.'
        }
      >
        {!filteredItems.length ? null : view === 'agenda' ? (
          <ScheduleList items={filteredItems} onSelect={setSelectedItem} />
        ) : (
          <ScheduleCalendar
            items={filteredItems}
            date={date}
            onDateChange={changeDate}
            onSelect={setSelectedItem}
          />
        )}
      </ScheduleResourceState>

      <Card as="section" variant="elevated" radius="xl" padding="lg" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.3px] text-text-heading">Chuyên cần</h2>
          <p className="mt-1 text-[15px] text-text-body">
            Tổng số buổi, trạng thái và tỷ lệ chuyên cần theo khóa học.
          </p>
        </div>
        <Notice tone="warning">
          Tỷ lệ = (có mặt + 0,8 × đi muộn) ÷ tổng số buổi. Tổng số hiện có thể bao gồm cả buổi học
          trong tương lai.
        </Notice>
        {(courses.status === 'error' || courses.status === 'forbidden') && (
          <Notice tone={courses.status === 'forbidden' ? 'warning' : 'danger'}>
            Không tải được khóa học đã ghi danh.
            <Button
              size="sm"
              appearance="outline"
              className="max-[767px]:min-h-11"
              onClick={courses.reload}
            >
              Thử lại
            </Button>
          </Notice>
        )}
        <DropdownField
          ariaLabel="Chọn khóa học để xem chuyên cần"
          options={courseOptions}
          mobileTouchTargets
          value={activeCourseId || null}
          onChange={(next) => setCourseId(next ?? '')}
          isSearchable
          searchPlaceholder="Tìm khóa học…"
          isLoading={courses.status === 'loading'}
          isError={courses.status === 'error' || courses.status === 'forbidden'}
          errorMessage="Không thể tải các khóa học đã ghi danh."
          emptyMessage="Bạn chưa có khóa học để chọn."
          placeholder="Chọn khóa học"
        />
        <ScheduleResourceState
          status={activeCourseId ? attendance.status : 'idle'}
          errorMessage={attendance.errorMessage}
          empty={false}
          onRetry={attendance.reload}
        >
          {attendance.data && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <AttendanceMetric
                label="Chuyên cần"
                value={attendance.data.attendanceRate.toFixed(1) + '%'}
              />
              <AttendanceMetric label="Tổng số buổi" value={attendance.data.totalSchedules} />
              <AttendanceMetric label="Có mặt" value={attendance.data.presentCount} />
              <AttendanceMetric label="Đi muộn" value={attendance.data.lateCount} />
              <AttendanceMetric label="Vắng" value={attendance.data.absentCount} />
              <AttendanceMetric label="Có phép" value={attendance.data.excusedCount} />
            </div>
          )}
        </ScheduleResourceState>
      </Card>

      <ScheduleDetailsSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        timezone={SCHEDULING_TIMEZONE}
        body={
          selectedItem?.kind === 'schedule' ? (
            <StudentScheduleAttendancePanel
              key={selectedItem.item.id}
              scheduleId={selectedItem.item.id}
            />
          ) : selectedItem?.kind === 'classSession' ? (
            <StudentSessionRecordings key={selectedItem.item.id} sessionId={selectedItem.item.id} />
          ) : undefined
        }
      />
    </StudentPageContainer>
  )
}

function StudentSessionRecordings({ sessionId }: { sessionId: string }) {
  const recordings = useScheduleResource(`student-class-session-recordings:${sessionId}`, () => getClassSessionRecordings(sessionId))
  return (
    <ScheduleResourceState status={recordings.status} errorMessage={recordings.errorMessage}
      empty={!recordings.data?.length} emptyMessage="Buổi học chưa có bản ghi." onRetry={recordings.reload}>
      <ul className="space-y-2">
        {recordings.data?.map((record) => {
          const url = safeExternalUrl(record.streamUrl) ?? safeExternalUrl(record.videoUrl)
          return (
            <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-card p-3">
              <span className="min-w-0 break-words text-sm font-semibold text-text-heading">{record.title}</span>
              {url ? (
                <Button asChild size="sm" appearance="outline">
                  <a href={url} target="_blank" rel="noreferrer">Xem bản ghi</a>
                </Button>
              ) : <span className="text-sm text-text-muted">Chưa có link xem</span>}
            </li>
          )
        })}
      </ul>
    </ScheduleResourceState>
  )
}

function AttendanceMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line-card bg-surface-brand p-3.5">
      <p className="text-[13px] font-bold text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-[-0.4px] text-text-heading">{value}</p>
    </div>
  )
}

const attendancePresentation: Record<
  AttendanceStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'info' }
> = {
  PRESENT: { label: 'Có mặt', tone: 'success' },
  ABSENT: { label: 'Vắng mặt', tone: 'danger' },
  LATE: { label: 'Đi muộn', tone: 'warning' },
  EXCUSED: { label: 'Có phép', tone: 'info' },
}

function formatAttendanceTime(value?: string | null) {
  if (!value) return null
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return null
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SCHEDULING_TIMEZONE,
  }).format(instant)
}

function StudentScheduleAttendancePanel({ scheduleId }: { scheduleId: string }) {
  const attendance = useScheduleResource('student-schedule-attendance:' + scheduleId, () =>
    getMyAttendanceForSchedule(scheduleId)
  )
  const record = attendance.data

  return (
    <section className="space-y-3">
      {attendance.status === 'not-found' ? (
        <Notice tone="info">Chưa có ghi nhận điểm danh cho buổi học này.</Notice>
      ) : (
        <ScheduleResourceState
          status={attendance.status}
          errorMessage={attendance.errorMessage}
          empty={!record}
          emptyMessage="Chưa có ghi nhận điểm danh cho buổi học này."
          onRetry={attendance.reload}
        >
          {record && <AttendanceDetail record={record} />}
        </ScheduleResourceState>
      )}
    </section>
  )
}

function AttendanceDetail({ record }: { record: AttendanceResponse }) {
  const presentation = attendancePresentation[record.status]
  const joinedAt = formatAttendanceTime(record.joinedAt)
  const leftAt = formatAttendanceTime(record.leftAt)

  return (
    <dl className="grid gap-3 rounded-xl border border-line-card bg-surface-brand p-3.5 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-[13px] font-bold text-text-muted">Trạng thái</dt>
        <dd className="mt-1">
          <StatusBadge tone={presentation.tone} size="sm">
            {presentation.label}
          </StatusBadge>
        </dd>
      </div>
      {record.attendanceMinutes != null && (
        <div>
          <dt className="text-[13px] font-bold text-text-muted">Thời gian tham gia</dt>
          <dd className="mt-1 font-semibold text-text-heading">{record.attendanceMinutes} phút</dd>
        </div>
      )}
      {joinedAt && (
        <div>
          <dt className="text-[13px] font-bold text-text-muted">Tham gia lúc</dt>
          <dd className="mt-1 font-semibold text-text-heading">{joinedAt}</dd>
        </div>
      )}
      {leftAt && (
        <div>
          <dt className="text-[13px] font-bold text-text-muted">Rời buổi học lúc</dt>
          <dd className="mt-1 font-semibold text-text-heading">{leftAt}</dd>
        </div>
      )}
    </dl>
  )
}
