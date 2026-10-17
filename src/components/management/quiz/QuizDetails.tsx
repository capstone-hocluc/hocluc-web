import { usePageResource } from '../../../hooks/usePageResource'
import { getTeacherQuiz } from '../../../services/teacherQuizService'
import Button from '../../console/button'
import Card, { CardTitle } from '../../console/card'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'

/** Read the existing editor response without mounting any editor or write handler. */
export default function QuizDetails({ quizId, onBack }: { quizId: string; onBack: () => void }) {
  const resource = usePageResource(() => getTeacherQuiz(quizId), [quizId])
  return (
    <section className="flex flex-col gap-5">
      <Button appearance="ghost" onClick={onBack}>Quay lại danh sách</Button>
      <ScheduleResourceState status={resource.status} errorMessage={resource.errorMessage}
        onRetry={resource.reload} empty={resource.status === 'ready' && !resource.data}
        emptyMessage="Không có dữ liệu bài kiểm tra.">
        {resource.status === 'ready' && resource.data && <>
          <Card padding="lg">
            <CardTitle>{resource.data.quiz.title}</CardTitle>
            <p className="mt-2 text-sm text-text-tertiary">
              {[resource.data.quiz.courseTitle, resource.data.quiz.lessonTitle, resource.data.quiz.status,
                `${resource.data.questions.length} câu`].filter(Boolean).join(' · ')}
            </p>
            {resource.data.quiz.description && <p className="mt-2 text-sm">{resource.data.quiz.description}</p>}
          </Card>
          {resource.data.questions.length === 0 && <p className="text-sm text-text-tertiary">Chưa có câu hỏi.</p>}
          {resource.data.questions.map((question) => <Card key={question.id} padding="lg">
            <CardTitle>Câu {question.sequence}. {question.questionText}</CardTitle>
            {question.imageUrl && <img src={question.imageUrl} alt="" className="mt-3 max-h-64 rounded-lg" />}
            <ul className="mt-3 space-y-2 text-sm">
              {question.options.map((option) => <li key={option.id}>
                {option.label}. {option.text}{option.correct ? ' · Đáp án đúng' : ''}
              </li>)}
            </ul>
            {question.explanation && <p className="mt-3 text-sm text-text-tertiary">{question.explanation}</p>}
          </Card>)}
        </>}
      </ScheduleResourceState>
    </section>
  )
}
