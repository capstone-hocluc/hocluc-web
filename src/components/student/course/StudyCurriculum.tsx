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
import { lessonContainsId } from './studyUtils'

function clampPercent(value?: number) {
  return Math.max(0, Math.min(100, value ?? 0))
}

interface CurriculumHandlers {
  currentLessonId: string | null
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
    <AccordionItem value={chapter.id} className="rounded-[15px] border border-line bg-surface p-3">
      <AccordionTrigger iconSize={16} className="gap-3 text-heading">
        <span className="inline-flex min-w-0 flex-1 items-center gap-2 text-sm font-extrabold text-text-heading">
          {chapter.title}
          {chapter.completed && <CheckCircle2 size={14} className="shrink-0 text-practice" />}
        </span>
        <span className="text-[13px] font-extrabold whitespace-nowrap text-text-heading">
          {chapter.completedLessonCount}/{chapter.lessonCount}
        </span>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2 pt-[11px]">
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
      value={section.sectionCourseId}
      className="rounded-[15px] border border-line bg-surface-tint p-3"
    >
      <AccordionTrigger>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[15px] font-extrabold text-text-heading">{section.title}</span>
          <span className="text-xs font-medium text-text-secondary">
            {section.categoryName ? `${section.categoryName} · ` : ''}
            {section.completedLessonCount}/{section.lessonCount} bài học
          </span>
        </span>
        <span className="text-[13px] font-extrabold whitespace-nowrap text-primary">
          {percent}%
        </span>
      </AccordionTrigger>
      <Progress value={percent} size="sm" className="mt-[11px]" aria-label={section.title} />
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

function PhaseBlock({
  phase,
  index,
  ...handlers
}: CurriculumHandlers & { phase: CourseStudyPhase; index: number }) {
  const sections = bySequence(phase.sections)
  const currentSectionId = sections.find((section) =>
    section.chapters.some((chapter) => lessonContainsId(chapter, handlers.currentLessonId))
  )?.sectionCourseId

  // Derived from the sections' real lesson counts - the API has no phase-level figure.
  const totalLessons = sections.reduce((sum, section) => sum + (section.lessonCount ?? 0), 0)
  const doneLessons = sections.reduce(
    (sum, section) => sum + (section.completedLessonCount ?? 0),
    0
  )
  const percent =
    totalLessons > 0 ? clampPercent(Math.round((doneLessons / totalLessons) * 100)) : 0

  return (
    <AccordionItem
      value={phase.id}
      className="rounded-[18px] border border-line-card bg-surface p-4 shadow-card-soft max-[640px]:p-3"
    >
      <AccordionTrigger>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="inline-flex items-center gap-2 text-[15px] font-extrabold text-text-heading">
            <b className="grid size-[30px] shrink-0 place-items-center rounded-[10px] bg-primary-soft text-xs font-extrabold text-primary">
              {String(index + 1).padStart(2, '0')}
            </b>
            {phase.name}
          </span>
          {phase.description && (
            <span className="text-xs font-medium text-text-secondary">{phase.description}</span>
          )}
        </span>
        <span className="text-[13px] font-extrabold whitespace-nowrap text-primary">
          {percent}%
        </span>
      </AccordionTrigger>
      <Progress value={percent} className="mt-[11px]" aria-label={phase.name} />
      <AccordionContent>
        <Accordion
          type="multiple"
          defaultValue={[currentSectionId ?? sections[0]?.sectionCourseId].filter(Boolean)}
          className="flex flex-col gap-2.5 pt-3"
        >
          {sections.map((section) => (
            <SectionBlock key={section.sectionCourseId} section={section} {...handlers} />
          ))}
        </Accordion>
      </AccordionContent>
    </AccordionItem>
  )
}

interface StudyCurriculumProps extends CurriculumHandlers {
  phases: CourseStudyPhase[]
}

// Phase > section > chapter > lesson/quiz. Each level is a Radix Accordion;
// the phase / section / chapter holding the current lesson (else the first)
// starts open, the rest collapsed.
function StudyCurriculum({ phases, ...handlers }: StudyCurriculumProps) {
  const sortedPhases = bySequence(phases)
  const currentPhaseId = sortedPhases.find((phase) =>
    phase.sections.some((section) =>
      section.chapters.some((chapter) => lessonContainsId(chapter, handlers.currentLessonId))
    )
  )?.id

  if (sortedPhases.length === 0) {
    return (
      <MascotState
        title="Nội dung khóa học đang được cập nhật"
        message="Nội dung học sẽ sớm xuất hiện tại đây."
      />
    )
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={[currentPhaseId ?? sortedPhases[0].id]}
      className="flex flex-col gap-3"
    >
      {sortedPhases.map((phase, index) => (
        <PhaseBlock key={phase.id} phase={phase} index={index} {...handlers} />
      ))}
    </Accordion>
  )
}

export default StudyCurriculum
