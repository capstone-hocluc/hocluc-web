import { CalendarDays, Clock3, Video, UserRound } from '../../console/icons'
import StatusBadge from '../../ui/StatusBadge'
import type { CourseStudyLiveClass } from '../../../services/courseService'
import { SCHEDULING_TIMEZONE } from '../../../lib/scheduling'
import LiveClassActions from './LiveClassActions'
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
        {/* A student joins with their own link once booked, so seats, joining and replays come from the booking. */}
        <LiveClassActions liveClass={item} />
      </div>
    </article>
  )
}

export default CourseLiveClassCard
