import { ChevronLeft, ChevronRight } from '../../components/console/icons'
import Button from '../../components/console/button'
import Notice from '../../components/console/notice'
import TeacherPageHeader from '../../components/teacher/TeacherPageHeader'
import TeacherNextClassCard from '../../components/teacher/TeacherNextClassCard'
import TeacherTodoPanel from '../../components/teacher/TeacherTodoPanel'
import TeacherClassDetailDialog from '../../components/teacher/TeacherClassDetailDialog'
import LiveScheduleSkeleton from '../../components/console/schedule/live-schedule-skeleton'
import LiveWeekGrid from '../../components/console/schedule/live-week-grid'
import LiveClassContentDialog from '../../components/console/schedule/live-class-content-dialog'
import LiveClassAttendanceDialog from '../../components/console/schedule/live-class-attendance-dialog'
import { useTeacherSchedule } from '../../hooks/useTeacherSchedule'
import { formatWeekRangeLabel } from '../../lib/liveScheduleFormat'

export default function TeacherSchedulePage() {
  const t = useTeacherSchedule()
  const weekLabel = formatWeekRangeLabel(t.weekStart)

  return (
    <div className="space-y-5">
      <TeacherPageHeader title="Lịch dạy" />

      {t.notice && <Notice tone="info">{t.notice}</Notice>}

      {t.status === 'loading' ? (
        <LiveScheduleSkeleton variant="teacher" />
      ) : t.status === 'error' || t.status === 'forbidden' ? (
        <Notice tone={t.status === 'forbidden' ? 'warning' : 'danger'}>
          {t.errorMessage || 'Không tải được lịch dạy.'}
          <Button size="sm" appearance="outline" onClick={t.reloadAll}>
            Thử lại
          </Button>
        </Notice>
      ) : (
        <>
          {t.errorMessage && <Notice tone="danger">{t.errorMessage}</Notice>}

          {t.nextClass && (
            <TeacherNextClassCard
              liveClass={t.nextClass}
              nowMs={t.nowMs}
              busy={t.busy}
              onOpenContent={() => t.setContentTarget(t.nextClass)}
              onStart={() => void t.handleStart(t.nextClass!)}
              onEnd={() => void t.handleEnd(t.nextClass!)}
            />
          )}

          <div className="flex flex-col items-start gap-5 lg:flex-row">
            <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-card-border bg-card-background">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-card-border px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Tuần trước"
                    onClick={t.goPrevWeek}
                    className="inline-flex size-11 items-center justify-center rounded-xl border border-card-border bg-card-background text-text-primary hover:bg-background-gray-secondary"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <strong className="min-w-[170px] text-center text-[15px] text-text-primary">
                    {weekLabel}
                  </strong>
                  <button
                    type="button"
                    aria-label="Tuần sau"
                    onClick={t.goNextWeek}
                    className="inline-flex size-11 items-center justify-center rounded-xl border border-card-border bg-card-background text-text-primary hover:bg-background-gray-secondary"
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={t.goThisWeek}
                  className="min-h-11 rounded-xl border border-card-border bg-card-background px-4 text-sm text-text-primary hover:bg-background-gray-secondary"
                >
                  Tuần này
                </button>
              </div>

              <div className="[&>section]:rounded-none [&>section]:border-0">
                <LiveWeekGrid
                  weekStart={t.weekStart}
                  classes={t.weekClasses}
                  selectedId={t.selectedClass?.id}
                  onSelect={(item) => t.setSelectedClass(item)}
                  mode="teacher"
                  minHour={16}
                  maxHour={22}
                  showLegend={false}
                />
              </div>
            </div>

            <TeacherTodoPanel
              todos={t.todos}
              onOpenAttendance={(item) => t.setAttendanceTarget(item)}
              onOpenContent={(item) => t.setContentTarget(item)}
            />
          </div>
        </>
      )}

      {t.selectedClass && (
        <TeacherClassDetailDialog
          liveClass={t.selectedClass}
          nowMs={t.nowMs}
          busy={t.busy}
          onClose={() => t.setSelectedClass(null)}
          onStart={() => void t.handleStart(t.selectedClass!)}
          onEnd={() => void t.handleEnd(t.selectedClass!)}
          onOpenContent={() => {
            const target = t.selectedClass
            t.setSelectedClass(null)
            t.setContentTarget(target)
          }}
          onOpenAttendance={() => {
            const target = t.selectedClass
            t.setSelectedClass(null)
            t.setAttendanceTarget(target)
          }}
        />
      )}

      {t.contentTarget && (
        <LiveClassContentDialog
          liveClass={t.contentTarget}
          onClose={() => t.setContentTarget(null)}
          onSaved={() => {
            t.setContentTarget(null)
            t.reloadAll()
          }}
        />
      )}

      {t.attendanceTarget && (
        <LiveClassAttendanceDialog
          liveClass={t.attendanceTarget}
          onClose={() => t.setAttendanceTarget(null)}
          onSaved={() => {
            t.setAttendanceTarget(null)
            t.reloadAll()
          }}
        />
      )}
    </div>
  )
}
