import { useState } from 'react'
import { usePageResource } from '../../../hooks/usePageResource'
import { getFreeExams, type FreeExam } from '../../../services/freeExamService'
import { getQuizAttemptHistory } from '../../../services/assessmentService'
import { studentRoutes } from '../../../lib/studentRoutes'
import { formatDateTime } from '../../../lib/courseFormat'
import ResourceState from '../common/ResourceState'
import MascotState from '../../common/MascotState'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import DropdownField from '../../ui/DropdownField'
import Skeleton from '../../ui/Skeleton'
import type { ProfileNavigate } from './LearningCoursePanel'

export default function LearningPracticePanel({ onNavigate }: { onNavigate: ProfileNavigate }) {
  const exams = usePageResource(() => getFreeExams(), [])
  const [selected, setSelected] = useState('')
  const exam = exams.data?.find(item => item.id === selected) ?? exams.data?.[0]
  return <Card as="section" aria-label="Lịch sử thi thử miễn phí" className="min-w-0 space-y-4 rounded-3xl p-5">
    <h2 className="text-lg font-bold">Lịch sử thi thử miễn phí</h2>
    <p className="text-sm text-text-secondary">Xem tất cả lượt làm của từng đề, bao gồm các lần thi lại. Phần đánh giá năng lực chỉ tính lần thi chính thức đầu tiên đã chấm của mỗi đề.</p>
    <ResourceState status={exams.status} errorMessage={exams.errorMessage} onRetry={exams.reload} imageSrc="/mascot/03.png" loading={<Skeleton className="h-24" />} error={{ title: 'Không thể tải danh sách đề thi' }} />
    {exams.status === 'ready' && (exam ? <>
      <div className="grid max-w-xl gap-2 text-sm font-semibold"><span>Chọn đề thi</span><DropdownField ariaLabel="Chọn đề thi" value={exam.id} onChange={value => setSelected(value ?? '')} isSearchable options={exams.data!.map(item => ({ id: item.id, label: item.title }))} /></div>
      <ExamHistory key={exam.id} exam={exam} onNavigate={onNavigate} />
    </> : <MascotState imageSrc="/mascot/03.png" title="Chưa có đề thi miễn phí" />)}
  </Card>
}

function ExamHistory({ exam, onNavigate }: { exam: FreeExam; onNavigate: ProfileNavigate }) {
  const history = usePageResource(() => getQuizAttemptHistory(exam.id), [exam.id])
  return <>
    <Button size="sm" appearance="outline" onClick={() => onNavigate(studentRoutes.quiz(exam.id))}>Xem đề và làm bài</Button>
    <ResourceState status={history.status} errorMessage={history.errorMessage} onRetry={history.reload} imageSrc="/mascot/03.png" loading={<Skeleton className="h-32" />} error={{ title: 'Không thể tải lịch sử làm bài' }} />
    {history.status === 'ready' && (history.data?.length ? <ul aria-label="Các lượt làm đề miễn phí" className="grid max-h-80 gap-2 overflow-y-auto">{[...history.data].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).map(attempt => <li key={attempt.attemptId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-card p-3">
      <div><h3 className="text-sm font-semibold">Lần {attempt.attemptNumber}{attempt.mode === 'PRACTICE' ? ' · Luyện tập' : attempt.mode === 'EXAM' ? ' · Thi chính thức' : ''}</h3><p className="mt-1 text-xs text-text-secondary">{formatDateTime(attempt.submittedAt || attempt.startedAt)} · {attempt.status === 'GRADED' ? 'Đã chấm' : attempt.status === 'IN_PROGRESS' ? 'Đang làm' : 'Đã kết thúc'}</p>{attempt.status === 'GRADED' && <p className="mt-1 text-sm font-semibold text-primary-text">{attempt.percentage}%{attempt.maxScore != null ? ' · ' + attempt.score + '/' + attempt.maxScore + ' điểm' : ''}</p>}</div>
      {attempt.status === 'GRADED' ? <Button size="sm" appearance="outline" onClick={() => onNavigate(studentRoutes.attemptReview(attempt.attemptId))}>Xem kết quả</Button> : attempt.status === 'IN_PROGRESS' ? <Button size="sm" appearance="outline" onClick={() => onNavigate(studentRoutes.quizAttempt(exam.id, attempt.attemptId))}>Tiếp tục làm bài</Button> : null}
    </li>)}</ul> : <MascotState imageSrc="/mascot/03.png" title="Bạn chưa có lượt làm của đề này" />)}
  </>
}
