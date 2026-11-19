import type { MentorStats } from '../../services/mentorProfileService'

interface Props {
  stats: MentorStats
  /** Questions a mentor takes per day, shown beside today's count when set. */
  dailyLimit?: number | null
}

/** A mentor's question counts as a row of figures; shared by the admin profile and the mentor's own dashboard. */
export default function MentorStatsTiles({ stats, dailyLimit }: Props) {
  const tiles = [
    { label: 'Đang phụ trách', value: stats.assigned },
    { label: 'Đang hỗ trợ', value: stats.inProgress },
    { label: 'Đã trả lời', value: stats.answered },
    { label: 'Đã hoàn tất', value: stats.resolved },
    { label: 'Nhận hôm nay', value: dailyLimit ? `${stats.assignedToday}/${dailyLimit}` : stats.assignedToday },
    {
      label: 'Từ lúc hỏi đến lần trả lời đầu',
      value: stats.averageFirstReplyMinutes === null ? '—' : `${stats.averageFirstReplyMinutes} phút`,
    },
  ]
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-lg border border-card-border bg-card-background px-3 py-2.5">
          <dt className="text-xs text-text-tertiary">{tile.label}</dt>
          <dd className="mt-1 text-lg font-semibold text-text-primary">{tile.value}</dd>
        </div>
      ))}
    </dl>
  )
}
