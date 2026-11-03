import { formatDuration } from '../../lib/courseFormat'
import type { CourseChapter } from '../../services/courseService'
import Icon from '../landing-page/Icon'

/** A course's chapters as folding rows, each listing its lessons in order. */
export default function ChapterList({
  chapters,
  purchased,
  openFirst = true,
}: {
  chapters: CourseChapter[]
  purchased: boolean
  openFirst?: boolean
}) {
  return (
    <div className="cd-chapters">
      {chapters.map((chapter, index) => {
        const lessons = [...chapter.lessons].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
        return (
          <details key={chapter.id} className="cd-chapter" open={openFirst && index === 0}>
            <summary>
              <span className="cd-chapter-index">Chương {index + 1}</span>
              <span className="cd-chapter-title">{chapter.title}</span>
              <span className="cd-chapter-count">{lessons.length} bài</span>
              <Icon name="chevron-down" />
            </summary>
            <ul className="cd-lessons">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  <span className="cd-lesson-title">{lesson.title}</span>
                  {lesson.preview && !purchased && <span className="cd-chip is-preview">Học thử</span>}
                  {lesson.durationSeconds ? (
                    <span className="cd-lesson-time">{formatDuration(lesson.durationSeconds)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
