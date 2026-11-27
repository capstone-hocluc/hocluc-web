import type { ReactNode } from 'react'
import { Plus } from '../../components/console/icons'
import Button from '../../components/console/button'
import ConfirmDialog from '../../components/console/confirm-dialog'
import Notice from '../../components/console/notice'
import PageHeading from '../../components/console/page-heading'
import { FilterGroup, FilterSelect, FilterToolbar } from '../../components/console/filter-toolbar'
import LiveScheduleSkeleton from '../../components/console/schedule/live-schedule-skeleton'
import LiveWeekGrid from '../../components/console/schedule/live-week-grid'
import LiveClassListView from '../../components/console/schedule/live-class-list-view'
import LiveClassDetailPanel from '../../components/console/schedule/live-class-detail-panel'
import LiveTimetableWizardDialog from '../../components/console/schedule/live-timetable-wizard-dialog'
import LiveClassAttendanceDialog from '../../components/console/schedule/live-class-attendance-dialog'
import LiveClassRefundDialog from '../../components/console/schedule/live-class-refund-dialog'
import RescheduleLiveClassDialog from '../../components/console/schedule/reschedule-live-class-dialog'
import ChangeTeacherDialog from '../../components/console/schedule/change-teacher-dialog'
import ScheduleResourceState from '../../components/console/schedule/schedule-resource-state'
import ScheduleViewToggle from '../../components/console/schedule/schedule-view-toggle'
import WeekNavigator from '../../components/console/schedule/week-navigator'
import { useManagementSchedule } from '../../hooks/useManagementSchedule'
import { formatWeekRangeLabel } from '../../lib/liveScheduleFormat'
import { can } from '../../lib/permissions'
import type { ManagementRole } from '../../components/management/ManagementRouteGuard'

interface Props {
  role: Extract<ManagementRole, 'STAFF' | 'MANAGER'>
  navigation?: ReactNode
}

function teacherNameOf(t: { displayName?: string; firstName?: string; lastName?: string; email: string }) {
  return t.displayName || [t.firstName, t.lastName].filter(Boolean).join(' ') || t.email
}

