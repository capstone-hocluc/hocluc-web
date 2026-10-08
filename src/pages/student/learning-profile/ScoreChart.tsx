import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import {
  ProfileCard,
  ProfileHeading,
} from '../../../components/student/learning-profile/primitives'

interface ScorePoint {
  label: string
  score: number
}

interface ScoreSeries {
  key: string
  label: string
  color: string
  points: ScorePoint[]
}

interface ScoreChartProps {
  title: ReactNode
  subtitle?: ReactNode
  points: ScorePoint[]
  series?: ScoreSeries[]
  target?: number
  max?: number
  componentMode?: boolean
  toolbar?: ReactNode
  filterLabel?: string | null
  className?: string
}

const axisLabel = 'fill-text-faint text-[11px] font-extrabold'
const chartLabel = 'fill-text-secondary text-[12px] font-extrabold'
const lineClass =
  'fill-none stroke-primary [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:4]'
const pointClass = 'fill-surface stroke-primary [stroke-width:3]'
const legendItem = 'inline-flex items-center gap-[7px]'
const legendLine = 'h-[3px] w-4 rounded-full'

function ScoreChart({
  title,
  subtitle,
  points,
  series,
  target = 900,
  max = 1200,
  componentMode = false,
  toolbar,
  filterLabel = 'Tất cả',
  className,
}: ScoreChartProps) {
  const chartWidth = 640
  const chartHeight = 220
  const padding = { top: 24, right: 26, bottom: 30, left: 48 }
  const usableWidth = chartWidth - padding.left - padding.right
  const usableHeight = chartHeight - padding.top - padding.bottom
  const chartSeries = series?.length
    ? series
    : [
        {
          key: 'score',
          label: componentMode ? 'Điểm thành phần' : 'Điểm ĐGNL',
          color: 'var(--color-primary)',
          points,
        },
      ]
  const axisPoints = chartSeries[0]?.points || points || []
  const axisLevels =
    max === 1200
      ? [1200, 900, 600, 300, 0]
      : [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0]
  const toPoint = (item, index, list = axisPoints) => {
    const x =
      padding.left +
      (list.length === 1 ? usableWidth / 2 : (index / Math.max(1, list.length - 1)) * usableWidth)
    const y = padding.top + usableHeight - (item.score / max) * usableHeight
    return `${x},${y}`
  }
  const polyline = axisPoints.map((item, index) => toPoint(item, index)).join(' ')
  const targetY = padding.top + usableHeight - (target / max) * usableHeight
  const latest = axisPoints[axisPoints.length - 1]
  const latestCoordinates = latest
    ? toPoint(latest, axisPoints.length - 1)
        .split(',')
        .map(Number)
    : [0, 0]

  return (
    <ProfileCard as="article" className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3.5 max-[760px]:flex-col">
        <ProfileHeading title={title} subtitle={subtitle} className="mb-2" />
        {filterLabel && (
          <span className="inline-flex min-h-[30px] flex-none items-center rounded-full border border-line-blue bg-surface px-[11px] text-[12px] font-black text-text-secondary">
            {filterLabel}
          </span>
        )}
      </div>
      {toolbar}
      <div className="w-full overflow-hidden">
        <svg
          className="block h-[220px] w-full max-[760px]:h-[210px]"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={String(title)}
        >
          {axisLevels.map((level) => {
            const y = padding.top + usableHeight - (level / max) * usableHeight
            return (
              <g key={level}>
                <text x={padding.left - 12} y={y + 4} textAnchor="end" className={axisLabel}>
                  {level}
                </text>
                <line
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                  className="stroke-[var(--color-line)] [stroke-width:1]"
                />
              </g>
            )
          })}
          <line
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={padding.top + usableHeight}
            className="stroke-[var(--color-line)] [stroke-width:1.2]"
          />
          <line
            x1={padding.left}
            x2={chartWidth - padding.right}
            y1={targetY}
            y2={targetY}
            className="stroke-[var(--color-warning)] [stroke-dasharray:7_6] [stroke-width:1.5]"
          />
          <text
            x={chartWidth - padding.right}
            y={targetY - 6}
            textAnchor="end"
            className={chartLabel}
          >
            Mục tiêu {target}
          </text>
          {series?.length ? (
            chartSeries.map((entry) => (
              <g key={entry.key}>
                <polyline
                  points={entry.points
                    .map((item, index) => toPoint(item, index, entry.points))
                    .join(' ')}
                  className={lineClass}
                  style={{ stroke: entry.color }}
                />
                {entry.points.map((item, index) => {
                  const [x, y] = toPoint(item, index, entry.points).split(',').map(Number)
                  return (
                    <circle
                      key={`${entry.key}-${item.label}-${index}`}
                      cx={x}
                      cy={y}
                      r="3.6"
                      className={pointClass}
                      style={{ stroke: entry.color }}
                    />
                  )
                })}
              </g>
            ))
          ) : (
            <polyline
              points={polyline}
              className={cn(lineClass, componentMode && 'stroke-success')}
            />
          )}
          {axisPoints.map((item, index) => {
            const [x, y] = toPoint(item, index).split(',').map(Number)
            return (
              <g key={`${item.label}-${index}`}>
                {!series?.length && <circle cx={x} cy={y} r="4.5" className={pointClass} />}
                <text x={x} y={chartHeight - 8} textAnchor="middle" className={chartLabel}>
                  {item.label}
                </text>
              </g>
            )
          })}
          {latest && !componentMode && (
            <g>
              <rect
                x={Math.min(chartWidth - 118, latestCoordinates[0] - 36)}
                y={latestCoordinates[1] - 54}
                width="92"
                height="42"
                rx="10"
                className="fill-surface stroke-line-blue drop-shadow-[0_8px_14px_rgba(17,24,58,0.12)]"
              />
              <text
                x={Math.min(chartWidth - 72, latestCoordinates[0] + 10)}
                y={latestCoordinates[1] - 34}
                textAnchor="middle"
                className="fill-primary text-[12px] font-black"
              >
                {latest.score} điểm
              </text>
              <text
                x={Math.min(chartWidth - 72, latestCoordinates[0] + 10)}
                y={latestCoordinates[1] - 18}
                textAnchor="middle"
                className="fill-text-faint text-[11px] font-black"
              >
                {latest.label}
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className="mt-1 flex items-center justify-center gap-[18px] text-[12px] font-extrabold text-text-secondary">
        {series?.length ? (
          chartSeries.map((entry) => (
            <span key={entry.key} className={legendItem}>
              <i className={legendLine} style={{ background: entry.color }} /> {entry.label}
            </span>
          ))
        ) : (
          <span className={legendItem}>
            <i className={cn(legendLine, 'bg-primary')} /> {chartSeries[0]?.label || 'Điểm ĐGNL'}
          </span>
        )}
        {!componentMode && (
          <span className={legendItem}>
            <i
              className={cn(
                legendLine,
                'bg-[repeating-linear-gradient(90deg,var(--color-warning)_0_5px,transparent_5px_9px)]'
              )}
            />{' '}
            Mục tiêu
          </span>
        )}
      </div>
    </ProfileCard>
  )
}

export default ScoreChart
