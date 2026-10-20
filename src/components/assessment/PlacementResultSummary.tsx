import type { ReactNode } from 'react'
import { Award, CheckCircle2, Clock, TrendingDown, TrendingUp, XCircle } from '../console/icons'
import type { PlacementResult } from '../../services/assessmentService'
import { formatDuration, prettifyEnum } from '../../lib/courseFormat'
import { cn } from '../../lib/cn'
import Card, { CardTitle } from '../ui/Card'
import Progress from '../ui/Progress'
import ResultSummaryCard from './ResultSummaryCard'

interface PlacementResultSummaryProps {
  result: PlacementResult
}

const statTone = {
  primary: 'bg-primary-soft text-primary-text',
  success: 'bg-badge-success-bg text-badge-success-text',
  danger: 'bg-badge-danger-bg text-badge-danger-text',
  assessment: 'bg-assess-soft text-assess',
} as const

function StatTile({
  tone,
  icon,
  label,
  value,
}: {
  tone: keyof typeof statTone
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-line-card bg-surface px-3.5 py-3 shadow-card-soft">
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', statTone[tone])}>
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-xs font-bold text-text-secondary">{label}</span>
        <strong className="truncate text-xl leading-tight font-bold text-text-heading">
          {value}
        </strong>
      </div>
    </div>
  )
}

function Highlight({
  tone,
  icon,
  label,
  value,
}: {
  tone: 'strong' | 'weak'
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div
      className={cn(
        'flex flex-[1_1_220px] items-center gap-3 rounded-xl border px-4 py-3.5',
        tone === 'strong'
          ? 'border-line-practice bg-practice-soft text-practice'
          : 'border-live-line bg-live-soft text-live'
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface">{icon}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold tracking-[0.04em] uppercase">{label}</span>
        <strong className="text-base text-text-heading">{value}</strong>
      </div>
    </div>
  )
}

function PlacementResultSummary({ result }: PlacementResultSummaryProps) {
  return (
    <>
      <ResultSummaryCard
        eyebrow="Kết quả kiểm tra đầu vào"
        title={prettifyEnum(result.level) || 'Chưa xác định'}
        correctCount={result.correctCount}
        totalQuestions={result.totalQuestions}
        percentage={result.overallPercentage}
      >
        <div className="mt-6 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
          <StatTile
            tone="primary"
            icon={<Award size={20} />}
            label="Điểm số"
            value={result.score}
          />
          <StatTile
            tone="danger"
            icon={<XCircle size={20} />}
            label="Câu sai"
            value={result.wrongCount}
          />
          <StatTile
            tone="assessment"
            icon={<Clock size={20} />}
            label="Thời gian làm bài"
            value={formatDuration(result.timeSpentSeconds)}
          />
        </div>

        {(result.strongCategoryName || result.weakCategoryName) && (
          <div className="mt-3 flex flex-wrap gap-3">
            {result.strongCategoryName && (
              <Highlight
                tone="strong"
                icon={<TrendingUp size={20} />}
                label="Thế mạnh"
                value={result.strongCategoryName}
              />
            )}
            {result.weakCategoryName && (
              <Highlight
                tone="weak"
                icon={<TrendingDown size={20} />}
                label="Cần cải thiện"
                value={result.weakCategoryName}
              />
            )}
          </div>
        )}
      </ResultSummaryCard>

      {result.categories.length > 0 && (
        <Card
          as="section"
          variant="panel"
          padding="none"
          radius="xl"
          className="p-6 max-[640px]:p-5"
        >
          <CardTitle className="mb-4 text-xl">Chi tiết theo chủ đề</CardTitle>
          <div className="flex flex-col gap-3">
            {result.categories.map((category) => (
              <div
                className="flex flex-col gap-2 rounded-xl border border-line-card bg-surface-sky px-4 py-3.5"
                key={category.categoryId}
              >
                <div className="flex items-center justify-between gap-3 text-base font-semibold text-text-heading">
                  <span className="flex min-w-0 items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-primary-text" />
                    <span className="min-w-0">{category.categoryName}</span>
                  </span>
                  <strong className="text-primary-text">{category.percentage}%</strong>
                </div>
                <Progress value={category.percentage} aria-label={category.categoryName} />
                <span className="text-sm text-text-secondary">
                  {category.correctCount}/{category.totalCount} câu đúng · {category.score} điểm
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

export default PlacementResultSummary
