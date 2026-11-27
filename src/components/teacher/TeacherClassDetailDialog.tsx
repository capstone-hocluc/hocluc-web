import ConsoleDialog from '../console/dialog'
import Button from '../console/button'
import Notice from '../console/notice'
import Status from '../console/status'
import DetailSection from '../console/detail/detail-section'
import KeyFacts from '../console/detail/key-facts'
import LiveClassAdmissionsSection from '../console/schedule/live-class-admissions-section'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { getLiveClassAdmissions, type ConsoleLiveClass } from '../../services/liveClassService'
import {
  canTeacherStartOrJoin,
  dateKeyOfInstant,
  formatDdMmYyyy,
  formatTimeRangeFromInstants,
  fullDayLabel,
} from '../../lib/liveScheduleFormat'

interface Props {
  liveClass: ConsoleLiveClass
  nowMs: number
  busy: boolean
  onClose: () => void
  onStart: () => void
  onEnd: () => void
  onOpenContent: () => void
}

export default function TeacherClassDetailDialog({
  liveClass,
  nowMs,
  busy,
  onClose,
  onStart,
  onEnd,
  onOpenContent,
}: Props) {
  const dateKey = dateKeyOfInstant(liveClass.startTime)
  const canStart = canTeacherStartOrJoin(liveClass.startTime, liveClass.endTime, liveClass.status, nowMs)
  const isLive = liveClass.status === 'LIVE'
  const isOver = liveClass.status === 'COMPLETED'
  const admissionsResource = useScheduleResource(
    `teacher-live-class-admissions:${liveClass.id}`,
    () => getLiveClassAdmissions(liveClass.id)
  )
  const admissions = admissionsResource.data ?? []

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      title={liveClass.title}
      maxWidth={540}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {!isOver && liveClass.status !== 'CANCELLED' && (
            <Button type="button" appearance="outline" disabled={busy} onClick={onOpenContent}>
              Nội dung buổi
            </Button>
          )}
          {isLive && (
            <Button type="button" variant="danger" appearance="outline" disabled={busy} onClick={onEnd}>
              Kết thúc buổi
            </Button>
          )}
          {!isOver && liveClass.status !== 'CANCELLED' && (
            <Button type="button" disabled={busy || !canStart} onClick={onStart}>
              Vào dạy
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {liveClass.refunded && (
          <div>
            <Status tone="warning">Đã hoàn Sao</Status>
          </div>
        )}
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
            {
              label: 'Đã vào lớp',
              required: true,
              value: liveClass.admittedCount ?? admissions.length,
            },
          ]}
        />
        {liveClass.description && (
          <DetailSection title="Nội dung">
            <p className="text-sm whitespace-pre-wrap text-text-primary">{liveClass.description}</p>
          </DetailSection>
        )}
        {liveClass.needsAttention && liveClass.attentionReason && <Notice tone="warning">{liveClass.attentionReason}</Notice>}
        <LiveClassAdmissionsSection
          admissions={admissions}
          loading={admissionsResource.status === 'loading'}
          errorMessage={admissionsResource.status === 'error' ? admissionsResource.errorMessage : undefined}
          onRetry={admissionsResource.reload}
        />
      </div>
    </ConsoleDialog>
  )
}
