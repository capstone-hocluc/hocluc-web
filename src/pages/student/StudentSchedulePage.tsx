import { useMemo, useState } from 'react'
import { CalendarDays, Info } from 'lucide-react'
import type { ScheduleCalendarItem } from '../../types/scheduling'
import { getMyCourses, type MyCourseEnrollment } from '../../services/courseService'
import { getStudentSchedules } from '../../services/scheduleService'
import { getMyCourseAttendance } from '../../services/attendanceService'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import {
  addLocalDays,
  filterScheduleItemsToInstantRange,
  localDateTimeToInstant,
  localToday,
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

function responseData<T>(response: { data?: T }, message: string): T {
  if (response.data === undefined || response.data === null) throw new Error(message)
  return response.data
}

function getWeekRange(date: string) {
  const start = startOfLocalWeek(date)
  const end = addLocalDays(start, 7)
  return {
    startDate: localDateTimeToInstant(start, 0, 0),
    endDate: localDateTimeToInstant(end, 0, 0),
  }
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

  const scheduleRange = useMemo(() => getWeekRange(date), [date])
  const schedules = useScheduleResource(
    'student-schedules:' + scheduleRange.startDate + ':' + scheduleRange.endDate,
    () => getStudentSchedules(scheduleRange)
  )

  const availableCourses = courses.data ?? []
  const activeCourseId = courseId || (availableCourses[0] ? courseIdOf(availableCourses[0]) : '')
  const attendance = useScheduleResource(
    activeCourseId ? 'student-attendance:' + activeCourseId : null,
    () => getMyCourseAttendance(activeCourseId)
  )

  const items = useMemo<ScheduleCalendarItem[]>(
    () => filterScheduleItemsToInstantRange(
      (schedules.data ?? []).map((item) => ({ kind: 'schedule', sourceId: item.id, item })),
      scheduleRange
    ),
    [scheduleRange, schedules.data]
  )
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi-VN')
    const scoped = sortScheduleItems(items)
    if (!normalized) return scoped
    return scoped.filter((item) =>
      (item.item.title + ' ' + (item.kind === 'schedule' ? item.item.courseName : '')).toLocaleLowerCase('vi-VN').includes(normalized)
    )
  }, [items, query])
  const changeDate = (nextDate: string) => {
    setDate(nextDate)
    setSelectedItem(null)
  }

  const courseOptions = availableCourses.map((enrollment) => ({
    id: courseIdOf(enrollment),
    label: enrollment.course.title,
  }))

  return (
    <StudentPageContainer width="wide" className="hl-scheduling space-y-5">
      <StudentPageHeader
        className="mb-0"
        title="Lịch học"
        description="Theo dõi các lịch học đã đăng ký trong tài khoản của bạn."
        actions={
          <Button appearance="outline" className="max-[767px]:min-h-11" onClick={() => {
            setSelectedItem(null)
            schedules.reload()
          }}>
            <CalendarDays size={16} />
            Tải lại
          </Button>
        }
      />

      <Notice tone="info">
        <Info size={17} aria-hidden="true" />
        Một số buổi thuộc chuỗi chưa hiển thị trong lịch này. Chúng sẽ xuất hiện khi quyền truy cập lớp học được xác nhận.
      </Notice>

      <ScheduleFilters
        date={date}
        onDateChange={changeDate}
        query={query}
        onQueryChange={setQuery}
        view={view}
        onViewChange={setView}
      />

      <ScheduleResourceState
        status={schedules.status}
        errorMessage={schedules.errorMessage}
        empty={!filteredItems.length}
        emptyMessage={query.trim() ? 'Không tìm thấy lịch phù hợp trong tuần này.' : 'Bạn chưa có lịch học trong tuần này.'}
        onRetry={schedules.reload}
      >
        {view === 'agenda' ? (
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

      <Card as="section" padding="lg" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-heading">Chuyên cần</h2>
          <p className="mt-1 text-sm text-text-muted">Tổng số buổi, trạng thái và tỷ lệ chuyên cần theo khóa học.</p>
        </div>
        <Notice tone="warning">
          Tỷ lệ = (có mặt + 0,8 × đi muộn) ÷ tổng số buổi. Tổng số hiện có thể bao gồm cả buổi học trong tương lai.
        </Notice>
        {(courses.status === 'error' || courses.status === 'forbidden') && (
          <Notice tone={courses.status === 'forbidden' ? 'warning' : 'danger'}>
            Không tải được khóa học đã ghi danh.
            <button
              type="button"
              className="max-[767px]:min-h-11 rounded-lg border border-border-primary px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring"
              onClick={courses.reload}
            >
              Thử lại
            </button>
          </Notice>
        )}
        <DropdownField
          contentClassName="hl-scheduling"
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
              <AttendanceMetric label="Chuyên cần" value={attendance.data.attendanceRate.toFixed(1) + '%'} />
              <AttendanceMetric label="Tổng số buổi" value={attendance.data.totalSchedules} />
              <AttendanceMetric label="Có mặt" value={attendance.data.presentCount} />
              <AttendanceMetric label="Đi muộn" value={attendance.data.lateCount} />
              <AttendanceMetric label="Vắng" value={attendance.data.absentCount} />
              <AttendanceMetric label="Có phép" value={attendance.data.excusedCount} />
            </div>
          )}
        </ScheduleResourceState>
      </Card>

      <ScheduleDetailsSheet item={selectedItem} onClose={() => setSelectedItem(null)} timezone={SCHEDULING_TIMEZONE} />
    </StudentPageContainer>
  )
}

function AttendanceMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-surface-soft p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-text-heading">{value}</p>
    </div>
  )
}
