import { CheckCircle2 } from '../../console/icons'
import { useState } from 'react'
import type {
  CourseStudyChapter,
  CourseStudyPhase,
  CourseStudySection,
  GiftCourse,
  CourseStudy,
} from '../../../services/courseService'
import { getCourseStudy } from '../../../services/courseService'
import { usePageResource } from '../../../hooks/usePageResource'
import ResourceState from '../common/ResourceState'
import Skeleton from '../../ui/Skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/Accordion'
import StatusBadge from '../../ui/StatusBadge'
import MascotState from '../../common/MascotState'
import LessonRow from './LessonRow'
import QuizRow from './QuizRow'
import { bySequence } from '../../../lib/sequence'
import { formatStudyPercent, lessonContainsId } from './studyUtils'
import styles from './CourseStudyAppearance.module.css'

type LearningState = 'completed' | 'in-progress' | 'not-started'

function getLearningState(completed: number, total: number, percent = 0, started = false): LearningState {
  if (percent >= 100 || (total > 0 && completed >= total)) return 'completed'
  return completed > 0 || percent > 0 || started ? 'in-progress' : 'not-started'
}

function LearningStateBadge({ state }: { state: LearningState }) {
  return <StatusBadge size="sm" tone={state === 'completed' ? 'success' : 'neutral'}>
    {state === 'completed' ? 'Đã hoàn thành' : state === 'in-progress' ? 'Đang học' : 'Chưa học'}
  </StatusBadge>
}

interface CurriculumHandlers {
  currentLessonId: string | null
  currentCourseId: string | null
  onOpenLesson: (lessonId: string, courseId?: string) => void
  onOpenQuiz: (quizId: string) => void
}

function ChapterBlock({
  chapter,
  currentLessonId,
  onOpenLesson,
  onOpenQuiz,
}: CurriculumHandlers & { chapter: CourseStudyChapter }) {
  const state = chapter.completed ? 'completed' : getLearningState(chapter.completedLessonCount, chapter.lessonCount, 0,
    chapter.lessons.some(lesson => lesson.status === 'IN_PROGRESS'))
  return (
    <AccordionItem value={chapter.id} className={styles.chapter} data-learning-state={state}>
      <AccordionTrigger iconSize={16} className="min-h-12 gap-2 py-2 text-heading">
        <span className="inline-flex min-w-0 flex-1 items-center gap-2 text-base font-semibold text-text-heading">
          {chapter.title}
          {chapter.completed && <CheckCircle2 size={16} className="shrink-0 text-practice" />}
        </span>
        <StatusBadge size="sm" tone={state === 'completed' ? 'success' : 'neutral'}>
          {chapter.completedLessonCount}/{chapter.lessonCount}
        </StatusBadge>
      </AccordionTrigger>
      <AccordionContent className={styles.lessonList}>
        {bySequence(chapter.lessons).map((lesson) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            isCurrent={lesson.id === currentLessonId}
            onOpen={onOpenLesson}
            onOpenQuiz={onOpenQuiz}
          />
        ))}
        {chapter.quizzes.map((quiz) => (
          <QuizRow key={quiz.id} quiz={quiz} onOpenQuiz={onOpenQuiz} />
        ))}
      </AccordionContent>
    </AccordionItem>
  )
}

function ChapterList({ chapters, ...handlers }: CurriculumHandlers & { chapters: CourseStudyChapter[] }) {
  const sorted = bySequence(chapters)
  const currentChapterId = sorted.find((chapter) =>
    lessonContainsId(chapter, handlers.currentLessonId)
  )?.id

  return (
    <Accordion type="multiple" defaultValue={currentChapterId ? [currentChapterId] : []}>
      {sorted.map((chapter) => <ChapterBlock key={chapter.id} chapter={chapter} {...handlers} />)}
    </Accordion>
  )
}

function SectionBlock({
  section,
  ...handlers
}: CurriculumHandlers & { section: CourseStudySection }) {
  const state = getLearningState(section.completedLessonCount, section.lessonCount, section.progressPercentage,
    section.chapters.some(chapter => chapter.lessons.some(lesson => lesson.status === 'IN_PROGRESS')))

  return (
    <AccordionItem
      value={section.contentSectionId ?? section.sectionCourseId}
      className={styles.learningUnit}
      data-learning-state={state}
    >
      <AccordionTrigger>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[17px] font-semibold text-text-heading">{section.title}</span>
          <span className="text-[13px] font-semibold text-text-secondary">
            {section.categoryName ? `${section.categoryName} · ` : ''}
            {section.completedLessonCount}/{section.lessonCount} bài học
          </span>
        </span>
        <LearningStateBadge state={state} />
      </AccordionTrigger>
      <AccordionContent className={styles.chapters}>
        <ChapterList chapters={section.chapters} {...handlers} />
      </AccordionContent>
    </AccordionItem>
  )
}

