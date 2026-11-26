import Button from '../../components/console/button'
import ScheduleResourceState from '../../components/console/schedule/schedule-resource-state'
import Notice from '../../components/console/notice'
import TeacherPageHeader from '../../components/teacher/TeacherPageHeader'
import AvailabilityWeekGrid from '../../components/teacher/AvailabilityWeekGrid'
import BusyDaysPanel from '../../components/teacher/BusyDaysPanel'
import LiveScheduleSkeleton from '../../components/console/schedule/live-schedule-skeleton'
import { useTeacherAvailability } from '../../hooks/useTeacherAvailability'

export default function TeacherAvailabilityPage() {
  const a = useTeacherAvailability()

  return (
    <div className="space-y-5">
      <TeacherPageHeader
        title="Giờ rảnh"
        actions={
          <>
            <Button appearance="outline" disabled={!a.dirty || a.busy} onClick={a.undoChanges}>
              Hoàn tác
            </Button>
            <Button disabled={!a.dirty || a.busy} onClick={() => void a.save()}>
              {a.busy ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </>
        }
      />

      {a.notice && <Notice tone="info">{a.notice}</Notice>}
      {a.errorMessage && <Notice tone="danger">{a.errorMessage}</Notice>}

      {a.status === 'loading' ? (
        <LiveScheduleSkeleton variant="availability" />
      ) : (
        <ScheduleResourceState status={a.status} errorMessage={a.resourceError || 'Không tải được giờ rảnh.'} onRetry={a.reload}>
        <div className="flex flex-col items-start gap-5 lg:flex-row">
          <AvailabilityWeekGrid
            slots={a.draftSlots}
            weekClasses={a.weekClasses}
            onAddRange={a.addSlotRange}
            onRemoveSlot={a.removeSlot}
          />
          <BusyDaysPanel
            busyDays={a.busyDays}
            weekClasses={a.weekClasses}
            draftSlots={a.draftSlots}
            busy={a.busy}
            onAddBusyDay={a.addBusyDay}
            onRemoveBusyDay={(id) => void a.removeBusyDay(id)}
          />
        </div>
        </ScheduleResourceState>
      )}
    </div>
  )
}
