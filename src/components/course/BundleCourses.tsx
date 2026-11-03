import { useState } from 'react'
import { getErrorMessage } from '../../lib/errors'
import { getCourseDetail, type CourseDetail, type CoursePhase, type GiftCourse } from '../../services/courseService'
import { subjectFor } from '../landing-page/course-subjects'
import Icon from '../landing-page/Icon'
import LandingLink from '../landing-page/LandingLink'
import ChapterList from './ChapterList'
import { includedCourseSummary, ownChapters } from './course-detail-content'

type Curriculum =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; course: CourseDetail }
  | { status: 'error'; message: string }

// One included course: a row that opens into its own chapters, loaded the first time it opens.
function IncludedCourse({ gift, purchased }: { gift: GiftCourse; purchased: boolean }) {
  const [curriculum, setCurriculum] = useState<Curriculum>({ status: 'idle' })
  const [coverFailed, setCoverFailed] = useState(false)
  const subject = subjectFor(gift.categoryName)
  const { summary, hours } = includedCourseSummary(gift.description)
  const href = `/courses/${encodeURIComponent(gift.courseId)}`

  const load = () => {
    setCurriculum({ status: 'loading' })
    getCourseDetail(gift.courseId)
      .then((response) =>
        setCurriculum(
          response.data
            ? { status: 'ready', course: response.data }
            : { status: 'error', message: 'Không tìm thấy nội dung khóa học.' }
        )
      )
      .catch((error) => setCurriculum({ status: 'error', message: getErrorMessage(error) }))
  }

  const chapters = curriculum.status === 'ready' ? ownChapters(curriculum.course) : []
  const cover = curriculum.status === 'ready' && !coverFailed ? curriculum.course.imageUrl : undefined

  return (
    <li
      className="rounded-(--radius-sm) border border-(--line) bg-(--paper) transition-colors duration-200 hover:border-(--blue) has-[details[open]]:border-(--blue)"
      data-testid="included-course"
    >
      <details
        className="group"
        onToggle={(event) => {
          if (event.currentTarget.open && curriculum.status === 'idle') load()
        }}
      >
        <summary className="flex cursor-pointer list-none items-center gap-3 p-3 sm:gap-4 sm:p-4 [&::-webkit-details-marker]:hidden">
          <span
            className="hidden size-12 shrink-0 place-items-center rounded-xl sm:grid [&_.ui-icon]:size-5"
            style={{ background: subject.soft, color: subject.tone }}
            aria-hidden="true"
          >
            <Icon name={subject.icon} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[0.9375rem] font-semibold leading-snug text-(--ink)">{gift.title}</span>
              <span
                className="rounded-full px-2.5 py-px text-xs font-semibold whitespace-nowrap"
                style={{ background: subject.soft, color: subject.tone }}
              >
                {gift.categoryName || subject.short}
              </span>
            </span>
            {summary && (
              <span className="mt-1 line-clamp-2 block text-(length:--small) leading-normal text-(--muted)">
                {summary}
              </span>
            )}
            <span className="mt-1 block text-(length:--small) text-(--muted) tabular-nums">
              {gift.chapterCount} chương · {gift.lessonCount} bài
              {hours ? ` · ${hours} giờ` : ''}
            </span>
          </span>
          <span className="shrink-0 text-(--muted) transition-transform duration-200 group-open:rotate-180 [&_.ui-icon]:size-[18px]">
            <Icon name="chevron-down" />
          </span>
        </summary>

        <div className="grid gap-4 border-t border-(--line) p-3 sm:p-4 md:grid-cols-[160px_minmax(0,1fr)]">
          <div className="hidden md:block">
            <div className="aspect-[16/10] overflow-hidden rounded-xl" style={{ background: subject.soft }}>
              {cover && (
                <img src={cover} alt="" className="size-full object-cover" onError={() => setCoverFailed(true)} />
              )}
            </div>
          </div>
          <div className="grid min-w-0 gap-3">
            {curriculum.status === 'loading' && (
              <div className="grid gap-2" aria-busy="true">
                <span className="sr-only" role="status">
                  Đang tải nội dung
                </span>
                <div className="h-14 animate-pulse rounded-(--radius-sm) bg-(--soft)" />
                <div className="h-14 animate-pulse rounded-(--radius-sm) bg-(--soft)" />
              </div>
            )}
            {curriculum.status === 'error' && (
              <div className="flex flex-wrap items-center gap-3 text-(length:--small)" role="status">
                <span className="text-(--error)">{curriculum.message}</span>
                <button type="button" className="font-semibold text-(--blue-text)" onClick={load}>
                  Thử lại
                </button>
              </div>
            )}
            {curriculum.status === 'ready' && chapters.length > 0 && (
              <ChapterList chapters={chapters} purchased={purchased} openFirst={false} />
            )}
            <LandingLink className="text-link justify-self-start" href={href}>
              Xem chi tiết khóa học <Icon name="arrow-right" />
            </LandingLink>
          </div>
        </div>
      </details>
    </li>
  )
}

// A course sold as a set of smaller courses: how many it includes, then each phase with the
// courses studied in it. Each course opens into its own chapters.
export default function BundleCourses({ phases, purchased }: { phases: CoursePhase[]; purchased: boolean }) {
  const groups = phases.filter((phase) => phase.gifts.length > 0)
  const gifts = groups.flatMap((phase) => phase.gifts)
  const stageCount = groups.filter((phase) => phase.id).length
  const chapterCount = gifts.reduce((sum, gift) => sum + gift.chapterCount, 0)
  const lessonCount = gifts.reduce((sum, gift) => sum + gift.lessonCount, 0)
  const facts = [
    stageCount > 1 && `${stageCount} giai đoạn`,
    chapterCount > 0 && `${chapterCount} chương`,
    lessonCount > 0 && `${lessonCount} bài học`,
  ].filter(Boolean)
  const stageNumbers = new Map(groups.filter((phase) => phase.id).map((phase, index) => [phase.id, index + 1]))

  return (
    <section className="cd-block" aria-labelledby="cd-bundle-title">
      <h2 id="cd-bundle-title" className="mb-2!">
        Gồm {gifts.length} khóa học
      </h2>
      {facts.length > 0 && <p className="mb-6! tabular-nums">{facts.join(' · ')}</p>}
      <ol className="cd-stages">
        {groups.map((phase) => {
          return (
            <li key={phase.id ?? 'unphased'} className="cd-stage">
              <span className="cd-stage-mark" aria-hidden="true">
                {phase.id ? stageNumbers.get(phase.id) : <Icon name="rotate-ccw" />}
              </span>
              <div className="cd-stage-body min-w-0">
                <h3>
                  {phase.name ?? 'Xuyên suốt lộ trình'}
                  <span className="ml-2 text-(length:--small) font-medium text-(--muted)">
                    {phase.gifts.length} khóa
                  </span>
                </h3>
                <ul className="mt-4 grid list-none gap-3 p-0">
                  {phase.gifts.map((gift) => (
                    <IncludedCourse key={gift.courseId} gift={gift} purchased={purchased} />
                  ))}
                </ul>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
