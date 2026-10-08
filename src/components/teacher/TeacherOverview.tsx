import type { ComponentType } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Users,
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import Card from '../ui/Card'
import PageHeading from '../ui/PageHeading'
import Progress from '../ui/Progress'
import { cn } from '../../lib/cn'

type Tone = 'blue' | 'gold' | 'violet' | 'green'

// MOCK: the backend has no teacher overview endpoint yet (class count, grading
// queue, attendance rate). Real sessions live on the schedule page.
const overview: {
  label: string
  value: string
  detail: string
  icon: ComponentType<{ size?: number }>
  tone: Tone
}[] = [
  { label: 'Lớp đang phụ trách', value: '04', detail: '128 học viên đang theo học', icon: BookOpen, tone: 'blue' },
  { label: 'Buổi học tuần này', value: '—', detail: 'Mở lịch dạy để tải dữ liệu từ máy chủ', icon: CalendarDays, tone: 'gold' },
  { label: 'Bài chờ chấm', value: '18', detail: '06 bài cần xử lý hôm nay', icon: ClipboardCheck, tone: 'violet' },
  { label: 'Tỷ lệ tham gia', value: '92%', detail: 'Tăng 4% so với tuần trước', icon: Users, tone: 'green' },
]

const submissions: { initials: string; name: string; assignment: string; group: string; submitted: string }[] = [
  { initials: 'MA', name: 'Nguyễn Minh Anh', assignment: 'Bài tập: Hàm số bậc hai', group: 'ĐGNL 12A · K24', submitted: '12 phút trước' },
  { initials: 'HL', name: 'Trần Hoàng Long', assignment: 'Đề luyện tập số 05', group: 'ĐGNL 12B · K24', submitted: '35 phút trước' },
  { initials: 'TM', name: 'Lê Thị Mai', assignment: 'Bài tập: Phương trình mũ', group: 'ĐGNL 11A · K25', submitted: '1 giờ trước' },
  { initials: 'GH', name: 'Phạm Gia Huy', assignment: 'Đề luyện tập số 05', group: 'ĐGNL 12B · K24', submitted: '2 giờ trước' },
]

const studentStats: { label: string; value: string; note: string; width: number; tone: 'primary' | 'success' }[] = [
  { label: 'Hoàn thành bài tập', value: '86%', note: '+5% so với tuần trước', width: 86, tone: 'primary' },
  { label: 'Điểm danh trung bình', value: '92%', note: '118 / 128 học viên tham gia', width: 92, tone: 'success' },
  { label: 'Điểm bài tập trung bình', value: '7.8', note: 'Mục tiêu tuần: 8.0 điểm', width: 78, tone: 'primary' },
]

const TONE_STYLES: Record<Tone, string> = {
  blue: 'bg-badge-info-bg text-badge-info-text',
  gold: 'bg-badge-warning-bg text-badge-warning-text',
  violet: 'bg-badge-neutral-bg text-badge-neutral-text',
  green: 'bg-badge-success-bg text-badge-success-text',
}

export interface TeacherOverviewCourse {
  id: string
  subject: string
  name: string
  students: number
  next: string
  progress: number
  color: string
}

interface TeacherOverviewProps {
  courses: TeacherOverviewCourse[]
  graded: string[]
  onOpenSchedule: () => void
  onOpenCourses: () => void
  onOpenCourse: (course: TeacherOverviewCourse) => void
  onGrade: (name: string) => void
  onNotify: (message: string) => void
}

function PanelHeading({
  title,
  badge,
  actionLabel,
  onAction,
}: {
  title: string
  badge?: number
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-text-heading">
        {title}
        {badge !== undefined && (
          <em className="grid min-w-5 place-items-center rounded-full bg-badge-danger-bg px-1.5 text-xs font-bold text-badge-danger-text not-italic">
            {badge}
          </em>
        )}
      </h2>
      <Button type="button" appearance="ghost" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  )
}

