import type { CourseStudyLesson, CourseStudyPhase } from '../../../services/courseService'
import { bySequence } from '../../../lib/sequence'

// Used only when the backend gives no continueLessonId (e.g. a fresh
// enrollment) - finds the first real lesson from the actual curriculum so
// "Bắt đầu học" points somewhere real instead of being invented.
export function findFirstLesson(phases: CourseStudyPhase[]): CourseStudyLesson | null {
  for (const phase of bySequence(phases)) {
    for (const section of bySequence(phase.sections)) {
      for (const chapter of bySequence(section.chapters)) {
        const lessons = bySequence(chapter.lessons)
        if (lessons.length > 0) return lessons[0]
      }
    }
  }
  return null
}

export function lessonContainsId(
  chapter: { lessons: { id: string }[] },
  lessonId: string | null | undefined
) {
  return Boolean(lessonId) && chapter.lessons.some((lesson) => lesson.id === lessonId)
}

/** Formats learning progress without hiding a nonzero value below one percent. */
export function formatStudyPercent(value: number | null | undefined): string {
  const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value! : 0))
  return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`
}
