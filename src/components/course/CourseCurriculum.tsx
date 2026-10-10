import { useState } from 'react'
import { ChevronDown, FileText, HelpCircle, Lock, PlayCircle, Sparkles } from '../console/icons'
import MascotState from '../common/MascotState'
import type { CourseChapter, CoursePhase, CourseLesson } from '../../services/courseService'
import { formatDuration, prettifyEnum } from '../../lib/courseFormat'

function bySequence<T extends { sequence?: number }>(items: T[]) {
  return [...items].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
}

function countLessons(phase: CoursePhase) {
  return phase.sections.reduce(
    (total, section) =>
      total + section.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0),
    0
  )
}

function countChapters(phase: CoursePhase) {
  return phase.sections.reduce((total, section) => total + section.chapters.length, 0)
}

interface LessonRowProps {
  lesson: CourseLesson
  locked: boolean
}

function LessonRow({ lesson, locked }: LessonRowProps) {
  return (
    <div className="hl-cd-lesson-row">
      <span className="hl-cd-lesson-icon">
        {locked ? <Lock size={15} /> : <PlayCircle size={15} />}
      </span>
      <span className="hl-cd-lesson-title">{lesson.title}</span>
      {lesson.preview && (
        <span className="hl-cd-lesson-badge">
          <Sparkles size={11} />
          Học thử
        </span>
      )}
      <span className="hl-cd-lesson-meta">
        {lesson.contentType && <span>{prettifyEnum(lesson.contentType)}</span>}
        {Boolean(lesson.quizCount) && (
          <span>
            <HelpCircle size={13} />
            {lesson.quizCount}
          </span>
        )}
        {Boolean(lesson.assignmentCount) && (
          <span>
            <FileText size={13} />
            {lesson.assignmentCount}
          </span>
        )}
        {lesson.durationSeconds ? <span>{formatDuration(lesson.durationSeconds)}</span> : null}
      </span>
    </div>
  )
}

interface ChapterBlockProps {
  chapter: CourseChapter
  purchased: boolean
}

function ChapterBlock({ chapter, purchased }: ChapterBlockProps) {
  const [open, setOpen] = useState(false)
  const lessons = bySequence(chapter.lessons)

  return (
    <div className="hl-cd-chapter">
      <button
        type="button"
        className="hl-cd-chapter-header"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <ChevronDown size={16} className={open ? 'is-open' : ''} />
        <span className="hl-cd-chapter-title">{chapter.title}</span>
        <span className="hl-cd-chapter-count">
          {lessons.length} bài học
          {Boolean(chapter.quizCount) && ` · ${chapter.quizCount} quiz`}
        </span>
      </button>
      {open && (
        <div className="hl-cd-chapter-body">
          {chapter.description && <p className="hl-cd-chapter-desc">{chapter.description}</p>}
          {lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} locked={!purchased && !lesson.preview} />
          ))}
        </div>
      )}
    </div>
  )
}

interface CourseCurriculumProps {
  phases: CoursePhase[]
  purchased: boolean
}

function CourseCurriculum({ phases, purchased }: CourseCurriculumProps) {
  const [openPhaseId, setOpenPhaseId] = useState<string | null>(phases[0]?.id ?? null)
  const sortedPhases = bySequence(phases)

  if (sortedPhases.length === 0) {
    return (
      <section className="hl-cd-section">
        <h2>Nội dung khóa học</h2>
        <MascotState
          title="Nội dung khóa học đang được cập nhật"
          message="Nội dung học sẽ sớm xuất hiện tại đây."
        />
      </section>
    )
  }

  return (
    <section className="hl-cd-section">
      <h2>Nội dung khóa học</h2>
      <div className="hl-cd-curriculum">
        {sortedPhases.map((phase) => {
          const isOpen = openPhaseId === phase.id
          return (
            <div className="hl-cd-phase" key={phase.id}>
              <button
                type="button"
                className="hl-cd-phase-header"
                onClick={() => setOpenPhaseId(isOpen ? null : phase.id)}
                aria-expanded={isOpen}
              >
                <ChevronDown size={18} className={isOpen ? 'is-open' : ''} />
                <div>
                  <span className="hl-cd-phase-title">{phase.name}</span>
                  <span className="hl-cd-phase-summary">
                    {countChapters(phase)} chương · {countLessons(phase)} bài học
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="hl-cd-phase-body">
                  {phase.description && <p className="hl-cd-phase-desc">{phase.description}</p>}
                  {bySequence(phase.sections).map((section) => (
                    <div className="hl-cd-section-block" key={section.sectionCourseId}>
                      <div className="hl-cd-section-header">
                        <span className="hl-cd-section-title">{section.title}</span>
                        {section.categoryName && (
                          <span className="hl-cd-section-category">{section.categoryName}</span>
                        )}
                      </div>
                      {section.description && (
                        <p className="hl-cd-section-desc">{section.description}</p>
                      )}
                      {bySequence(section.chapters).map((chapter) => (
                        <ChapterBlock key={chapter.id} chapter={chapter} purchased={purchased} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default CourseCurriculum
