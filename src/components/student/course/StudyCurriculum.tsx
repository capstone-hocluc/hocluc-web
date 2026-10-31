import { CheckCircle2 } from '../../console/icons'
import type {
  CourseStudyChapter,
  CourseStudyPhase,
  CourseStudySection,
} from '../../../services/courseService'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/Accordion'
import Progress from '../../ui/Progress'
import MascotState from '../../common/MascotState'
import LessonRow from './LessonRow'
import QuizRow from './QuizRow'
import { bySequence } from '../../../lib/sequence'
import { studentRoutes } from '../../../lib/studentRoutes'
import { formatStudyPercent, lessonContainsId } from './studyUtils'

function clampPercent(value?: number) {
  return Math.max(0, Math.min(100, value ?? 0))
}

interface CurriculumHandlers {
  currentLessonId: string | null
  currentCourseId: string | null
  onOpenGiftStudy: (courseId: string) => void
  onOpenLesson: (lessonId: string) => void
  onOpenQuiz: (quizId: string) => void
}

function ChapterBlock({
  chapter,
  currentLessonId,
  onOpenLesson,
  onOpenQuiz,
}: CurriculumHandlers & { chapter: CourseStudyChapter }) {
  return (
    <AccordionItem value={chapter.id} className="rounded-xl border border-line bg-surface p-3.5">
      <AccordionTrigger iconSize={18} className="gap-3 text-heading">
        <span className="inline-flex min-w-0 flex-1 items-center gap-2 text-base font-semibold text-text-heading">
          {chapter.title}
          {chapter.completed && <CheckCircle2 size={16} className="shrink-0 text-practice" />}
        </span>
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[13px] font-semibold whitespace-nowrap text-primary-text">
          {chapter.completedLessonCount}/{chapter.lessonCount}
        </span>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2.5 pt-3.5">
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

function SectionBlock({
  section,
  ...handlers
}: CurriculumHandlers & { section: CourseStudySection }) {
  const chapters = bySequence(section.chapters)
  const percent = clampPercent(section.progressPercentage)
  const currentChapterId = chapters.find((chapter) =>
    lessonContainsId(chapter, handlers.currentLessonId)
  )?.id

  return (
    <AccordionItem
      value={section.contentSectionId ?? section.sectionCourseId}
      className="rounded-2xl border border-line bg-surface-tint p-4 max-[640px]:p-3"
    >
      <AccordionTrigger>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[17px] font-semibold text-text-heading">{section.title}</span>
          <span className="text-[13px] font-semibold text-text-secondary">
            {section.categoryName ? `${section.categoryName} · ` : ''}
            {section.completedLessonCount}/{section.lessonCount} bài học
          </span>
        </span>
        <span className="text-sm font-bold whitespace-nowrap text-primary-text">{formatStudyPercent(percent)}</span>
      </AccordionTrigger>
      <Progress value={percent} size="sm" className="mt-3" aria-label={section.title} />
      <AccordionContent>
        <Accordion
          type="multiple"
          defaultValue={[currentChapterId ?? chapters[0]?.id].filter(Boolean)}
          className="flex flex-col gap-2.5 pt-3"
        >
          {chapters.map((chapter) => (
            <ChapterBlock key={chapter.id} chapter={chapter} {...handlers} />
          ))}
        </Accordion>
      </AccordionContent>
    </AccordionItem>
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
      {phase.gifts.map((gift) => (
        <div
          key={gift.courseId}
          className={`min-w-0 rounded-xl border p-4 ${
            handlers.currentLessonId && gift.courseId === handlers.currentCourseId
              ? 'border-transparent bg-surface-brand'
              : 'border-line bg-surface-tint'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="min-w-0 break-words font-semibold text-text-heading">{gift.title}</h3>
            <span className="text-sm font-bold text-primary-text">{formatStudyPercent(gift.progressPercentage)}</span>
          </div>
          <Progress value={clampPercent(gift.progressPercentage ?? 0)} size="sm" className="mt-3" aria-label={gift.title} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{gift.completedLessonCount}/{gift.lessonCount} bài học</span>
            <a href={studentRoutes.courseStudy(gift.courseId)} className="font-semibold text-primary-text underline" onClick={(event) => {
              if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault()
                handlers.onOpenGiftStudy(gift.courseId)
              }
            }}>Vào học</a>
          </div>
        </div>
      ))}
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
    return <MascotState title="Nội dung khóa học đang được cập nhật" message="Nội dung học sẽ sớm xuất hiện tại đây." />
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {named.length > 0 && (
        <Accordion type="multiple" defaultValue={initialPhaseId ? [initialPhaseId] : []} className="flex flex-col gap-3">
          {named.map((phase, index) => (
            <AccordionItem key={phase.id} value={phase.id!} className="rounded-2xl border border-line-card bg-surface p-5 shadow-card max-[640px]:p-3.5">
              <AccordionTrigger>
                <span className="inline-flex min-w-0 flex-1 items-center gap-2.5 text-xl font-bold text-text-heading">
                  <b className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm text-primary-text">{String(index + 1).padStart(2, '0')}</b>
                  {phase.name}
                </span>
                <span className="text-base font-bold text-primary-text">{formatStudyPercent(phase.progressPercentage)}</span>
              </AccordionTrigger>
              <Progress value={clampPercent(phase.progressPercentage)} className="mt-3.5" aria-label={phase.name ?? 'Giai đoạn'} />
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
              <Progress value={clampPercent(unphased.progressPercentage)} className="mt-3" aria-label="Xuyên suốt lộ trình" />
            </>
          )}
          <PhaseContents phase={unphased} {...handlers} />
        </section>
      )}
    </div>
  )
}

export default StudyCurriculum
