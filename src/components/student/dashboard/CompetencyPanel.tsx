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
      <strong className="block text-[13px] font-extrabold text-text-dark">{title}</strong>
      <div className="relative mx-1 mt-4 mb-2.5 flex justify-between before:absolute before:top-[7px] before:right-2.5 before:left-2.5 before:border-t before:border-dashed before:border-line-brand before:content-['']">
        {values.map(([label]) => (
          <span
            key={label}
            className="relative z-1 size-3 rounded-full border-[3px] border-link bg-surface"
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {values.map(([label, value]) => (
          <span key={label} className="text-[17px] font-extrabold text-text-heading">
            <small className="mb-[7px] block text-[11px] font-bold text-text-faint">{label}</small>
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}

function SummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <p className="my-2.5 flex items-center gap-[9px] text-[13px] text-text-body [&>svg]:text-link">
      {icon} {label} <b className="ml-auto text-link">{value}</b>
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
    <div className="relative flex h-full flex-col gap-[18px] overflow-hidden rounded-2xl border border-line-card bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,251,255,0.9))] p-[18px] shadow-card before:pointer-events-none before:absolute before:inset-3 before:rounded-[20px] before:bg-[linear-gradient(90deg,transparent_0_95%,rgba(27,116,242,0.08)_95%_100%),linear-gradient(180deg,transparent_0_95%,rgba(27,116,242,0.08)_95%_100%)] before:bg-[length:34px_34px] before:opacity-45 before:content-[''] [&>*]:relative [&>*]:z-1">
      <div className="flex min-h-0 flex-[1_1_auto] flex-col gap-3.5">
        <h4 className="text-[15px] leading-[1.35] font-extrabold text-text-dark">
          Điểm năng lực ĐGNL của bạn
        </h4>
        <div className="flex min-h-0 flex-[1_1_auto] flex-col justify-evenly gap-[18px]">
          {dimensions.map((dimension) => (
            <LevelLine key={dimension.title} title={dimension.title} data={dimension} />
          ))}
        </div>
      </div>
      <div className="mt-0.5 shrink-0 border-t border-line pt-4">
        <strong className="mb-3.5 block text-[15px] font-extrabold text-text-dark">
          Tổng quan ôn luyện
        </strong>
        <SummaryRow icon={<Clock3 size={16} />} label="Tổng thời lượng" value={summary.studyTime} />
        <SummaryRow
          icon={<BookOpen size={16} />}
          label="Bài học đã hoàn thành"
          value={summary.completedLessons}
        />
        <SummaryRow
          icon={<ClipboardCheck size={16} />}
          label="Đề đã làm"
          value={summary.completedTests}
        />
        <SummaryRow icon={<Trophy size={16} />} label="Điểm cao nhất" value={summary.bestScore} />
        <SummaryRow
          icon={<Flame size={16} />}
          label="Chuỗi học tập"
          value={`${summary.currentStreak} ngày`}
        />
      </div>
    </div>
  )
}

export default CompetencyPanel
