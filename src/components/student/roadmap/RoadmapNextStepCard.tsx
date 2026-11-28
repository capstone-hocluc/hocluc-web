import { ArrowRight } from '../../console/icons'
import Button from '../../ui/Button'
import StatusBadge from '../../ui/StatusBadge'
import { NEXT_ACTION_LABELS } from '../../../lib/roadmapFormat'
import type { RoadmapNextAction } from '../../../services/roadmapService'
import styles from './RoadmapNextStepCard.module.css'

interface RoadmapNextStepCardProps {
  nextAction: RoadmapNextAction
  onOpenLesson: (courseId: string, lessonId: string) => void
  onOpenQuiz: (quizId: string) => void
  onOpenCourses: () => void
  onOpenPlacement: () => void
}

export default function RoadmapNextStepCard({
  nextAction,
  onOpenLesson,
  onOpenQuiz,
  onOpenCourses,
  onOpenPlacement,
}: RoadmapNextStepCardProps) {
  const meta = NEXT_ACTION_LABELS[nextAction.type]
  const targetTitle =
    nextAction.lessonTitle ||
    nextAction.skillNameVi ||
    nextAction.quizTitle ||
    meta.title

  const handleAction = () => {
    switch (nextAction.type) {
      case 'STUDY_LESSON':
        if (nextAction.courseId && nextAction.lessonId) {
          onOpenLesson(nextAction.courseId, nextAction.lessonId)
        } else if (nextAction.quizId) {
          onOpenQuiz(nextAction.quizId)
        } else {
          onOpenCourses()
        }
        break
      case 'REVIEW_SKILL':
        if (nextAction.quizId) {
          onOpenQuiz(nextAction.quizId)
        } else if (nextAction.courseId && nextAction.lessonId) {
          onOpenLesson(nextAction.courseId, nextAction.lessonId)
        } else {
          onOpenPlacement()
        }
        break
      case 'TAKE_PLACEMENT':
      case 'COMPLETE':
        onOpenPlacement()
        break
      case 'CHOOSE_COURSE':
        onOpenCourses()
        break
    }
  }

  const tone =
    nextAction.type === 'COMPLETE'
      ? 'success'
      : nextAction.type === 'REVIEW_SKILL'
        ? 'warning'
        : 'primary'

  return (
    <section className={styles.card} aria-label={meta.title}>
      <div className={styles.content}>
        <StatusBadge tone={tone} size="sm">
          {meta.title}
        </StatusBadge>
        <h2 className={styles.title}>{targetTitle}</h2>
        {nextAction.reason && <p className={styles.reason}>{nextAction.reason}</p>}
      </div>
      <Button shape="pill" onClick={handleAction}>
        {meta.cta}
        <ArrowRight size={16} />
      </Button>
    </section>
  )
}