export default function SchedulingPage({ role, navigation }: Props) {
  const s = useManagementSchedule()
  const canSchedule = role === 'STAFF' || role === 'MANAGER'
  const canEditAttendance = can(role, 'ATTENDANCE_WRITE')

  return (
    <section className="flex flex-col gap-5">
      <PageHeading
        title="Lịch dạy"
        action={
          canSchedule ? (
            <Button
              disabled={s.coursesStatus === 'loading' || s.teachersStatus === 'loading'}
              onClick={() => {
                s.setMutationError('')
                s.setNotice('')
                s.setWizardOpen(true)
              }}
            >
              <Plus size={18} aria-hidden="true" />
              Xếp lịch dạy
            </Button>
          ) : undefined
        }
      />
      {navigation}

      {s.notice && <Notice tone="info">{s.notice}</Notice>}
      {s.mutationError && <Notice tone="danger">{s.mutationError}</Notice>}
      {s.zoomReconnectCount > 0 && (
        <Notice tone="danger">{s.zoomReconnectCount} buổi có giảng viên cần kết nối lại Zoom</Notice>
      )}
      {s.attentionClasses.length > 0 && (
        <Notice tone="warning">
          <span className="min-w-0 flex-1">{s.attentionClasses.length} buổi nằm ngoài giờ rảnh giảng viên đã khai</span>
          <Button size="sm" appearance="outline" onClick={() => s.setAttentionOnly((prev) => !prev)}>
            {s.attentionOnly ? 'Hiện tất cả' : `Xem ${s.attentionClasses.length} buổi`}
          </Button>
        </Notice>
      )}

      <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
        <FilterToolbar>
          <FilterGroup>
            <FilterSelect
              ariaLabel="Lọc theo khóa học"
              value={s.courseFilter}
              onChange={(val) => {
                s.setCourseFilter(val)
                s.setSelectedId(null)
              }}
              options={[{ id: '', label: 'Tất cả khóa học' }, ...s.courses.map((c) => ({ id: c.id, label: c.title }))]}
            />
            <FilterSelect
              ariaLabel="Lọc theo giảng viên"
              value={s.teacherFilter}
              onChange={(val) => {
                s.setTeacherFilter(val)
                s.setSelectedId(null)
              }}
              options={[{ id: '', label: 'Tất cả giảng viên' }, ...s.teachers.map((t) => ({ id: t.id, label: teacherNameOf(t) }))]}
            />
          </FilterGroup>
          <FilterGroup>
            <WeekNavigator
              label={formatWeekRangeLabel(s.weekStart)}
              onPrev={s.goPrevWeek}
              onNext={s.goNextWeek}
              onThisWeek={s.goThisWeek}
            />
            <ScheduleViewToggle view={s.viewMode} onChange={s.setViewMode} />
          </FilterGroup>
        </FilterToolbar>

        {s.classesStatus === 'loading' ? (
          <div className="p-4">
            <LiveScheduleSkeleton variant="management" />
          </div>
        ) : (
          <ScheduleResourceState inset status={s.classesStatus} errorMessage={s.classesError} onRetry={s.reloadClasses}>
            {s.viewMode === 'week' ? (
              <LiveWeekGrid
                bare
                weekStart={s.weekStart}
                classes={s.displayedClasses}
                selectedId={s.selectedClass?.id}
                onSelect={(item) => s.setSelectedId(item.id)}
                mode="management"
              />
            ) : (
              <div className="p-4">
                <LiveClassListView
                  classes={s.displayedClasses}
                  selectedId={s.selectedClass?.id}
                  onSelect={(item) => s.setSelectedId(item.id)}
                />
              </div>
            )}
          </ScheduleResourceState>
        )}
      </section>

      {s.selectedClass && (
        <LiveClassDetailPanel
          liveClass={s.selectedClass}
          admissions={s.admissions}
          admissionsLoading={s.admissionsLoading}
          admissionsError={s.admissionsError}
          onRetryAdmissions={s.reloadAdmissions}
          canManage={canSchedule}
          canEditAttendance={canEditAttendance}
          onClose={() => s.setSelectedId(null)}
          onReschedule={() => {
            s.setMutationError('')
            s.setRescheduleTarget(s.selectedClass)
            s.setSelectedId(null)
          }}
          onChangeTeacher={() => {
            s.setMutationError('')
            s.setChangeTeacherTarget(s.selectedClass)
            s.setSelectedId(null)
          }}
          onCancel={() => {
            s.setMutationError('')
            s.setCancelTarget(s.selectedClass)
            s.setSelectedId(null)
          }}
          onOpenAttendance={() => {
            s.setMutationError('')
            s.setAttendanceTarget(s.selectedClass)
            s.setSelectedId(null)
          }}
          onRefund={() => {
            s.setMutationError('')
            s.setRefundTarget(s.selectedClass)
            s.setSelectedId(null)
          }}
        />
      )}

      <LiveTimetableWizardDialog
        open={s.wizardOpen}
        courses={s.courses}
        teachers={s.teachers}
        initialCourseId={s.courseFilter || undefined}
        onClose={() => s.setWizardOpen(false)}
        onCreated={() => {
          s.setWizardOpen(false)
          s.setNotice('Đã tạo lịch dạy trực tuyến.')
          s.reloadClasses()
        }}
      />

      {s.rescheduleTarget && (
        <RescheduleLiveClassDialog
          liveClass={s.rescheduleTarget}
          busy={s.mutationBusy}
          errorMessage={s.mutationError}
          onClose={() => {
            s.setRescheduleTarget(null)
            s.setMutationError('')
          }}
          onSubmit={(start, end) => void s.runReschedule(start, end)}
        />
      )}

      {s.changeTeacherTarget && (
        <ChangeTeacherDialog
          liveClass={s.changeTeacherTarget}
          teachers={s.teachers}
          busy={s.mutationBusy}
          errorMessage={s.mutationError}
          onClose={() => {
            s.setChangeTeacherTarget(null)
            s.setMutationError('')
          }}
          onSubmit={(teacherId) => void s.runChangeTeacher(teacherId)}
        />
      )}

      {s.attendanceTarget && (
        <LiveClassAttendanceDialog
          liveClass={s.attendanceTarget}
          onClose={() => s.setAttendanceTarget(null)}
          onSaved={() => {
            s.setAttendanceTarget(null)
            s.setNotice('Đã lưu điểm danh.')
            s.reloadClasses()
            s.reloadAdmissions()
          }}
        />
      )}

      {s.refundTarget && (
        <LiveClassRefundDialog
          liveClass={s.refundTarget}
          busy={s.mutationBusy}
          errorMessage={s.mutationError}
          onClose={() => {
            s.setRefundTarget(null)
            s.setMutationError('')
          }}
          onSubmit={(reason) => void s.runRefund(reason)}
        />
      )}

      {s.cancelTarget && (
        <ConfirmDialog
          title="Hủy buổi học này?"
          description={<>Buổi “{s.cancelTarget.title}” sẽ bị hủy và không thể tiếp tục tham gia.</>}
          cancelLabel="Giữ lại"
          confirmLabel="Hủy buổi"
          variant="danger"
          busy={s.mutationBusy}
          onCancel={() => s.setCancelTarget(null)}
          onConfirm={() => void s.runCancel()}
        />
      )}
    </section>
  )
}
