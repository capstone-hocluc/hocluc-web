import { usePageResource } from '../../../hooks/usePageResource'
import { getLearningProfileHistory } from '../../../services/learningProfileService'
import type { QuizAttemptSummary } from '../../../services/assessmentService'
import { studentRoutes } from '../../../lib/studentRoutes'
import { formatDateTime } from '../../../lib/courseFormat'
import { getAttemptStatusLabel } from '../../../lib/attemptStatus'
import { type ProfileNavigate } from './LearningCoursePanel'
import MascotState from '../../common/MascotState'
import ResourceState from '../common/ResourceState'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'
import Skeleton from '../../ui/Skeleton'
import surface from './LearningAnalyticsSurface.module.css'

function ScoreTrend({ attempts }: { attempts: QuizAttemptSummary[] }) {
  const graded = [...attempts].filter((attempt) => attempt.status === 'GRADED' && attempt.percentage != null)
    .sort((a, b) => a.attemptNumber - b.attemptNumber).slice(-30)
  if (graded.length < 2) return <MascotState imageSrc="/mascot/03.png" className="h-[272px] min-h-0 p-3 [&>img]:size-16" title="Chưa đủ dữ liệu theo dõi điểm" message="Cần ít nhất hai lượt đã chấm của đề hiện hành. Các kết quả hiện có nằm trong lịch sử làm bài." />
  const points = graded.map((attempt, index) => `${55 + index / (graded.length - 1) * 610},${190 - Math.min(100, Math.max(0, attempt.percentage)) * 1.6}`).join(' ')
  return <div>
    <div className="h-[272px] overflow-x-auto rounded-2xl border border-line-card bg-surface p-2"><svg viewBox="0 0 700 235" className="mx-auto h-full w-full min-w-[480px] max-w-[760px]" role="img" aria-label="Biểu đồ tỷ lệ điểm các lượt đánh giá đầu vào, đơn vị phần trăm">
      {[0, 25, 50, 75, 100].map((tick) => <g key={tick}>
        <line x1="55" x2="665" y1={190 - tick * 1.6} y2={190 - tick * 1.6} stroke="var(--color-line)" strokeDasharray="4 5" />
        <text x="40" y={194 - tick * 1.6} textAnchor="end" fontSize="12" fill="currentColor">{tick}%</text>
      </g>)}
      <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinejoin="round" />
      {graded.map((attempt, index) => <circle key={attempt.attemptId} cx={55 + index / (graded.length - 1) * 610} cy={190 - Math.min(100, Math.max(0, attempt.percentage)) * 1.6} r="4" fill="var(--color-primary)"><title>Lần {attempt.attemptNumber}: {attempt.percentage}%</title></circle>)}
      <text x="55" y="220" fontSize="12" fill="currentColor">Lần {graded[0].attemptNumber}</text>
      <text x="665" y="220" textAnchor="end" fontSize="12" fill="currentColor">Lần {graded.at(-1)?.attemptNumber}</text>
    </svg></div>
  </div>
}

export default function LearningPracticePanel({ onNavigate }: { onNavigate: ProfileNavigate }) {
  const history = usePageResource(getLearningProfileHistory, [])
  const attempts = history.data
  return <Card as="section" aria-label="Theo dõi đánh giá đầu vào" className={`${surface.panel} min-w-0 space-y-3 rounded-3xl p-4`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="mb-1 text-lg">Theo dõi đánh giá đầu vào</CardTitle>
      <p className="text-xs text-text-body">Biểu đồ và lịch sử của đề đầu vào hiện hành.</p></div>
      <Button size="sm" appearance="outline" shape="pill" className="border-primary-text text-primary-text not-disabled:hover:bg-primary/6" onClick={() => onNavigate(studentRoutes.placement())}>Làm bài đánh giá</Button></div>
    <ResourceState imageSrc="/mascot/03.png" status={history.status} errorMessage={history.errorMessage} onRetry={history.reload}
      loading={<Skeleton className="h-64 rounded-3xl" />} error={{ title: 'Không thể tải lịch sử đánh giá' }} />
    {history.status === 'ready' && (attempts?.length ? <div className="grid min-w-0 items-start gap-3 min-[1200px]:grid-cols-2">
      <div className="min-w-0 space-y-2"><h3 className="flex h-8 items-center text-sm font-semibold">Biểu đồ kết quả đầu vào</h3><ScoreTrend attempts={attempts} /></div>
      <div className="min-w-0 space-y-2">
        <h3 className="flex h-8 items-center text-sm font-semibold">Lịch sử làm bài đánh giá đầu vào</h3>
        <ul aria-label="Lịch sử đánh giá đầu vào" tabIndex={attempts.length > 3 ? 0 : undefined} className="grid h-[272px] content-start gap-2 overflow-y-auto rounded-2xl border border-line-card bg-surface p-2 focus-visible:outline-2 focus-visible:outline-focus-ring">{[...attempts].sort((a, b) => b.attemptNumber - a.attemptNumber).map((attempt) => <li key={attempt.attemptId} className={`${surface.soft} flex min-h-20 flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2`}>
          <div className="min-w-0"><h4 className="text-sm font-semibold">Đánh giá đầu vào · Lần {attempt.attemptNumber}</h4>
            <p className="mt-1 text-xs text-text-body">{getAttemptStatusLabel(attempt.status)} · {formatDateTime(attempt.submittedAt || attempt.startedAt)}</p>
            {attempt.status === 'GRADED' && attempt.percentage != null && <p className="mt-1 text-sm font-bold text-primary-text">{attempt.percentage}%{attempt.maxScore != null ? ` · ${attempt.score}/${attempt.maxScore} điểm` : ''}</p>}
          </div>
          {attempt.status === 'GRADED' ? <Button size="sm" shape="pill" appearance="outline" className="border-primary-text text-primary-text not-disabled:hover:bg-primary/6" onClick={() => onNavigate(studentRoutes.attemptReview(attempt.attemptId))}>Xem kết quả</Button>
            : attempt.status === 'IN_PROGRESS' ? <Button size="sm" shape="pill" appearance="outline" className="border-primary-text text-primary-text not-disabled:hover:bg-primary/6" onClick={() => onNavigate(studentRoutes.placementAttempt(attempt.attemptId))}>Tiếp tục làm bài</Button> : null}
        </li>)}</ul>
      </div>
    </div> : <MascotState imageSrc="/mascot/03.png" className={`${surface.soft} min-h-0 p-3 [&>img]:size-16`} title={attempts === null ? 'Chưa có đề đánh giá đầu vào hiện hành' : 'Bạn chưa có lượt làm của đề đầu vào hiện hành'}
      message="Khi có lượt làm, lịch sử và tỷ lệ điểm sẽ hiển thị tại đây." actionLabel="Đến bài đánh giá" onAction={() => onNavigate(studentRoutes.placement())} />)}
  </Card>
}
