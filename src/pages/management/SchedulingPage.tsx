import type { ReactNode } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from '../../components/console/icons'
import Button from '../../components/console/button'
import ConfirmDialog from '../../components/console/confirm-dialog'
import Notice from '../../components/console/notice'
import PageHeading from '../../components/console/page-heading'
import SelectField from '../../components/console/select-field'
import { fieldControlClass } from '../../components/console/form-field'
import LiveScheduleSkeleton from '../../components/console/schedule/live-schedule-skeleton'
import LiveWeekGrid from '../../components/console/schedule/live-week-grid'
import LiveClassListView from '../../components/console/schedule/live-class-list-view'
import LiveClassDetailPanel from '../../components/console/schedule/live-class-detail-panel'
import LiveTimetableWizardDialog from '../../components/console/schedule/live-timetable-wizard-dialog'
import RescheduleLiveClassDialog from '../../components/console/schedule/reschedule-live-class-dialog'
import ChangeTeacherDialog from '../../components/console/schedule/change-teacher-dialog'
import { useManagementSchedule } from '../../hooks/useManagementSchedule'
import { formatWeekRangeLabel } from '../../lib/liveScheduleFormat'
import type { ManagementRole } from '../../components/management/ManagementRouteGuard'
import { cn } from '../../lib/cn'

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
  const weekLabel = formatWeekRangeLabel(s.weekStart)

  return (
    <div className="space-y-5">
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

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-card-border bg-card-background p-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-[13px] text-[#526984]">
          Khóa học
          <SelectField
            ariaLabel="Lọc theo khóa học"
            value={s.courseFilter}
            onChange={(val) => {
              s.setCourseFilter(val)
              s.setSelectedId(null)
            }}
            triggerClassName={cn(fieldControlClass, 'min-h-11')}
            options={[
              { id: '', label: 'Tất cả khóa học' },
              ...s.courses.map((c) => ({ id: c.id, label: c.title })),
            ]}
          />
        </label>

        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-[13px] text-[#526984]">
          Giảng viên
          <SelectField
            ariaLabel="Lọc theo giảng viên"
            value={s.teacherFilter}
            onChange={(val) => {
              s.setTeacherFilter(val)
              s.setSelectedId(null)
            }}
            triggerClassName={cn(fieldControlClass, 'min-h-11')}
            options={[
              { id: '', label: 'Tất cả giảng viên' },
              ...s.teachers.map((t) => ({ id: t.id, label: teacherNameOf(t) })),
            ]}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Tuần trước"
            onClick={s.goPrevWeek}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-card-border bg-card-background text-text-primary hover:bg-background-gray-secondary"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div className="min-w-[172px] text-center text-[15px] font-semibold text-text-primary">
            {weekLabel}
          </div>
          <button
            type="button"
            aria-label="Tuần sau"
            onClick={s.goNextWeek}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-card-border bg-card-background text-text-primary hover:bg-background-gray-secondary"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={s.goThisWeek}
            className="min-h-11 rounded-xl border border-card-border bg-card-background px-4 text-sm text-text-primary hover:bg-background-gray-secondary"
          >
            Tuần này
          </button>
        </div>

        <div
          role="group"
          aria-label="Kiểu xem"
          className="flex gap-1 rounded-xl border border-card-border bg-[#f6f9ff] p-1"
        >
          <button
            type="button"
            aria-pressed={s.viewMode === 'week'}
            onClick={() => s.setViewMode('week')}
            className={cn(
              'min-h-9 rounded-lg px-3.5 text-sm',
              s.viewMode === 'week'
                ? 'bg-[#0b3a82] font-semibold text-white'
                : 'bg-transparent text-text-primary hover:bg-white/70'
            )}
          >
            Tuần
          </button>
          <button
            type="button"
            aria-pressed={s.viewMode === 'list'}
            onClick={() => s.setViewMode('list')}
            className={cn(
              'min-h-9 rounded-lg px-3.5 text-sm',
              s.viewMode === 'list'
                ? 'bg-[#0b3a82] font-semibold text-white'
                : 'bg-transparent text-text-primary hover:bg-white/70'
            )}
          >
            Danh sách
          </button>
        </div>
      </div>

      {s.attentionClasses.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f3c58b] bg-[#fff6ea] px-4 py-3 text-sm text-[#7a3d00]"
        >
          <AlertTriangle size={20} className="shrink-0" aria-hidden="true" />
          <span className="min-w-[220px] flex-1">
            {s.attentionClasses.length} buổi nằm ngoài giờ rảnh giảng viên đã khai
          </span>
          <button
            type="button"
            onClick={() => s.setAttentionOnly((prev) => !prev)}
            className="min-h-10 rounded-lg border border-[#e6a85c] bg-white px-3.5 text-sm font-semibold text-[#7a3d00] hover:bg-[#fffaf3]"
          >
            {s.attentionOnly ? 'Hiện tất cả' : `Xem ${s.attentionClasses.length} buổi`}
          </button>
        </div>
      )}

      {s.classesStatus === 'loading' ? (
        <LiveScheduleSkeleton variant="management" />
      ) : s.classesStatus === 'error' || s.classesStatus === 'forbidden' ? (
        <Notice tone={s.classesStatus === 'forbidden' ? 'warning' : 'danger'}>
          {s.classesError || 'Không tải được lịch dạy.'}
          <Button size="sm" appearance="outline" onClick={s.reloadClasses}>
            Thử lại
          </Button>
        </Notice>
      ) : (
        <div className="flex flex-col items-start gap-5 lg:flex-row">
          {s.viewMode === 'week' ? (
            <LiveWeekGrid
              weekStart={s.weekStart}
              classes={s.displayedClasses}
              selectedId={s.selectedClass?.id}
              onSelect={(item) => s.setSelectedId(item.id)}
              mode="management"
            />
          ) : (
            <LiveClassListView
              classes={s.displayedClasses}
              selectedId={s.selectedClass?.id}
              onSelect={(item) => s.setSelectedId(item.id)}
            />
          )}

          {s.selectedClass && (
            <LiveClassDetailPanel
              liveClass={s.selectedClass}
              bookings={s.bookings}
              bookingsLoading={s.bookingsLoading}
              canManage={canSchedule}
              onClose={() => s.setSelectedId(null)}
              onReschedule={() => {
                s.setMutationError('')
                s.setRescheduleTarget(s.selectedClass)
              }}
              onChangeTeacher={() => {
                s.setMutationError('')
                s.setChangeTeacherTarget(s.selectedClass)
              }}
              onCancel={() => {
                s.setMutationError('')
                s.setCancelTarget(s.selectedClass)
              }}
            />
          )}
        </div>
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

      {s.cancelTarget && (
        <ConfirmDialog
          title="Hủy buổi học này?"
          description={<>Buổi “{s.cancelTarget.title}” sẽ bị hủy và gửi thông báo tới học viên đã giữ chỗ.</>}
          cancelLabel="Giữ lại"
          confirmLabel="Hủy buổi"
          variant="danger"
          busy={s.mutationBusy}
          onCancel={() => s.setCancelTarget(null)}
          onConfirm={() => void s.runCancel()}
        />
      )}
    </div>
  )
}
