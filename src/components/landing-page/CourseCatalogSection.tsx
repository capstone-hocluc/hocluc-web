import { useEffect, useRef, useState, type RefObject } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import type { Course } from '../../services/courseService'
import { SUBJECTS, type SubjectGroup } from './course-subjects'
import Icon from './Icon'
import LandingCourseCard, { CourseGridSkeleton } from './LandingCourseCard'
import LandingLink from './LandingLink'
import SubjectCourseCard, { SubjectCourseSkeleton } from './SubjectCourseCard'
import { useCourseCatalog, useCourseDetails } from './use-course-catalog'

/** Tab of the whole-exam roadmaps (MAIN courses); every other tab is a subject key. */
export const ROADMAP_TAB = 'tron-goi'

// Opt-in local design preview. Never substitute sample data for a failed real request.
const previewCourses: Course[] = import.meta.env.DEV
  ? [
      {
        id: 'landing-design-preview',
        title: 'V-ACT: Xây nền tảng, vững tư duy',
        description:
          'Củng cố 5 nhóm kiến thức, luyện tập theo chủ đề và hiểu cách giải qua từng bài học.',
        imageUrl: '/landing-v2/assets/hero-classroom-v4.webp',
        targetExam: 'V-ACT',
        price: 1490000,
        startDate: '2026-11-01',
      },
    ]
  : []

// One quiet segmented track, square-cornered and borderless: plain labels, the chosen group lifts out in white.
const triggerClass =
  'inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg px-4 text-[0.9375rem]! font-semibold! text-(--muted) transition-[background-color,color,box-shadow] duration-200 hover:text-(--ink) focus-visible:outline-2! focus-visible:-outline-offset-2! data-[state=active]:bg-white data-[state=active]:text-(--ink) data-[state=active]:shadow-[0_1px_2px_rgba(11,35,72,0.1),0_2px_8px_-2px_rgba(11,35,72,0.14)]'

const FADE_CLASS = {
  none: '',
  start: '[mask-image:linear-gradient(to_right,transparent,black_32px)]',
  end: '[mask-image:linear-gradient(to_right,black_calc(100%_-_32px),transparent)]',
  both: '[mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%_-_32px),transparent)]',
}

