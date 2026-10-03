import { useMemo, useState } from 'react'
import { CalendarDays, Info } from 'lucide-react'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { getTeachingSchedules } from '../../services/scheduleService'
import { getTeacherClassSessions } from '../../services/classSessionService'
import { runWithUnsavedActionGuard, useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'
import type { ScheduleCalendarItem } from '../../types/scheduling'
import {
  addLocalDays,
  filterScheduleItemsToInstantRange,
  itemSubtitle,
  localDateTimeToInstant,
  localToday,
  sortScheduleItems,
  startOfLocalWeek,
} from '../../lib/scheduling'
import Notice from '../../components/ui/Notice'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import TeacherPageHeader from '../../components/teacher/TeacherPageHeader'
import Button from '../../components/ui/Button'
import ScheduleCalendar from '../../components/scheduling/ScheduleCalendar'
import ScheduleDetailsSheet from '../../components/scheduling/ScheduleDetailsSheet'
import ScheduleFilters, { type ScheduleViewMode } from '../../components/scheduling/ScheduleFilters'
import ScheduleList from '../../components/scheduling/ScheduleList'
import ScheduleResourceState from '../../components/scheduling/ScheduleResourceState'
import ClassSessionRecordingsPanel from '../../components/scheduling/ClassSessionRecordingsPanel'
import ScheduleAttendancePanel from '../../components/scheduling/ScheduleAttendancePanel'

export default function TeacherSchedulePage() {
  const { profile } = useCurrentUser()
  const [date, setDate] = useState(localToday())
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ScheduleViewMode>('agenda')
  const [selectedItem, setSelectedItem] = useState<ScheduleCalendarItem | null>(null)
  const [attendancePanelState, setAttendancePanelState] = useState({ dirty: false, busy: false })
  const weekStart = startOfLocalWeek(date)
  const weekEnd = addLocalDays(weekStart, 7)
  const range = {
    startDate: localDateTimeToInstant(weekStart, 0, 0),
    endDate: localDateTimeToInstant(weekEnd, 0, 0),
  }
  const resource = useScheduleResource(
    profile?.id ? 'teacher-schedule:' + profile.id + ':' + weekStart : null,
    async () => {
      if (!profile?.id) throw new Error('Không xác định được tài khoản giáo viên.')
      const [schedules, sessions] = await Promise.all([
        getTeachingSchedules(range),
        getTeacherClassSessions(profile.id, range),
      ])
      const items = [
        ...schedules.map((item) => ({ kind: 'schedule' as const, sourceId: item.id, item })),
        ...sessions.map((item) => ({ kind: 'classSession' as const, sourceId: item.id, item })),
      ] satisfies ScheduleCalendarItem[]
      return filterScheduleItemsToInstantRange(items, range)
    }
  )
  const unsavedGuard = useUnsavedActionGuard(attendancePanelState.dirty, attendancePanelState.busy)
  const items = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('vi-VN')
    const sorted = sortScheduleItems(resource.data ?? [])
    return text
      ? sorted.filter((item) => (item.item.title + ' ' + itemSubtitle(item)).toLocaleLowerCase('vi-VN').includes(text))
      : sorted
  }, [query, resource.data])
  const changeDate = (nextDate: string) => {
    runWithUnsavedActionGuard(() => {
      setDate(nextDate)
      setSelectedItem(null)
    })
  }
  const selectItem = (item: ScheduleCalendarItem) => {
    if (selectedItem?.kind === item.kind && selectedItem.sourceId === item.sourceId) return
    runWithUnsavedActionGuard(() => setSelectedItem(item))
  }
  const closeDetails = () => setSelectedItem(null)

  return (
    <div className="hl-scheduling space-y-5">
      <TeacherPageHeader
        eyebrow="GIẢNG DẠY"
        title="Lịch dạy"
        description="Lịch dạy gồm lịch đơn và các buổi học thuộc chuỗi."
        actions={<Button appearance="outline" className="max-[767px]:min-h-11" disabled={attendancePanelState.busy} onClick={() => runWithUnsavedActionGuard(() => {
          setSelectedItem(null)
          resource.reload()
        })}><CalendarDays size={16} />Tải lại</Button>}
      />
      <Notice tone="info">
        <Info size={17} aria-hidden="true" />
        Lịch được tải theo tài khoản giáo viên đang đăng nhập. Chỉ lịch đơn có danh sách điểm danh.
      </Notice>
      {attendancePanelState.busy && (
        <Notice tone="info">Đang lưu điểm danh. Hãy đợi hoàn tất trước khi rời trang.</Notice>
      )}
      <ScheduleFilters
        date={date}
        onDateChange={changeDate}
        query={query}
        onQueryChange={setQuery}
        view={view}
        onViewChange={setView}
      />
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        empty={!items.length}
        emptyMessage={query.trim() ? 'Không tìm thấy lịch phù hợp trong tuần này.' : 'Bạn chưa có lịch dạy trong tuần này.'}
        onRetry={resource.reload}
      >
        {view === 'agenda' ? (
          <ScheduleList items={items} onSelect={selectItem} />
        ) : (
          <ScheduleCalendar items={items} date={date} onDateChange={changeDate} onSelect={selectItem} />
        )}
      </ScheduleResourceState>
      <ScheduleDetailsSheet
        item={selectedItem}
        onClose={closeDetails}
        body={selectedItem?.kind === 'classSession' ? (
          <ClassSessionRecordingsPanel session={selectedItem.item} role="TEACHER" />
        ) : selectedItem?.kind === 'schedule' ? (
          <ScheduleAttendancePanel scheduleId={selectedItem.item.id} onStateChange={setAttendancePanelState} />
        ) : undefined}
      />
      {unsavedGuard.hasPendingAction && (
        <ConfirmDialog
          contentClassName="hl-scheduling"
          title="Bỏ thay đổi điểm danh chưa lưu?"
          description="Các trạng thái bạn vừa chỉnh chưa được gửi lên máy chủ. Nếu tiếp tục, những thay đổi này sẽ bị bỏ."
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
