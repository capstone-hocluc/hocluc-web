import type { ConsoleLiveClass, LiveClassAdmissionItem } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMmYyyy,
  formatTimeRangeFromInstants,
  fullDayLabel,
} from '../../../lib/liveScheduleFormat'
import Button from '../button'
import ConsoleSheet from '../sheet'
import Notice from '../notice'
import Status from '../status'
import DetailHeader from '../detail/detail-header'
import KeyFacts from '../detail/key-facts'
import { CalendarClock, ClipboardCheck, RotateCcw, Trash2, UserRound } from '../icons'
import LiveClassAdmissionsSection from './live-class-admissions-section'
import LiveClassStatus from './live-class-status'

interface Props {
  liveClass: ConsoleLiveClass
  admissions: LiveClassAdmissionItem[]
  admissionsLoading: boolean
  admissionsError?: string
  onRetryAdmissions?: () => void
  canManage: boolean
  canEditAttendance: boolean
  onClose: () => void
  onReschedule: () => void
  onChangeTeacher: () => void
  onCancel: () => void
  onOpenAttendance: () => void
  onRefund: () => void
}

export default function LiveClassDetailPanel({
  liveClass,
  admissions,
  admissionsLoading,
  admissionsError,
  onRetryAdmissions,
  canManage,
  canEditAttendance,
  onClose,
  onReschedule,
  onChangeTeacher,
  onCancel,
  onOpenAttendance,
  onRefund,
}: Props) {
  const dateKey = dateKeyOfInstant(liveClass.startTime)
  const isEditable = canManage && liveClass.status !== 'CANCELLED' && liveClass.status !== 'COMPLETED'
  const isActiveOrPast = liveClass.status === 'LIVE' || liveClass.status === 'COMPLETED'
  const canRefund = canManage && isActiveOrPast && !liveClass.refunded
  const showAttendance = canEditAttendance && isActiveOrPast

  return (
    <ConsoleSheet open onClose={onClose} title="Chi tiết buổi học">
      <div className="flex flex-col gap-5">
        <DetailHeader
          title={liveClass.title}
          chips={
            <>
              <LiveClassStatus status={liveClass.status} />
              {liveClass.refunded && <Status tone="warning">Đã hoàn Sao</Status>}
              {liveClass.needsAttention && liveClass.status !== 'CANCELLED' && <Status tone="warning">Ngoài giờ rảnh</Status>}
              {liveClass.hostZoomReconnectRequired && <Status tone="danger">Zoom GV cần kết nối lại</Status>}
            </>
          }
        />

        <KeyFacts
          facts={[
            {
              label: 'Thời gian',
              required: true,
              value: (
                <>
                  {fullDayLabel(dateKey)}, {formatDdMmYyyy(dateKey)}
                  <span className="mt-1 block text-xs font-normal text-text-tertiary">
                    {formatTimeRangeFromInstants(liveClass.startTime, liveClass.endTime)}
                  </span>
                </>
              ),
            },
            { label: 'Khóa học', value: liveClass.courseTitle },
            { label: 'Giảng viên', value: liveClass.teacherName, required: true },
            {
              label: 'Phòng',
              value:
                liveClass.status === 'CANCELLED' ? null : liveClass.teacherName ? `Zoom của ${liveClass.teacherName}` : 'Zoom',
            },
            { label: 'Đã vào lớp', value: liveClass.admittedCount ?? admissions.length, required: true },
          ]}
        />

        {liveClass.needsAttention && liveClass.attentionReason && (
          <Notice tone="warning">{liveClass.attentionReason}</Notice>
        )}
        {liveClass.hostZoomReconnectRequired && (
          <Notice tone="danger">Giảng viên cần kết nối lại Zoom trước buổi học.</Notice>
        )}

        {(isEditable || showAttendance || canRefund) && (
          <div className="flex flex-wrap gap-2">
            {isEditable && (
              <>
                <Button appearance="outline" onClick={onReschedule}>
                  <CalendarClock size={15} />
                  Dời giờ
                </Button>
                <Button appearance="outline" onClick={onChangeTeacher}>
                  <UserRound size={15} />
                  Đổi giảng viên
                </Button>
                <Button variant="danger" appearance="outline" onClick={onCancel}>
                  <Trash2 size={15} />
                  Hủy buổi
                </Button>
              </>
            )}
            {showAttendance && (
              <Button appearance="outline" onClick={onOpenAttendance}>
                <ClipboardCheck size={15} />
                Điểm danh
              </Button>
            )}
            {canRefund && (
              <Button variant="danger" appearance="outline" onClick={onRefund}>
                <RotateCcw size={15} />
                Hoàn Sao
              </Button>
            )}
          </div>
        )}

        <LiveClassAdmissionsSection
          admissions={admissions}
          loading={admissionsLoading}
          errorMessage={admissionsError}
          onRetry={onRetryAdmissions}
        />
      </div>
    </ConsoleSheet>
  )
}