// On a narrow screen the track scrolls sideways: fade only the edge that hides tabs, and keep the
// chosen tab in view when it is picked from elsewhere on the page.
function useTabRowScroll(listRef: RefObject<HTMLDivElement | null>, activeKey: string, tabsKey: string) {
  const [fade, setFade] = useState<keyof typeof FADE_CLASS>('none')

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const update = () => {
      const hiddenStart = list.scrollLeft > 1
      const hiddenEnd = list.scrollLeft < list.scrollWidth - list.clientWidth - 1
      setFade(hiddenStart && hiddenEnd ? 'both' : hiddenStart ? 'start' : hiddenEnd ? 'end' : 'none')
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(list)
    for (const tab of list.children) observer.observe(tab)
    list.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      list.removeEventListener('scroll', update)
    }
  }, [listRef, tabsKey])

  useEffect(() => {
    const list = listRef.current
    const tab = list?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    list.scrollTo({
      left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }, [listRef, activeKey, tabsKey])

  return FADE_CLASS[fade]
}

function RoadmapPanel({
  courses,
  status,
  retry,
  isPreview,
}: Pick<ReturnType<typeof useCourseCatalog>, 'courses' | 'status' | 'retry'> & { isPreview: boolean }) {
  return (
    <div aria-busy={status === 'loading'} className="flex flex-col gap-5">
      {isPreview && (
        <p className="course-preview-notice">
          Khóa học minh họa để xem giao diện. Tên, học phí và ngày khai giảng là dữ liệu mẫu.
        </p>
      )}
      {status === 'loading' && <CourseGridSkeleton />}
      {status === 'error' && (
        <div className="course-empty" role="status">
          <Icon name="book-open" />
          <div>
            <h3>Chưa tải được khóa học</h3>
            <p>Kiểm tra kết nối mạng rồi thử lại.</p>
            <button className="btn btn-secondary" type="button" onClick={retry}>
              Thử lại <Icon name="rotate-ccw" />
            </button>
          </div>
        </div>
      )}
      {status === 'ready' && courses.length === 0 && (
        <div className="course-empty" role="status">
          <Icon name="book-open" />
          <div>
            <h3>Khóa học đang được cập nhật</h3>
          </div>
        </div>
      )}
      {status === 'ready' && courses.length > 0 && (
        <>
          {!isPreview && (
            <p className="text-sm md:text-center">Lộ trình nào cũng gồm đủ các môn của bài thi, chỉ khác nhau ở thời gian ôn và nhịp học.</p>
          )}
          <div className="course-grid">
            {courses.slice(0, 3).map((course, index) => (
              <div
                key={course.id}
                className="grid min-w-0 motion-safe:animate-rise"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <LandingCourseCard course={course} preview={isPreview} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SubjectPanel({
  group,
  details,
}: {
  group: SubjectGroup
  details: ReturnType<typeof useCourseDetails>['details']
}) {
  const { subject, courses } = group
  return (
    <div className="flex flex-col gap-5" aria-busy={courses.length === 0 || details === null}>
      <p className="text-sm md:text-center">
        <strong className="font-semibold text-(--ink)">{subject.label}</strong>
        {subject.part && ` · ${subject.part}`}
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses.length === 0
          ? Array.from({ length: 3 }, (_, index) => <SubjectCourseSkeleton key={index} />)
          : courses.map((course, index) => (
              <div
                key={course.id}
                className="grid min-w-0 motion-safe:animate-rise"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <SubjectCourseCard
                  course={course}
                  subject={subject}
                  detail={details ? (details.get(course.id) ?? null) : undefined}
                />
              </div>
            ))}
      </div>
    </div>
  )
}

// The home page's course catalog, first thing after the hero: the roadmaps, then one tab per
// subject with the courses that can be studied on their own.
export default function CourseCatalogSection({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const [isPreview] = useState(
    () =>
      import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview-course') === '1'
  )
  const catalog = useCourseCatalog(isPreview ? previewCourses : undefined)
  const { groups, subjectsStatus } = catalog

  // While the roadmaps' details load, the known subjects already get their tabs (with skeletons),
  // so a subject chosen from the hero opens straight away.
  const tabs: SubjectGroup[] =
    subjectsStatus === 'ready'
      ? groups
      : subjectsStatus === 'loading'
        ? SUBJECTS.map((subject) => ({ subject, courses: [] }))
        : []
  const current =
    activeTab !== ROADMAP_TAB && tabs.some((tab) => tab.subject.key === activeTab)
      ? activeTab
      : ROADMAP_TAB
  const activeGroup = tabs.find((tab) => tab.subject.key === current)
  const { details, prefetch } = useCourseDetails(activeGroup?.courses.map((course) => course.id) ?? [])
  const listRef = useRef<HTMLDivElement>(null)
  const fadeClass = useTabRowScroll(
    listRef,
    current,
    tabs.map((tab) => tab.subject.key).join('|')
  )

  return (
    <section className="section courses-section pt-12!" id="khoa-hoc" aria-labelledby="courses-title">
      <div className="container flex flex-col gap-7">
        <div className="section-heading mb-0!">
          <h2 id="courses-title">Khóa học luyện thi V-ACT</h2>
          <LandingLink className="text-link" href="/courses">
            Xem tất cả khóa học <Icon name="arrow-up-right" />
          </LandingLink>
        </div>

        <Tabs.Root value={current} onValueChange={onTabChange} className="flex flex-col gap-6">
          {tabs.length > 0 && (
            <div className="mx-auto w-fit max-w-full overflow-hidden rounded-xl bg-(--blue-soft)/60">
              <Tabs.List
                ref={listRef}
                aria-label="Nhóm khóa học"
                className={`relative flex items-center gap-1 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${fadeClass}`}
              >
                <Tabs.Trigger value={ROADMAP_TAB} className={triggerClass}>
                  Lộ trình trọn gói
                </Tabs.Trigger>
                <span aria-hidden="true" className="mx-1.5 h-5 w-px shrink-0 bg-(--line)" />
                {tabs.map(({ subject, courses: subjectCourses }) => (
                  <Tabs.Trigger
                    key={subject.key}
                    value={subject.key}
                    className={triggerClass}
                    title={subject.label}
                    onPointerEnter={() => prefetch(subjectCourses.map((course) => course.id))}
                    onFocus={() => prefetch(subjectCourses.map((course) => course.id))}
                  >
                    {subject.short}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </div>
          )}

          <Tabs.Content value={ROADMAP_TAB} className="focus-visible:outline-none!">
            <RoadmapPanel {...catalog} isPreview={isPreview} />
          </Tabs.Content>
          {activeGroup && (
            <Tabs.Content value={activeGroup.subject.key} className="focus-visible:outline-none!">
              <SubjectPanel group={activeGroup} details={details} />
            </Tabs.Content>
          )}
        </Tabs.Root>
      </div>
    </section>
  )
}
