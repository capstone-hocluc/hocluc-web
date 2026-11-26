import Card, { CardTitle } from '../../ui/Card'
import type { StudentLiveAttendanceSummary } from '../../../services/liveClassService'

export default function StudentAttendanceBar({ summary }: { summary?: StudentLiveAttendanceSummary | null }) {
  const total = summary?.totalClasses ?? 0
  const stats = [
    { label: 'Tỷ lệ', value: total > 0 ? `${summary!.attendanceRate.toFixed(0)}%` : '—' },
    { label: 'Có mặt', value: summary?.presentCount ?? 0 },
    { label: 'Đi muộn', value: summary?.lateCount ?? 0 },
    { label: 'Vắng', value: summary?.absentCount ?? 0 },
  ]

  return (
    <Card as="section" padding="lg" aria-label="Chuyên cần" className="flex flex-wrap items-center gap-x-7 gap-y-3">
      <CardTitle className="mb-0 min-w-36 flex-1">Chuyên cần</CardTitle>
      <dl className="flex flex-wrap gap-6 text-sm text-text-secondary">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd className="text-xl font-semibold text-text-heading">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
