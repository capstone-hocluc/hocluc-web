import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Video } from '../console/icons'
import Button from '../console/button'
import Notice from '../console/notice'
import Panel from '../console/panel'
import Status from '../console/status'
import { Skeleton } from '../tailgrids/core/skeleton'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import {
  dateKeyOfInstant,
  formatDdMm,
  formatTimeRangeFromInstants,
  relativeDayLabel,
} from '../../lib/liveScheduleFormat'
import { addLocalDays, localDateTimeToInstant, localToday } from '../../lib/scheduling'
import { getLiveClassesInRange, getMyTeacherZoom } from '../../services/liveClassService'

interface TeacherDashboardOverviewProps {
  onNavigate: (page: string) => void
}

/** Teaching-only overview cards for the teacher home: today's/upcoming sessions and Zoom status. */
export default function TeacherDashboardOverview({ onNavigate }: TeacherDashboardOverviewProps) {
  const { profile } = useCurrentUser()
  const today = localToday()

  const range = useMemo(
    () => ({
      from: localDateTimeToInstant(today, 0, 0),
      to: localDateTimeToInstant(addLocalDays(today, 7), 0, 0),
      includeCancelled: false,
    }),
    [today]
  )

  const classesResource = useScheduleResource(
    profile?.id ? `teacher-overview-classes:${profile.id}:${today}` : null,
    () => getLiveClassesInRange(range)
  )

  const zoomResource = useScheduleResource(
    profile?.id ? `teacher-overview-zoom:${profile.id}` : null,
    getMyTeacherZoom
  )

  const [nowMs] = useState(() => Date.now())
  const upcoming = useMemo(() => {
    return (classesResource.data ?? [])
      .filter((c) => c.status !== 'CANCELLED' && c.status !== 'COMPLETED' && (c.status === 'LIVE' || Date.parse(c.endTime) >= nowMs))
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
  }, [classesResource.data, nowMs])

  const todayCount = useMemo(
    () => upcoming.filter((c) => dateKeyOfInstant(c.startTime) === today).length,
    [upcoming, today]
  )
  const nextClass = upcoming[0] ?? null
  const zoom = zoomResource.data
  const zoomConnected = Boolean(zoom?.connected)
  const zoomNeedsReconnect = !zoomConnected && (zoom?.status === 'ERROR' || zoom?.status === 'REVOKED')

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Lịch dạy sắp tới"
        action={
          <Button size="sm" appearance="ghost" onClick={() => onNavigate('schedule')}>
            Lịch dạy
            <ArrowRight size={15} />
          </Button>
        }
      >
        {classesResource.status === 'loading' ? (
          <div className="space-y-3" role="status" aria-label="Đang tải lịch dạy">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : classesResource.status === 'error' ? (
          <Notice tone="danger">
            {classesResource.errorMessage || 'Không tải được lịch dạy.'}
            <Button size="sm" appearance="outline" onClick={classesResource.reload}>
              Thử lại
            </Button>
          </Notice>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <CalendarDays size={16} className="text-icon-tertiary" aria-hidden="true" />
              <span>Hôm nay: {todayCount} buổi · 7 ngày tới: {upcoming.length} buổi</span>
            </div>
            {nextClass ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-card-border p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Status tone={nextClass.status === 'LIVE' ? 'success' : 'info'}>
                      {nextClass.status === 'LIVE' ? 'Đang dạy' : 'Buổi tiếp theo'}
                    </Status>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-text-primary">{nextClass.title}</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {relativeDayLabel(dateKeyOfInstant(nextClass.startTime), today)}, {formatDdMm(dateKeyOfInstant(nextClass.startTime))} · {formatTimeRangeFromInstants(nextClass.startTime, nextClass.endTime)} · {nextClass.admittedCount ?? 0} học viên đã vào lớp
                  </p>
                </div>
                <Button size="sm" appearance="outline" onClick={() => onNavigate('schedule')}>
                  Vào lịch dạy
                </Button>
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">Chưa có buổi dạy nào trong 7 ngày tới.</p>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="Tài khoản Zoom"
        action={
          zoomResource.status === 'loading' ? (
            <Skeleton className="h-6 w-24 rounded-lg" />
          ) : zoomConnected ? (
            <Status tone="success">Đã kết nối</Status>
          ) : zoomNeedsReconnect ? (
            <Status tone="danger">Cần kết nối lại</Status>
          ) : (
            <Status tone="warning">Chưa kết nối</Status>
          )
        }
      >
        {zoomResource.status === 'loading' ? (
          <div className="space-y-3" role="status" aria-label="Đang tải tài khoản Zoom">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
        ) : zoomResource.status === 'error' ? (
          <Notice tone="danger">
            {zoomResource.errorMessage || 'Không tải được trạng thái Zoom.'}
            <Button size="sm" appearance="outline" onClick={zoomResource.reload}>
              Thử lại
            </Button>
          </Notice>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 text-sm">
              <Video size={17} className="shrink-0 text-icon-tertiary" aria-hidden="true" />
              <span className="truncate font-medium text-text-primary">
                {zoomConnected
                  ? zoom?.zoomEmail || 'Tài khoản Zoom cá nhân'
                  : zoomNeedsReconnect
                    ? 'Kết nối Zoom đã hết hạn hoặc bị thu hồi'
                    : 'Chưa kết nối tài khoản Zoom'}
              </span>
            </div>
            <div>
              <Button size="sm" appearance="outline" onClick={() => onNavigate('schedule')}>
                {zoomConnected ? 'Quản lý tại Lịch dạy' : 'Kết nối tại Lịch dạy'}
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
