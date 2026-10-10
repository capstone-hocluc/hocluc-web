import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp } from '../console/icons'
import type { PlacementResult } from '../../services/assessmentService'
import { formatDuration, prettifyEnum } from '../../lib/courseFormat'
import { cn } from '../../lib/cn'
import Card, { CardTitle } from '../ui/Card'
import Progress from '../ui/Progress'
import ResultSummaryCard from './ResultSummaryCard'

interface PlacementResultSummaryProps {
  result: PlacementResult
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
        'flex flex-[1_1_200px] items-center gap-2.5 rounded-xl px-3.5 py-3',
        tone === 'strong'
          ? 'bg-badge-success-bg text-badge-success-text'
          : 'bg-badge-warning-bg text-badge-warning-text'
      )}
    >
      {icon}
      <div className="flex flex-col gap-0.5">
        <span className="text-[11.5px] font-bold">{label}</span>
        <strong className="text-[13.5px] text-text-heading">{value}</strong>
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
        <div className="mt-4 flex flex-wrap gap-5 border-t border-border-subtle pt-4">
          {[
            ['Điểm số', result.score],
            ['Câu sai', result.wrongCount],
            ['Thời gian làm bài', formatDuration(result.timeSpentSeconds)],
          ].map(([label, value]) => (
            <div className="flex flex-col gap-1" key={label}>
              <span className="text-xs text-text-faint">{label}</span>
              <strong className="text-lg text-text-heading">{value}</strong>
            </div>
          ))}
        </div>

        {(result.strongCategoryName || result.weakCategoryName) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {result.strongCategoryName && (
              <Highlight
                tone="strong"
                icon={<TrendingUp size={16} />}
                label="Thế mạnh"
                value={result.strongCategoryName}
              />
            )}
            {result.weakCategoryName && (
              <Highlight
                tone="weak"
                icon={<TrendingDown size={16} />}
                label="Cần cải thiện"
                value={result.weakCategoryName}
              />
            )}
          </div>
        )}
      </ResultSummaryCard>

      {result.categories.length > 0 && (
        <Card as="section" padding="none" radius="lg" className="border-border-subtle p-[22px]">
          <CardTitle className="mb-3.5 text-base">Chi tiết theo chủ đề</CardTitle>
          <div className="flex flex-col gap-4">
            {result.categories.map((category) => (
              <div className="flex flex-col gap-1.5" key={category.categoryId}>
                <div className="flex items-center justify-between text-[13.5px] font-bold text-text-heading">
                  <span>{category.categoryName}</span>
                  <strong>{category.percentage}%</strong>
                </div>
                <Progress value={category.percentage} aria-label={category.categoryName} />
                <span className="text-xs text-text-faint">
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
