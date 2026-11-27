import { FilterToolbar } from '../../components/console/filter-toolbar'
import Notice from '../../components/console/notice'
import TeacherPageHeader from '../../components/teacher/TeacherPageHeader'
import TeacherNextClassCard from '../../components/teacher/TeacherNextClassCard'
import TeacherTodoPanel from '../../components/teacher/TeacherTodoPanel'
import TeacherZoomCard from '../../components/teacher/TeacherZoomCard'
import TeacherClassDetailDialog from '../../components/teacher/TeacherClassDetailDialog'
import ScheduleResourceState from '../../components/console/schedule/schedule-resource-state'
import WeekNavigator from '../../components/console/schedule/week-navigator'
import LiveScheduleSkeleton from '../../components/console/schedule/live-schedule-skeleton'
import LiveWeekGrid from '../../components/console/schedule/live-week-grid'
import LiveClassContentDialog from '../../components/console/schedule/live-class-content-dialog'
import { useTeacherSchedule } from '../../hooks/useTeacherSchedule'
import { formatWeekRangeLabel } from '../../lib/liveScheduleFormat'

export default function TeacherSchedulePage() {
  const t = useTeacherSchedule()
  const weekLabel = formatWeekRangeLabel(t.weekStart)
  const zoomMissing = Boolean(t.zoomAccount?.zoomEnabled && !t.zoomAccount?.connected)

  return (
    <div className="space-y-5">
      <TeacherPageHeader title="Lịch dạy" />

      {t.notice && <Notice tone="info">{t.notice}</Notice>}

      {t.status === 'loading' ? (
        <LiveScheduleSkeleton variant="teacher" />
      ) : (
        <ScheduleResourceState status={t.status} errorMessage={t.errorMessage || 'Không tải được lịch dạy.'} onRetry={t.reloadAll}>
          {t.errorMessage && <Notice tone="danger">{t.errorMessage}</Notice>}

          {t.nextClass && (
            <TeacherNextClassCard
              liveClass={t.nextClass}
              nowMs={t.nowMs}
              busy={t.busy}
              zoomMissing={zoomMissing}
              onOpenContent={() => t.setContentTarget(t.nextClass)}
              onStart={() => void t.handleStart(t.nextClass!)}
              onEnd={() => void t.handleEnd(t.nextClass!)}
            />
          )}

          <div className="flex flex-col items-start gap-5 lg:flex-row">
            <section className="w-full min-w-0 flex-1 overflow-hidden rounded-xl border border-card-border bg-card-background">
              <FilterToolbar>
                <WeekNavigator
                  label={weekLabel}
                  onPrev={t.goPrevWeek}
                  onNext={t.goNextWeek}
                  onThisWeek={t.goThisWeek}
                />
              </FilterToolbar>
              <LiveWeekGrid
                bare
                weekStart={t.weekStart}
                classes={t.weekClasses}
                selectedId={t.selectedClass?.id}
                onSelect={(item) => t.setSelectedClass(item)}
                mode="teacher"
                showLegend={false}
              />
            </section>
            <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[320px]">
              <TeacherZoomCard
                zoomAccount={t.zoomAccount}
                loading={t.zoomLoading}
                busy={t.zoomBusy}
                onConnect={() => void t.handleConnectZoom()}
                onDisconnect={() => void t.handleDisconnectZoom()}
              />
              <TeacherTodoPanel
                todos={t.todos}
                onOpenContent={(item) => t.setContentTarget(item)}
              />
            </div>
          </div>
        </ScheduleResourceState>
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
    </div>
  )
}
