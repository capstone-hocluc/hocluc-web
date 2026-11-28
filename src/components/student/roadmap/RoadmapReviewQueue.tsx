import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'
import Notice from '../../ui/Notice'
import StatusBadge from '../../ui/StatusBadge'
import { formatForgettingRisk } from '../../../lib/roadmapFormat'
import type { RoadmapReviewItem } from '../../../services/roadmapService'
import styles from './RoadmapReviewQueue.module.css'

interface RoadmapReviewQueueProps {
  items: RoadmapReviewItem[]
  onOpenLesson: (courseId: string, lessonId: string) => void
  onOpenQuiz: (quizId: string) => void
}

export default function RoadmapReviewQueue({
  items,
  onOpenLesson,
  onOpenQuiz,
}: RoadmapReviewQueueProps) {
  return (
    <Card as="section" padding="lg" radius="xl" className="space-y-3">
      <CardTitle className="mb-0 text-lg">Cần ôn tập</CardTitle>
      {items.length === 0 ? (
        <Notice tone="info">Chưa có kỹ năng đến hạn ôn tập.</Notice>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => {
            const canReview = Boolean(item.quizId || (item.courseId && item.lessonId))
            const handleReview = () => {
              if (item.quizId) {
                onOpenQuiz(item.quizId)
              } else if (item.courseId && item.lessonId) {
                onOpenLesson(item.courseId, item.lessonId)
              }
            }

            return (
              <li key={item.skillCode} className={styles.item}>
                <div className={styles.topRow}>
                  <div className="min-w-0">
                    <strong className={styles.name}>{item.skillNameVi}</strong>
                    {item.categoryName && <p className={styles.meta}>{item.categoryName}</p>}
                  </div>
                  <StatusBadge tone="warning" size="sm">
                    {formatForgettingRisk(item.forgettingRisk)}
                  </StatusBadge>
                </div>
                {item.reason && <p className={styles.reason}>{item.reason}</p>}
                {canReview && (
                  <div>
                    <Button size="sm" appearance="outline" onClick={handleReview}>
                      Ôn ngay
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
