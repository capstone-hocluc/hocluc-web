import { useState } from 'react'
import type { CourseDetail } from '../../services/courseService'
import type { SubjectCourse, SubjectStyle } from './course-subjects'
import Icon from './Icon'
import LandingLink from './LandingLink'
import { formatCoursePrice } from './landing-course-format'
import { tiltClass, usePointerTilt } from './use-pointer-tilt'

interface SubjectCourseCardProps {
  course: SubjectCourse
  subject: SubjectStyle
  /** undefined while loading; null when the course page could not be read. */
  detail: CourseDetail | null | undefined
}

// One course of a subject. Price, cover and ownership come from the course's own page; a standalone
// course that is not paid is only studied inside a roadmap, so it shows no price or buy cue.
export default function SubjectCourseCard({ course, subject, detail }: SubjectCourseCardProps) {
  const tilt = usePointerTilt<HTMLElement>(5)
  const [coverFailed, setCoverFailed] = useState(false)
  const unreadable = detail === null
  const href = `/courses/${encodeURIComponent(unreadable ? course.roadmapIds[0] : course.id)}`
  const cover = detail?.imageUrl && !coverFailed ? detail.imageUrl : null
  const price = detail?.paid ? formatCoursePrice(detail.price) : null
  const intro = detail?.shortIntroduction || course.description

  return (
    <article
      ref={tilt}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-(--line) bg-white shadow-[0_1px_2px_rgba(11,35,72,0.04)] hover:-translate-y-1 hover:shadow-[0_22px_44px_-18px_rgba(11,35,72,0.28)] has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-(--blue-text) ${tiltClass}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden" style={{ background: subject.soft }}>
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div
            className="grid h-full place-items-center [&_.ui-icon]:h-12! [&_.ui-icon]:w-12! [&_.ui-icon]:stroke-[1.3]!"
            style={{ color: subject.tone }}
            aria-hidden="true"
          >
            {detail === undefined ? (
              <span className="h-full w-full animate-pulse bg-white/40" />
            ) : (
              <Icon name={subject.icon} />
            )}
          </div>
        )}
        {detail?.purchased && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-(--ink) px-2.5 py-1 text-xs font-bold text-white [&_.ui-icon]:h-3.5! [&_.ui-icon]:w-3.5!">
            <Icon name="check" /> Đã sở hữu
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-[1.0625rem]! leading-snug!">
          <LandingLink
            href={href}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none!"
          >
            {course.title}
          </LandingLink>
        </h3>
        {intro && <p className="line-clamp-2 text-sm! leading-relaxed!">{intro}</p>}
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-(--muted)">
          {course.lessonCount > 0 && <li>{course.lessonCount} bài học</li>}
          {course.chapterCount > 0 && <li>{course.chapterCount} chương</li>}
          <li>Có trong {course.roadmapIds.length} lộ trình</li>
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-(--line) pt-4">
          <div className="min-h-11">
            {detail === undefined ? (
              <span className="mt-4 block h-5 w-24 animate-pulse rounded bg-(--soft)" aria-hidden="true" />
            ) : price ? (
              <>
                <span className="block text-xs text-(--muted)">Học phí</span>
                <strong className="text-lg font-bold text-(--ink)">{price}</strong>
              </>
            ) : (
              <span className="block pt-5 text-xs font-semibold text-(--muted)">Học trong lộ trình</span>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--blue-text) [&_.ui-icon]:transition-transform group-hover:[&_.ui-icon]:translate-x-1">
            {detail?.purchased ? 'Vào học' : unreadable ? 'Xem lộ trình' : 'Xem chi tiết'}
            <Icon name="arrow-right" />
          </span>
        </div>
      </div>
    </article>
  )
}

export function SubjectCourseSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-(--line) bg-white" aria-hidden="true">
      <div className="aspect-[16/10] animate-pulse bg-(--soft)" />
      <div className="flex flex-col gap-3 p-5">
        <span className="h-5 w-4/5 animate-pulse rounded bg-(--soft)" />
        <span className="h-4 w-full animate-pulse rounded bg-(--soft)" />
        <span className="h-4 w-2/3 animate-pulse rounded bg-(--soft)" />
      </div>
    </div>
  )
}
