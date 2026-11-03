import { useMemo } from 'react'
import Icon from '../landing-page/Icon'
import LandingLink from '../landing-page/LandingLink'
import { courseCurrency, courseDate, formatCoursePrice, parseCourseDate } from '../landing-page/landing-course-format'
import { useCourseDetails } from '../landing-page/use-course-catalog'
import type { Course, CourseDetail } from '../../services/courseService'
import {
  BADGE_LABELS,
  daysFrom,
  examIsTentative,
  fitFor,
  openingLabel,
  pickBadges,
  prepWeeks,
  type RoadmapBadge,
} from './roadmap-compare'

// "Luyện thi … · Lộ trình Dài hạn – Từ nền tảng…" reads as "Lộ trình Dài hạn" in the comparison;
// a title without that shape is shown whole.
function shortName(title: string) {
  const part = title.split(' · ')[1]?.split(' – ')[0]?.trim()
  return part || title
}

const formatDay = (value?: string) => {
  const date = parseCourseDate(value)
  return date ? courseDate.format(date) : null
}

// A per-week figure only reads well for a paid roadmap of at least a few weeks; rounded to the thousand.
function perWeek(price: number | undefined, weeks: number | null) {
  if (typeof price !== 'number' || price <= 0 || !weeks || weeks < 4) return null
  return `Khoảng ${courseCurrency.format(Math.round(price / weeks / 1000) * 1000)} mỗi tuần`
}

function subCourseCount(detail: CourseDetail | null | undefined) {
  if (!detail) return null
  const fromPhases = (detail.phases ?? []).reduce((sum, phase) => sum + (phase.gifts?.length ?? 0), 0)
  const count = detail.giftCount || fromPhases
  return count > 0 ? count : null
}

function Fact({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-(--line) py-3">
      <dt className="text-[0.875rem] text-(--muted)">{label}</dt>
      <dd className="m-0 text-right text-[0.9375rem] font-semibold tabular-nums">
        {value}
        {note && <span className="block text-[0.8125rem] font-normal text-(--muted)">{note}</span>}
      </dd>
    </div>
  )
}

function PlanCard({
  course,
  badge,
  detail,
  today,
}: {
  course: Course
  badge?: RoadmapBadge
  detail: CourseDetail | null | undefined
  today: Date
}) {
  const href = `/courses/${encodeURIComponent(course.id)}`
  const weeks = prepWeeks(course)
  const fit = fitFor(weeks)
  const price = formatCoursePrice(course.price)
  const weekly = perWeek(course.price, weeks)
  const start = formatDay(course.startDate)
  const exam = formatDay(course.examSessionDate)
  const examName = course.examSession?.name
  const subCourses = subCourseCount(detail)
  const phases = detail?.phaseCount && detail.phaseCount > 1 ? detail.phaseCount : null
  const featured = badge === 'recommended' || badge === 'suggested'

  return (
    <article
      className={`roadmap-plan flex h-full flex-col gap-5 rounded-(--radius) border bg-(--paper) p-6 ${
        featured ? 'border-(--blue) shadow-[0_18px_40px_-24px_rgba(11,58,130,0.55)] ring-1 ring-(--blue)' : 'border-(--line)'
      }`}
    >
      <div className="flex h-8 items-center">
        {course.purchased ? (
          <span className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-(--good)">
            <Icon name="check" /> Đã sở hữu
          </span>
        ) : (
          badge && (
            <span
              className={`roadmap-badge rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${
                featured ? 'bg-(--action) text-(--on-action)' : 'bg-(--blue-soft) text-(--blue-text)'
              }`}
            >
              {BADGE_LABELS[badge]}
            </span>
          )
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3>{shortName(course.title)}</h3>
        {fit && <p className="text-[0.9375rem]! leading-normal">{fit}</p>}
      </div>

      {price && (
        <div>
          <strong className="block text-[1.75rem] leading-tight font-bold tracking-[-0.03em] tabular-nums">
            {price}
          </strong>
          {weekly && <span className="text-[0.8125rem] text-(--muted)">{weekly}</span>}
        </div>
      )}

      <dl className="m-0">
        {start && <Fact label="Khai giảng" value={start} note={openingLabel(daysFrom(today, course.startDate))} />}
        {weeks && <Fact label="Thời gian ôn" value={`${weeks} tuần`} />}
        {exam && (
          <Fact
            label="Ngày thi"
            value={examName ? `${examName} · ${exam}` : exam}
            note={examIsTentative(course) ? 'Dự kiến' : null}
          />
        )}
      </dl>

      {(course.targetExam === 'VNUHCM_DGNL' || subCourses) && (
        <ul className="flex list-none flex-col gap-2 p-0 text-[0.9375rem]">
          {course.targetExam === 'VNUHCM_DGNL' && (
            <li className="flex items-start gap-2">
              <Icon name="check" />
              <span>Đủ 4 phần thi V-ACT</span>
            </li>
          )}
          {subCourses && (
            <li className="flex items-start gap-2">
              <Icon name="check" />
              <span>
                {subCourses} khóa học thành phần{phases && `, chia ${phases} giai đoạn`}
              </span>
            </li>
          )}
        </ul>
      )}

      <LandingLink className={`btn ${featured ? 'btn-primary' : 'btn-secondary'} mt-auto w-full`} href={href}>
        {course.purchased ? 'Vào học' : 'Xem lộ trình'} <Icon name="arrow-right" />
        <span className="sr-only"> {shortName(course.title)}</span>
      </LandingLink>
    </article>
  )
}

// The roadmaps side by side, as plans to choose from: what each one suits, when it opens, how long it
// gives before its own exam and what it costs. Swipes sideways on a phone.
export default function RoadmapCompare({ courses }: { courses: Course[] }) {
  const today = useMemo(() => new Date(), [])
  const badges = useMemo(() => pickBadges(courses, today), [courses, today])
  const ids = useMemo(() => courses.map((course) => course.id), [courses])
  const { details } = useCourseDetails(ids)

  return (
    <section className="section catalog-compare" aria-labelledby="catalog-compare-title">
      <div className="container">
        <div className="section-heading">
          <div>
            <h2 id="catalog-compare-title">Lộ trình nào vừa với thời gian của bạn?</h2>
            <p>So sánh ngày khai giảng, thời gian ôn và học phí của từng lộ trình.</p>
          </div>
        </div>
        <ul
          className="roadmap-plans relative -mx-5! flex list-none snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pt-2 pb-4 md:mx-0! md:grid md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] md:gap-6 md:overflow-visible md:px-0"
          aria-label="Các lộ trình"
        >
          {courses.map((course) => (
            <li key={course.id} className="w-[85%] max-w-[360px] shrink-0 snap-start md:w-auto md:max-w-none">
              <PlanCard course={course} badge={badges.get(course.id)} detail={details?.get(course.id)} today={today} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
