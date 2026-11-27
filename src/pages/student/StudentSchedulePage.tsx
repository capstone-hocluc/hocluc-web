import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import StudentNextClassCard from '../../components/student/schedule/StudentNextClassCard'
import StudentAgendaCard from '../../components/student/schedule/StudentAgendaCard'
import StudentAttendanceBar from '../../components/student/schedule/StudentAttendanceBar'
import LiveScheduleSkeleton from '../../components/console/schedule/live-schedule-skeleton'
import { useStudentSchedule } from '../../hooks/useStudentSchedule'

export default function StudentSchedulePage() {
  const s = useStudentSchedule()

  return (
    <StudentPageContainer width="wide" className="max-w-[1040px] space-y-5">
      <StudentPageHeader title="Lịch học" />

      {s.status === 'loading' ? (
        <LiveScheduleSkeleton variant="student" />
      ) : s.status === 'error' || s.status === 'forbidden' ? (
        <Notice tone={s.status === 'forbidden' ? 'warning' : 'danger'}>
          {s.errorMessage || 'Không tải được lịch học.'}
          <Button size="sm" appearance="outline" onClick={s.reload}>
            Thử lại
          </Button>
        </Notice>
      ) : (
        <>
          {s.nextClass && (
            <StudentNextClassCard
              liveClass={s.nextClass}
              nowMs={s.nowMs}
            />
          )}

          <StudentAgendaCard
            tab={s.tab}
            onTabChange={s.setTab}
            upcoming={s.upcoming7Days}
            past={s.pastClasses}
          />

          <StudentAttendanceBar summary={s.attendance} />
        </>
      )}
    </StudentPageContainer>
  )
}
