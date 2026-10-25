import { usePageResource } from '../../../hooks/usePageResource'
import { getTeacherQuiz, type TeacherQuizType } from '../../../services/teacherQuizService'
import { ApiError } from '../../../lib/api'
import Card, { CardTitle } from '../../console/card'
import PageHeading from '../../console/page-heading'
import Status from '../../console/status'
import { CheckCircle2 } from '../../console/icons'
import { cn } from '../../../lib/cn'
import { quizTypeLabel, quizRequirement } from '../../../lib/quiz-types'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import MathText from '../../ui/MathText'

const statusLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ' }

/** Read the existing editor response without mounting any editor or write handler. */
export default function QuizDetails({ quizId, onBack, expectedType }: { quizId: string; onBack: () => void; expectedType?: TeacherQuizType }) {
  const resource = usePageResource(async () => {
    const result = await getTeacherQuiz(quizId)
    if (expectedType && result.quiz.type !== expectedType) throw new ApiError('Bài kiểm tra không thuộc loại đang mở.', 404)
    return result
  }, [quizId, expectedType])
  const editor = resource.status === 'ready' ? resource.data : null
  const quiz = editor?.quiz
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <PageHeading onBack={onBack} backLabel="Quay lại danh sách" parent="Bài kiểm tra" title="Nội dung bài kiểm tra" readOnly />
      <ScheduleResourceState status={resource.status} skeleton="detail" errorMessage={resource.errorMessage}
        onRetry={resource.reload} empty={resource.status === 'ready' && !resource.data}
        emptyMessage="Không có dữ liệu bài kiểm tra.">
        {editor && quiz && <>
          <Card padding="lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg break-words">{quiz.title}</CardTitle>
                <Status tone="info">{quizTypeLabel(quiz.type)}</Status>
                <p className="text-sm text-text-tertiary">{[quiz.courseTitle, quiz.chapterTitle, quiz.lessonTitle].filter(Boolean).join(' · ') || (quiz.type === 'PLACEMENT' ? 'Bài đánh giá đầu vào độc lập' : 'Chưa gắn khóa học')}</p>
                <p className="text-sm text-text-tertiary">{quizRequirement(quiz.type)}</p>
              </div>
              <Status tone={quiz.status === 'PUBLISHED' ? 'success' : quiz.status === 'DRAFT' ? 'warning' : 'neutral'}>{statusLabels[quiz.status]}</Status>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-card-border pt-4 lg:grid-cols-4">
              {[
                ['Câu hỏi', `${editor.questions.length} câu`],
                ['Thời gian', quiz.durationMinutes ? `${quiz.durationMinutes} phút` : 'Không giới hạn'],
                ['Số lần làm tối đa', quiz.maxAttempts ?? '—'],
                ['Lượt làm bài', quiz.attemptCount],
              ].map(([label, value]) => <div key={label} className="space-y-1">
                <dt className="text-xs text-text-tertiary">{label}</dt>
                <dd className="text-sm font-medium text-text-primary">{value}</dd>
              </div>)}
            </dl>
            {quiz.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{quiz.description}</p>}
          </Card>
          {editor.questions.length === 0 && <Card><p className="py-5 text-center text-sm text-text-tertiary">Chưa có câu hỏi.</p></Card>}
          {editor.questions.map((question) => <Card key={question.id} padding="lg" as="article">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background-gray-secondary text-sm font-semibold text-text-secondary">{question.sequence}</span>
              <h2 className="min-w-0 pt-1 text-sm leading-6 font-medium whitespace-pre-wrap break-words text-text-primary"><MathText>{question.questionText}</MathText></h2>
            </div>
            {question.imageUrl && <img src={question.imageUrl} alt={`Hình minh họa câu ${question.sequence}`} className="mb-4 max-h-64 max-w-full rounded-lg object-contain" />}
            <ul className="grid gap-2 sm:grid-cols-2">
              {question.options.map((option) => <li key={option.id}
                className={cn('flex items-start gap-3 rounded-lg border border-card-border p-3 text-sm', option.correct && 'border-badge-success-text/20 bg-badge-success-bg')}>
                <span className="font-medium text-text-secondary">{option.label}.</span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-text-primary"><MathText>{option.text}</MathText></span>
                {option.correct && <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-badge-success-text"><CheckCircle2 size={15} /><span className="sr-only sm:not-sr-only">Đáp án đúng</span></span>}
              </li>)}
            </ul>
            {question.explanation && <div className="mt-4 rounded-lg bg-background-gray-secondary p-4">
              <h3 className="mb-1 text-xs font-semibold text-text-secondary">Giải thích / hướng dẫn chấm</h3>
              <p className="text-sm leading-6 whitespace-pre-wrap break-words text-text-secondary"><MathText>{question.explanation}</MathText></p>
            </div>}
          </Card>)}
        </>}
      </ScheduleResourceState>
    </section>
  )
}
