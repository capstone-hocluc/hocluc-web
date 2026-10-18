import type { ReactNode } from 'react'
import { BookOpen, ClipboardCheck, Clock3, Flame, Trophy } from '../../console/icons'
import type { DashboardDimension } from '../../../lib/studentViewModel'

function LevelLine({ title, data }: { title: string; data: DashboardDimension }) {
  const values: [string, DashboardDimension['current']][] = [
    ['Hiện tại', data.current],
    ['Dự đoán', data.predicted],
    ['Mục tiêu', data.target],
  ]
  return (
    <div>
      <strong className="block text-[15px] font-extrabold text-text-heading">{title}</strong>
      <div className="relative mx-1 mt-4 mb-2.5 flex justify-between before:absolute before:top-[7px] before:right-2.5 before:left-2.5 before:border-t-2 before:border-dashed before:border-line-brand before:content-['']">
        {values.map(([label]) => (
          <span
            key={label}
            className="relative z-1 size-4 rounded-full border-[4px] border-primary bg-surface"
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {values.map(([label, value]) => (
          <span key={label} className="text-xl font-bold text-text-heading">
            <small className="mb-1 block text-xs font-bold text-text-muted">{label}</small>
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}

function SummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <p className="my-2.5 flex items-center gap-2.5 text-sm font-semibold text-text-body [&>svg]:text-primary-text">
      {icon} {label} <b className="ml-auto font-bold text-primary-text">{value}</b>
    </p>
  )
}

interface CompetencyPanelProps {
  dimensions: DashboardDimension[]
  summary: {
    studyTime: string
    completedLessons: number
    completedTests: number
    bestScore: number
    currentStreak: number
  }
}

// "Hồ sơ năng lực" box: competency rows (current / predicted / target) + study summary.
function CompetencyPanel({ dimensions, summary }: CompetencyPanelProps) {
  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl border border-line-card bg-surface p-5 shadow-card">
      <div className="flex min-h-0 flex-[1_1_auto] flex-col gap-4">
        <h4 className="text-[17px] leading-[1.35] font-bold text-text-heading">
          Điểm năng lực ĐGNL của bạn
        </h4>
        <div className="flex min-h-0 flex-[1_1_auto] flex-col justify-evenly gap-5">
          {dimensions.map((dimension) => (
            <LevelLine key={dimension.title} title={dimension.title} data={dimension} />
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t-[1.5px] border-line pt-4">
        <strong className="mb-3 block text-[17px] font-bold text-text-heading">
          Tổng quan ôn luyện
        </strong>
        <SummaryRow icon={<Clock3 size={18} />} label="Tổng thời lượng" value={summary.studyTime} />
        <SummaryRow
          icon={<BookOpen size={18} />}
          label="Bài học đã hoàn thành"
          value={summary.completedLessons}
        />
        <SummaryRow
          icon={<ClipboardCheck size={18} />}
          label="Đề đã làm"
          value={summary.completedTests}
        />
        <SummaryRow icon={<Trophy size={18} />} label="Điểm cao nhất" value={summary.bestScore} />
        <SummaryRow
          icon={<Flame size={18} />}
          label="Chuỗi học tập"
          value={`${summary.currentStreak} ngày`}
        />
      </div>
    </div>
  )
}

export default CompetencyPanel