// Teacher landing page: KPIs, owned classes, grading queue and student stats.
function TeacherOverview({
  courses,
  graded,
  onOpenSchedule,
  onOpenCourses,
  onOpenCourse,
  onGrade,
  onNotify,
}: TeacherOverviewProps) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 [&>div:first-child]:mb-0 [&>div:first-child]:flex-1">
        <PageHeading
          title="Tổng quan"
          subtitle="Theo dõi lớp học, lịch dạy và bài cần chấm."
          action={
            <>
              <CalendarDays size={16} />
              Xem lịch dạy
            </>
          }
          onAction={onOpenSchedule}
        />
        <div className="hidden items-end gap-3 md:flex">
          <p className="mb-6 max-w-[220px] rounded-2xl rounded-br-sm bg-badge-info-bg px-3.5 py-2 text-[13px] font-semibold text-badge-info-text">
            Chúc Thầy một ngày giảng dạy hiệu quả nhé!
          </p>
          <img src="/owl-teacher-teaching.png" alt="Mascot HocLuc" className="h-24 w-auto" />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.map(({ label, value, detail, icon: Icon, tone }) => (
          <Card as="article" key={label} padding="lg" className="flex items-center gap-3.5">
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', TONE_STYLES[tone])}>
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-text-muted">{label}</p>
              <strong className="block text-2xl text-text-strong">{value}</strong>
              <small className="block text-xs text-text-subtle">{detail}</small>
            </div>
          </Card>
        ))}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card as="section" padding="lg">
            <PanelHeading title="Lớp học phụ trách" actionLabel="Xem tất cả" onAction={onOpenCourses} />
            <div className="flex flex-col gap-3">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="flex items-center gap-3.5 rounded-xl border border-border-subtle p-3.5"
                >
                  <span
                    className={cn(
                      'grid size-11 shrink-0 place-items-center rounded-xl',
                      TONE_STYLES[(course.color as Tone) in TONE_STYLES ? (course.color as Tone) : 'blue']
                    )}
                  >
                    <BookOpen size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-text-subtle uppercase">{course.subject}</span>
                    <h3 className="truncate text-sm font-semibold text-text-heading">{course.name}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
                      <Users size={13} /> {course.students} học viên
                      <Clock3 size={13} /> {course.next}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={course.progress} size="sm" className="flex-1" />
                      <small className="text-xs text-text-muted">{course.progress}% chương trình</small>
                    </div>
                  </div>
                  <Button
                    type="button"
                    appearance="ghost"
                    size="icon"
                    aria-label={`Xem lớp ${course.name}`}
                    onClick={() => onOpenCourse(course)}
                  >
                    <ChevronRight />
                  </Button>
                </article>
              ))}
            </div>
          </Card>

          <Card as="section" padding="lg">
            <PanelHeading title="Buổi học sắp tới" actionLabel="Xem lịch" onAction={onOpenSchedule} />
            <p className="text-sm text-text-muted">
              Lịch thật được tải ở trang Lịch dạy để tránh hiển thị dữ liệu mẫu.
            </p>
            <Button type="button" appearance="outline" size="sm" className="mt-3" onClick={onOpenSchedule}>
              Mở lịch dạy <ArrowRight size={14} />
            </Button>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <Card as="section" padding="lg">
            <PanelHeading
              title="Cần chấm điểm"
              badge={submissions.length - graded.length}
              actionLabel="Xem tất cả"
              onAction={() => onNotify('Đã hiển thị tất cả bài nộp cần chấm.')}
            />
            <div className="flex flex-col gap-3">
              {submissions.map((item) => {
                const done = graded.includes(item.name)
                return (
                  <article key={item.name} className={cn('flex items-center gap-3', done && 'opacity-60')}>
                    <Avatar fallback={item.initials} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-text-heading">{item.name}</h3>
                      <p className="truncate text-xs text-text-muted">{item.assignment}</p>
                      <small className="text-xs text-text-subtle">
                        {item.group} · {item.submitted}
                      </small>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      appearance={done ? 'ghost' : 'outline'}
                      disabled={done}
                      onClick={() => onGrade(item.name)}
                    >
                      {done ? <CheckCircle2 size={17} /> : 'Chấm'}
                    </Button>
                  </article>
                )
              })}
            </div>
          </Card>

          <Card as="section" padding="lg">
            <PanelHeading
              title="Thống kê học viên"
              actionLabel="Báo cáo"
              onAction={() => onNotify('Báo cáo học viên chi tiết đang được chuẩn bị.')}
            />
            <div className="flex flex-col gap-4">
              {studentStats.map((stat) => (
                <div key={stat.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-text-body">{stat.label}</span>
                    <strong className="text-text-strong">{stat.value}</strong>
                  </div>
                  <p className="mb-1.5 text-xs text-text-subtle">{stat.note}</p>
                  <Progress value={stat.width} size="sm" tone={stat.tone} />
                </div>
              ))}
            </div>
          </Card>

          <section className="flex items-start gap-3 rounded-[14px] bg-badge-info-bg p-4 text-badge-info-text">
            <FileCheck2 size={21} className="mt-0.5 shrink-0" />
            <div>
              <strong className="block text-sm">Gợi ý cho hôm nay</strong>
              <p className="text-[13px]">Hoàn tất 6 bài chấm ưu tiên trước buổi học lúc 19:00.</p>
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}

export default TeacherOverview
