import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'
import StatusBadge from '../../ui/StatusBadge'
import type { ConsoleLiveClass } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMm,
  formatTimeRangeFromInstants,
  relativeDayLabel,
} from '../../../lib/liveScheduleFormat'
import { localToday } from '../../../lib/scheduling'

interface Props {
  tab: 'upcoming' | 'past'
  onTabChange: (tab: 'upcoming' | 'past') => void
  upcoming: ConsoleLiveClass[]
  past: ConsoleLiveClass[]
  bookingBusyId: string | null
  onBook: (liveClassId: string) => void
}

const TABS = [
  { id: 'upcoming' as const, label: 'Sắp tới' },
  { id: 'past' as const, label: 'Đã học' },
]

export default function StudentAgendaCard({ tab, onTabChange, upcoming, past, bookingBusyId, onBook }: Props) {
  const todayKey = localToday()
  const list = tab === 'upcoming' ? upcoming : past

  return (
    <Card as="section" padding="lg" aria-label="Lịch 7 ngày tới">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <CardTitle className="mb-0">7 ngày tới</CardTitle>
        <div role="group" aria-label="Kiểu xem" className="flex gap-1 rounded-full border border-line p-1">
          {TABS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              shape="pill"
              appearance={tab === item.id ? 'fill' : 'ghost'}
              aria-pressed={tab === item.id}
              className="min-h-9"
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="border-t border-line py-6 text-center text-sm text-text-secondary">
          {tab === 'upcoming' ? 'Chưa có buổi học nào trong 7 ngày tới.' : 'Chưa có buổi học đã qua.'}
        </p>
      ) : (
        <ul>
          {list.map((item) => {
            const dateKey = dateKeyOfInstant(item.startTime)
            const timeText = formatTimeRangeFromInstants(item.startTime, item.endTime)
            const isFull = !item.booked && item.seatsLeft === 0
            const subtext =
              !item.booked && item.seatsLeft != null
                ? `${timeText} · còn ${item.seatsLeft} chỗ`
                : [timeText, item.courseTitle].filter(Boolean).join(' · ')

            return (
              <li key={item.id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 border-t border-line py-3.5">
                <div className="text-sm text-text-secondary">
                  {relativeDayLabel(dateKey, todayKey)}
                  <strong className="block text-lg font-semibold text-text-heading">{formatDdMm(dateKey)}</strong>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <strong className="font-semibold text-text-heading">{item.title}</strong>
                    <span className="text-sm text-text-secondary">{subtext}</span>
                  </div>
                  {tab === 'past' ? (
                    <StatusBadge tone="neutral">Đã học</StatusBadge>
                  ) : item.booked ? (
                    <StatusBadge tone="primary">Đã giữ chỗ</StatusBadge>
                  ) : (
                    <Button
                      size="sm"
                      shape="pill"
                      disabled={bookingBusyId === item.id || isFull}
                      onClick={() => onBook(item.id)}
                    >
                      {isFull ? 'Hết chỗ' : bookingBusyId === item.id ? 'Đang giữ…' : 'Giữ chỗ'}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
