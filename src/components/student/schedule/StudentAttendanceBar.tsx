import type { StudentLiveAttendanceSummary } from '../../../services/liveClassService'

export default function StudentAttendanceBar({
  summary,
}: {
  summary?: StudentLiveAttendanceSummary | null
}) {
  const total = summary?.totalClasses ?? 0
  const rateText = total > 0 ? `${summary!.attendanceRate.toFixed(0)}%` : '—'

  return (
    <section
      aria-label="Chuyên cần"
      className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-[20px] border border-[#e3ecf7] bg-card-background px-5 py-4"
    >
      <h2 className="m-0 min-w-[140px] flex-1 text-[17px] font-bold text-text-primary">Chuyên cần</h2>
      <div className="flex flex-wrap gap-6 text-[13px] text-[#526984]">
        <div>
          Tỷ lệ
          <strong className="block text-xl text-text-primary">{rateText}</strong>
        </div>
        <div>
          Có mặt
          <strong className="block text-xl text-text-primary">{summary?.presentCount ?? 0}</strong>
        </div>
        <div>
          Đi muộn
          <strong className="block text-xl text-text-primary">{summary?.lateCount ?? 0}</strong>
        </div>
        <div>
          Vắng
          <strong className="block text-xl text-text-primary">{summary?.absentCount ?? 0}</strong>
        </div>
      </div>
    </section>
  )
}
