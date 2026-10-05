import { ArrowRight, CheckCircle2, Clock3, FileQuestion } from 'lucide-react'
import { formatDate } from '../../../lib/courseFormat'
import { getCourseExams } from '../../../services/courseService'
import { usePageResource } from '../../../hooks/usePageResource'
import MascotState from '../../common/MascotState'
import ResourceState from '../common/ResourceState'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'
import Skeleton from '../../ui/Skeleton'
import StatusBadge from '../../ui/StatusBadge'

interface CourseExamsTabProps {
  courseId: string
  onOpenQuiz: (quizId: string) => void
}

function CourseExamsTab({ courseId, onOpenQuiz }: CourseExamsTabProps) {
  const { data: exams, status, errorMessage, reload } = usePageResource(
    () => getCourseExams(courseId),
    [courseId]
  )

  return (
    <>
      <ResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <div className="flex flex-col gap-3" aria-label="Đang tải danh sách bài thi">
            <Skeleton className="h-[86px]" />
            <Skeleton className="h-[86px]" />
            <Skeleton className="h-[86px]" />
          </div>
        }
        forbidden={{
          title: 'Bạn chưa có quyền xem bài thi',
          message: 'Hãy kiểm tra quyền truy cập khóa học của bạn.',
        }}
        notFound={{ title: 'Không tìm thấy danh sách bài thi của khóa học.' }}
        error={{ title: 'Không thể tải bài thi' }}
      />

      {status === 'ready' && exams && (
        <Card as="section" padding="lg" radius="lg" aria-labelledby="course-exams-title">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <CardTitle id="course-exams-title" className="mb-1 text-base">
                Bài thi của khóa học
              </CardTitle>
              <p className="m-0 text-sm text-text-secondary">
                Theo dõi lượt làm và tiếp tục bài thi còn dang dở.
              </p>
            </div>
            <span className="text-xs font-semibold text-text-secondary" aria-live="polite">
              {exams.length} bài thi
            </span>
          </div>

          {exams.length === 0 ? (
            <MascotState
              title="Khóa học chưa có bài thi"
              message="Khi có bài thi mới, nội dung sẽ xuất hiện tại đây."
              className="min-h-[220px]"
            />
          ) : (
            <div className="mt-2 divide-y divide-line-soft" role="list" aria-label="Danh sách bài thi">
              {exams.map((exam) => {
                const state = exam.locked
                  ? { label: 'Chưa khả dụng', tone: 'locked' as const }
                  : exam.inProgressAttemptId
                    ? { label: 'Đang làm', tone: 'primary' as const }
                    : exam.passed
                      ? { label: 'Đã đạt', tone: 'success' as const }
                      : exam.attemptsUsed > 0
                        ? { label: 'Đã làm', tone: 'info' as const }
                        : { label: 'Chưa làm', tone: 'neutral' as const }
                const availability = [
                  exam.availableFrom ? `Mở từ ${formatDate(exam.availableFrom)}` : '',
                  exam.availableUntil ? `Đến ${formatDate(exam.availableUntil)}` : '',
                ].filter(Boolean)

                return (
                  <article
                    key={exam.id}
                    role="listitem"
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4 first:pt-3 last:pb-1"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="m-0 font-semibold text-text-heading">{exam.title}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <FileQuestion size={14} aria-hidden="true" />
                          {exam.questionCount} câu hỏi
                        </span>
                        {exam.durationMinutes != null && exam.durationMinutes > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 size={14} aria-hidden="true" />
                            {exam.durationMinutes} phút
                          </span>
                        )}
                        {exam.attemptsUsed > 0 && (
                          <span>
                            {exam.attemptsUsed}/{exam.maxAttempts} lượt
                          </span>
                        )}
                        {availability.map((item) => <span key={item}>{item}</span>)}
                        {exam.passed && exam.bestPercentage != null && (
                          <span className="inline-flex items-center gap-1 font-semibold text-badge-success-text">
                            <CheckCircle2 size={14} aria-hidden="true" />
                            Kết quả tốt nhất {exam.bestPercentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex min-h-11 w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                      <StatusBadge tone={state.tone} size="sm">{state.label}</StatusBadge>
                      <Button
                        size="sm"
                        className="min-h-11 sm:min-h-8.5"
                        onClick={() => onOpenQuiz(exam.id)}
                        aria-label={`${exam.inProgressAttemptId ? 'Tiếp tục' : 'Xem'} bài thi ${exam.title}`}
                      >
                        {exam.inProgressAttemptId ? 'Tiếp tục' : 'Xem bài thi'}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </Card>
      )}
    </>
  )
}

export default CourseExamsTab
