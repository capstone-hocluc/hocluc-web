import { CalendarDays, Clock3, Video, ArrowRight, UserRound } from '../../console/icons'
import Button from '../../ui/Button'
import StatusBadge from '../../ui/StatusBadge'
import type { CourseStudyLiveClass } from '../../../services/courseService'
import { safeExternalUrl, SCHEDULING_TIMEZONE } from '../../../lib/scheduling'
import styles from './CourseExams.module.css'
import liveStyles from './CourseLiveClasses.module.css'

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Đã lên lịch', LIVE: 'Đang diễn ra', COMPLETED: 'Đã kết thúc', CANCELLED: 'Đã hủy',
}

function getClassTime(item: CourseStudyLiveClass) {
  let timezone = item.timezone || SCHEDULING_TIMEZONE
  try { new Intl.DateTimeFormat('vi-VN', { timeZone: timezone }) } catch { timezone = SCHEDULING_TIMEZONE }
  const format = (value: string, options: Intl.DateTimeFormatOptions) => {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('vi-VN', { ...options, timeZone: timezone }).format(date) : 'Chưa xác định'
  }
  const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' } as const
  const timeOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as const
  const day = format(item.startTime, dateOptions)
  const endDay = format(item.endTime, dateOptions)
  const startDate = new Date(item.startTime)
  const zone = Number.isFinite(startDate.getTime())
    ? new Intl.DateTimeFormat('vi-VN', { timeZone: timezone, timeZoneName: 'shortOffset' })
      .formatToParts(startDate).find(part => part.type === 'timeZoneName')?.value || timezone
    : timezone
  return {
    day,
    start: format(item.startTime, timeOptions),
    end: `${day === endDay ? '' : `${endDay} · `}${format(item.endTime, timeOptions)}`,
    zone,
  }
}

function CourseLiveClassCard({ item, past, next }: { item: CourseStudyLiveClass; past: boolean; next: boolean }) {
  const joinUrl = item.joinable ? safeExternalUrl(item.meetingUrl) : null
  const urls = [safeExternalUrl(item.recordingUrl), ...(item.recordings ?? []).map(recording => safeExternalUrl(recording.recordingUrl))]
    .filter((value): value is string => Boolean(value))
  const recordings = [...new Set(urls)]
  const time = getClassTime(item)
  const teacher = item.instructorName || item.teacherName

  return (
    <article role="listitem" className={styles.card} data-active={item.status === 'LIVE' || next || undefined} data-completed={past || undefined}>
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true"><Video size={24} /></span>
        <div className="min-w-0">
          <h3 className={styles.title}>{item.title}</h3>
          <div className={styles.meta}>
            {item.type === 'OVERALL_PRACTICE' && <span>Luyện tập tổng hợp</span>}
            {item.seriesName && <span>{item.seriesName}</span>}
            {item.dayNumber != null && <span>Buổi {item.dayNumber}</span>}
          </div>
        </div>
      </div>

      {item.description && <p className={liveStyles.description}>{item.description}</p>}
      <dl className={liveStyles.details}>
        <div><dt><CalendarDays size={15} aria-hidden="true" />Ngày học</dt><dd><time dateTime={item.startTime}>{time.day}</time></dd></div>
        <div><dt><Clock3 size={15} aria-hidden="true" />Giờ học · {time.zone}</dt><dd>{time.start} – {time.end}</dd></div>
        <div><dt><UserRound size={15} aria-hidden="true" />Giảng viên</dt><dd>{teacher || 'Chưa có thông tin'}</dd></div>
        <div><dt><Video size={15} aria-hidden="true" />Nền tảng</dt><dd>{item.provider === 'ZOOM' ? 'Zoom' : item.provider || 'Chưa có thông tin'}</dd></div>
      </dl>
      {item.lessonTitle && <p className={styles.availability}>Bài học: {item.lessonTitle}</p>}

      <div className={liveStyles.actions}>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge size="sm" tone={past ? 'success' : 'primary'}>{statusLabels[item.status] || 'Chưa rõ trạng thái'}</StatusBadge>
          {next && !past && item.status !== 'LIVE' && <StatusBadge size="sm" tone="primary">Gần nhất</StatusBadge>}
        </div>
        {joinUrl ? (
          <Button asChild size="sm" shape="pill"><a href={joinUrl} target="_blank" rel="noopener noreferrer" aria-label={`Tham gia ${item.title}`}>Tham gia<ArrowRight size={14} /></a></Button>
        ) : recordings.length === 0 && !past ? (
          <Button size="sm" shape="pill" appearance="outline" disabled>{item.joinable ? 'Chưa có liên kết' : 'Chưa thể tham gia'}</Button>
        ) : null}
      </div>
      {recordings.length === 1 && <Button asChild size="sm" shape="pill" appearance="outline" className="self-start"><a href={recordings[0]} target="_blank" rel="noopener noreferrer" aria-label={`Xem bản ghi ${item.title}`}>Xem bản ghi<ArrowRight size={14} /></a></Button>}
      {recordings.length > 1 && <details className={liveStyles.recordings}><summary>Xem bản ghi ({recordings.length})</summary><div>{recordings.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">Bản ghi {index + 1}<ArrowRight size={13} /></a>)}</div></details>}
      {past && recordings.length === 0 && <p className={styles.availability}>Chưa có bản ghi cho buổi học này.</p>}
    </article>
  )
}

export default CourseLiveClassCard
