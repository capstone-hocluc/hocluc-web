import { useMemo } from 'react'
import { usePageResource } from '../../../hooks/usePageResource'
import { getTeacherQuiz, type TeacherQuizType } from '../../../services/teacherQuizService'
import { ApiError } from '../../../lib/api'
import Card, { CardTitle } from '../../console/card'
import PageHeading from '../../console/page-heading'
import Status from '../../console/status'
import { quizTypeLabel, quizRequirement } from '../../../lib/quiz-types'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import QuizQuestionsView from './paper/QuizQuestionsView'
import { quizToPaper } from './paper/quiz-to-paper'

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
  // Built once per loaded quiz: the sheet lays its pages out again whenever it is handed a new paper.
  const paper = useMemo(() => (editor ? quizToPaper(editor) : null), [editor])
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <PageHeading onBack={onBack} backLabel="Quay lại danh sách" parent="Bài kiểm tra" title="Nội dung bài kiểm tra" readOnly />
      <ScheduleResourceState status={resource.status} skeleton="detail" errorMessage={resource.errorMessage}
        onRetry={resource.reload} empty={resource.status === 'ready' && !resource.data}
        emptyMessage="Không có dữ liệu bài kiểm tra.">
        {editor && quiz && paper && <>
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
          {editor.questions.length === 0
            ? <Card><p className="py-5 text-center text-sm text-text-tertiary">Chưa có câu hỏi.</p></Card>
            : <QuizQuestionsView paper={paper} label={`Đề ${quiz.title} (chỉ đọc)`} />}
        </>}
      </ScheduleResourceState>
    </section>
  )
}
