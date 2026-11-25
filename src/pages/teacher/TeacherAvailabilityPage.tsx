import Button from '../../components/console/button'
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
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!a.dirty || a.busy}
              onClick={a.undoChanges}
              className="min-h-11 rounded-xl border border-card-border bg-card-background px-4.5 text-[15px] font-semibold text-text-primary hover:bg-background-gray-secondary disabled:opacity-50"
            >
              Hoàn tác
            </button>
            <button
              type="button"
              disabled={!a.dirty || a.busy}
              onClick={() => void a.save()}
              className="min-h-11 rounded-xl bg-[#0b3a82] px-5.5 text-[15px] font-semibold text-white hover:bg-[#082e68] disabled:opacity-50"
            >
              {a.busy ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        }
      />

      {a.notice && <Notice tone="info">{a.notice}</Notice>}
      {a.errorMessage && <Notice tone="danger">{a.errorMessage}</Notice>}

      {a.status === 'loading' ? (
        <LiveScheduleSkeleton variant="availability" />
      ) : a.status === 'error' || a.status === 'forbidden' ? (
        <Notice tone={a.status === 'forbidden' ? 'warning' : 'danger'}>
          {a.resourceError || 'Không tải được giờ rảnh.'}
          <Button size="sm" appearance="outline" onClick={a.reload}>
            Thử lại
          </Button>
        </Notice>
      ) : (
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
      )}
    </div>
  )
}
