import type { ConsoleLiveClass } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMm,
  formatTimeRangeFromInstants,
  relativeDayLabel,
} from '../../../lib/liveScheduleFormat'
import { localToday } from '../../../lib/scheduling'
import { cn } from '../../../lib/cn'

interface Props {
  tab: 'upcoming' | 'past'
  onTabChange: (tab: 'upcoming' | 'past') => void
  upcoming: ConsoleLiveClass[]
  past: ConsoleLiveClass[]
  bookingBusyId: string | null
  onBook: (liveClassId: string) => void
}

export default function StudentAgendaCard({
  tab,
  onTabChange,
  upcoming,
  past,
  bookingBusyId,
  onBook,
}: Props) {
  const todayKey = localToday()
  const list = tab === 'upcoming' ? upcoming : past

  return (
    <section
      aria-label="Lịch 7 ngày tới"
      className="rounded-[20px] border border-[#e3ecf7] bg-card-background px-5 pt-2 pb-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 py-3">
        <h2 className="m-0 text-[17px] font-bold text-text-primary">7 ngày tới</h2>
        <div
          role="group"
          aria-label="Kiểu xem"
          className="flex gap-1 rounded-full bg-[#f4f8fe] p-1"
        >
          <button
            type="button"
            aria-pressed={tab === 'upcoming'}
            onClick={() => onTabChange('upcoming')}
            className={cn(
              'min-h-9 rounded-full px-4 text-sm',
              tab === 'upcoming'
                ? 'bg-[#1e88ff] font-semibold text-white'
                : 'bg-transparent text-text-primary'
            )}
          >
            Sắp tới
          </button>
          <button
            type="button"
            aria-pressed={tab === 'past'}
            onClick={() => onTabChange('past')}
            className={cn(
              'min-h-9 rounded-full px-4 text-sm',
              tab === 'past'
                ? 'bg-[#1e88ff] font-semibold text-white'
                : 'bg-transparent text-text-primary'
            )}
          >
            Đã học
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="m-0 border-t border-[#eef3f9] py-6 text-center text-sm text-text-tertiary">
          {tab === 'upcoming' ? 'Chưa có buổi học nào trong 7 ngày tới.' : 'Chưa có buổi học đã qua.'}
        </p>
      ) : (
        list.map((item) => {
          const dateKey = dateKeyOfInstant(item.startTime)
          const timeText = formatTimeRangeFromInstants(item.startTime, item.endTime)
          const isFull = !item.booked && item.seatsLeft === 0
          const subtext = item.booked
            ? [timeText, item.courseTitle].filter(Boolean).join(' · ')
            : item.seatsLeft != null
              ? `${timeText} · còn ${item.seatsLeft} chỗ`
              : [timeText, item.courseTitle].filter(Boolean).join(' · ')

          return (
            <div
              key={item.id}
              className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 border-t border-[#eef3f9] py-3.5"
            >
              <div className="text-[13px] text-[#526984]">
                {relativeDayLabel(dateKey, todayKey)}
                <strong className="block text-lg text-text-primary">{formatDdMm(dateKey)}</strong>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <strong className="text-[15px] text-text-primary">{item.title}</strong>
                  <span className="text-[13px] text-[#526984]">{subtext}</span>
                </div>

                {tab === 'upcoming' ? (
                  item.booked ? (
                    <span className="rounded-full bg-[#e3f0ff] px-3 py-1 text-[13px] font-semibold text-[#1565c0]">
                      Đã giữ chỗ
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={bookingBusyId === item.id || isFull}
                      onClick={() => onBook(item.id)}
                      className="min-h-10 rounded-full bg-[#1e88ff] px-4.5 text-sm font-semibold text-white hover:bg-[#1565c0] disabled:opacity-55"
                    >
                      {isFull ? 'Hết chỗ' : bookingBusyId === item.id ? 'Đang giữ…' : 'Giữ chỗ'}
                    </button>
                  )
                ) : (
                  <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-[13px] font-medium text-[#526984]">
                    Đã học
                  </span>
                )}
              </div>
            </div>
          )
        })
      )}
    </section>
  )
}