function GiftLessons({ gift, onLoaded, ...handlers }: CurriculumHandlers & { gift: GiftCourse; onLoaded: (study: CourseStudy) => void }) {
  const { data: study, status, errorMessage, reload } = usePageResource(
    () => getCourseStudy(gift.courseId), [gift.courseId], { onLoaded }
  )
  const sections = study ? bySequence(study.phases).flatMap((phase) => bySequence(phase.sections)) : []
  const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi')
  return (
    <div className="pt-3">
      <ResourceState imageSrc="/mascot/03.png" status={status} errorMessage={errorMessage} onRetry={reload}
        loading={<Skeleton className="h-24 rounded-xl" />}
        forbidden={{ title: 'Chưa thể truy cập nội dung này', message: 'Bạn chưa có quyền học khóa học này.' }}
        notFound={{ title: 'Không tìm thấy nội dung khóa học' }}
        error={{ title: 'Không thể tải danh sách bài học' }} />
      {status === 'ready' && (sections.length > 0 ? (
        <div className={styles.chapters}>
          {sections.map((section, index) => (
            <div key={`${section.contentSectionId ?? section.sectionCourseId}-${index}`}>
              {(sections.length > 1 || normalizeTitle(section.title) !== normalizeTitle(gift.title)) && (
                <h4 className={styles.sectionHeading}>{section.title}</h4>
              )}
              <ChapterList chapters={section.chapters} {...handlers}
                onOpenLesson={(lessonId) => handlers.onOpenLesson(lessonId, gift.courseId)} />
            </div>
          ))}
        </div>
      ) : <MascotState imageSrc="/mascot/03.png" title="Chưa có bài học" message="Nội dung khóa học đang được cập nhật." />)}
    </div>
  )
}

function GiftBlock({ gift, ...handlers }: CurriculumHandlers & { gift: GiftCourse }) {
  const [detailState, setDetailState] = useState<LearningState>('not-started')
  const isCurrent = Boolean(handlers.currentLessonId && gift.courseId === handlers.currentCourseId)
  const summaryState = getLearningState(gift.completedLessonCount, gift.lessonCount, gift.progressPercentage ?? 0)
  const state = summaryState === 'completed' || detailState === 'completed' ? 'completed'
    : summaryState === 'in-progress' || detailState === 'in-progress' ? 'in-progress' : 'not-started'
  return (
    <Accordion type="multiple" defaultValue={isCurrent ? [gift.courseId] : []}>
      <AccordionItem value={gift.courseId} className={styles.learningUnit} data-learning-state={state}>
        <AccordionTrigger>
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="break-words font-semibold text-text-heading">{gift.title}</span>
            <span className="text-xs font-medium whitespace-nowrap text-text-secondary">{gift.completedLessonCount}/{gift.lessonCount} bài học</span>
          </span>
          <LearningStateBadge state={state} />
        </AccordionTrigger>
        <AccordionContent><GiftLessons gift={gift} {...handlers} onLoaded={(study) => setDetailState(
          getLearningState(study.completedLessons, study.totalLessons, study.progressPercentage,
            study.phases.some(phase => phase.sections.some(section => section.chapters.some(chapter =>
              chapter.lessons.some(lesson => lesson.status === 'IN_PROGRESS')))))
        )} /></AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function PhaseContents({ phase, ...handlers }: CurriculumHandlers & { phase: CourseStudyPhase }) {
  const sections = bySequence(phase.sections)
  const currentSection = sections.find((section) =>
    section.chapters.some((chapter) => lessonContainsId(chapter, handlers.currentLessonId))
  )
  const initialSection = currentSection ?? sections[0]
  return (
    <div className="flex flex-col gap-3 pt-3">
      {sections.length > 0 && (
        <Accordion
          type="multiple"
          defaultValue={initialSection ? [initialSection.contentSectionId ?? initialSection.sectionCourseId] : []}
          className="flex flex-col gap-2.5"
        >
          {sections.map((section) => (
            <SectionBlock key={section.contentSectionId ?? section.sectionCourseId} section={section} {...handlers} />
          ))}
        </Accordion>
      )}
      {phase.gifts.map((gift) => <GiftBlock key={gift.courseId} gift={gift} {...handlers} />)}
    </div>
  )
}

interface StudyCurriculumProps extends CurriculumHandlers {
  phases: CourseStudyPhase[]
}

function StudyCurriculum({ phases, ...handlers }: StudyCurriculumProps) {
  const sortedPhases = bySequence(phases)
  const named = sortedPhases.filter((phase) => phase.id !== null)
  const unphased = sortedPhases.find((phase) => phase.id === null)
  const currentPhase = named.find((phase) =>
    phase.sections.some((section) =>
      section.chapters.some((chapter) => lessonContainsId(chapter, handlers.currentLessonId))
    ) ||
    (handlers.currentLessonId && phase.gifts.some((gift) => gift.courseId === handlers.currentCourseId))
  )
  const initialPhaseId = currentPhase?.id ?? named[0]?.id

  if (sortedPhases.length === 0) {
    return <MascotState imageSrc="/mascot/03.png" title="Nội dung khóa học đang được cập nhật" message="Nội dung học sẽ sớm xuất hiện tại đây." />
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {named.length > 0 && (
        <Accordion type="multiple" defaultValue={initialPhaseId ? [initialPhaseId] : []} className="flex flex-col gap-3">
          {named.map((phase, index) => (
            <AccordionItem key={phase.id} value={phase.id!} className={`${styles.phase} rounded-2xl border p-4 max-[640px]:p-3.5`}>
              <AccordionTrigger>
                <span className="inline-flex min-w-0 flex-1 items-center gap-2.5 text-xl font-bold text-text-heading">
                  <b className={`${styles.phaseNumber} grid size-9 shrink-0 place-items-center rounded-xl text-sm`}>{String(index + 1).padStart(2, '0')}</b>
                  {phase.name}
                </span>
                <span className="text-base font-bold text-primary-text">{formatStudyPercent(phase.progressPercentage)}</span>
              </AccordionTrigger>
              <AccordionContent><PhaseContents phase={phase} {...handlers} /></AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      {unphased && (
        <section className="min-w-0">
          {named.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-text-heading">Xuyên suốt lộ trình</h2>
                <span className="font-bold text-primary-text">{formatStudyPercent(unphased.progressPercentage)}</span>
              </div>
            </>
          )}
          <PhaseContents phase={unphased} {...handlers} />
        </section>
      )}
    </div>
  )
}

export default StudyCurriculum
