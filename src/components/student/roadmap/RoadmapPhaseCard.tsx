import { useState } from 'react'
import { ChevronDown } from '../../console/icons'
import Card, { CardTitle } from '../../ui/Card'
import Progress from '../../ui/Progress'
import RoadmapLessonRow from './RoadmapLessonRow'
import type { RoadmapPhase } from '../../../services/roadmapService'
import styles from './RoadmapPhaseCard.module.css'

interface RoadmapPhaseCardProps {
  phase: RoadmapPhase
  onOpenLesson: (courseId: string, lessonId: string) => void
  onOpenQuiz: (quizId: string) => void
}

export default function RoadmapPhaseCard({
  phase,
  onOpenLesson,
  onOpenQuiz,
}: RoadmapPhaseCardProps) {
  const [showSkipped, setShowSkipped] = useState(false)

  const activeLessons = phase.lessons.filter((lesson) => lesson.state !== 'SKIPPED_MASTERED')
  const skippedLessons = phase.lessons.filter((lesson) => lesson.state === 'SKIPPED_MASTERED')
  const doneCount = phase.completedLessons + phase.skippedMasteredLessons
  const percent = phase.totalLessons > 0 ? Math.round((doneCount / phase.totalLessons) * 100) : 0

  return (
    <Card as="section" padding="lg" radius="xl" className="space-y-3">
      <div className={styles.header}>
        <CardTitle className="mb-0 text-lg">{phase.name}</CardTitle>
        <span className={styles.summary}>
          {doneCount}/{phase.totalLessons} bài
        </span>
      </div>

      <Progress value={percent} size="sm" aria-label={`Tiến độ ${phase.name}`} />

      {activeLessons.length > 0 && (
        <div className="flex flex-col">
          {activeLessons.map((lesson) => (
            <RoadmapLessonRow
              key={lesson.lessonId}
              lesson={lesson}
              onOpenLesson={onOpenLesson}
              onOpenQuiz={onOpenQuiz}
            />
          ))}
        </div>
      )}

      {skippedLessons.length > 0 && (
        <div className="border-t border-line pt-2">
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={showSkipped}
            onClick={() => setShowSkipped((prev) => !prev)}
          >
            <span>Đã vững ({skippedLessons.length} bài bỏ qua)</span>
            <ChevronDown
              size={15}
              className={`${styles.chevron}${showSkipped ? ` ${styles.chevronOpen}` : ''}`}
            />
          </button>
          {showSkipped && (
            <div className="mt-2 flex flex-col">
              {skippedLessons.map((lesson) => (
                <RoadmapLessonRow
                  key={lesson.lessonId}
                  lesson={lesson}
                  onOpenLesson={onOpenLesson}
                  onOpenQuiz={onOpenQuiz}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
