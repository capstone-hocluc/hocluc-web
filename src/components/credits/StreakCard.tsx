import { useMemo, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Notice from '../ui/Notice'
import Skeleton from '../ui/Skeleton'
import { Flame, Snowflake } from '../console/icons'
import { CreditAmount } from './CreditIcon'
import { CREDIT_UNIT, refreshCredits, setStreak, useCredits } from '../../lib/credits'
import { creditService, type StreakDay } from '../../services/creditService'
import { getErrorMessage } from '../../lib/errors'
import { cn } from '../../lib/cn'

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

/** The last seven days ending today, filled from the days the backend returned. */
function lastWeek(today: string, days: StreakDay[]) {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const end = new Date(`${today}T00:00:00`)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end)
    date.setDate(end.getDate() - (6 - index))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return { key, label: WEEKDAYS[date.getDay()], day: byDate.get(key), isToday: key === today }
  })
}

/** Daily learning streak: this week at a glance, and streak freezes bought with credits. */
function StreakCard() {
  const { streak, balance } = useCredits()
  const [confirming, setConfirming] = useState(false)
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const week = useMemo(() => (streak ? lastWeek(streak.today, streak.days) : []), [streak])

  if (!streak) {
    return <Skeleton className="h-[188px] rounded-2xl" />
  }

  const atLimit = streak.freezesAvailable >= streak.maxFreezes
  const canAfford = (balance?.available ?? 0) >= streak.freezePrice

  const buy = async () => {
    setBuying(true)
    setError(null)
    try {
      setStreak(await creditService.buyFreeze(crypto.randomUUID()))
      setConfirming(false)
      void refreshCredits()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBuying(false)
    }
  }

  return (
    <Card variant="panel" radius="lg" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-streak-soft text-streak">
            <Flame size={20} />
          </span>
          <div>
            <p className="text-xl font-bold text-text-heading tabular-nums">{streak.current} ngày</p>
            <p className="text-xs text-text-muted">Dài nhất {streak.longest} ngày</p>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-lg bg-surface-brand px-2 py-1 text-xs font-semibold text-primary-text"
          aria-label={`${streak.freezesAvailable} lượt đóng băng`}
        >
          <Snowflake size={14} />
          {streak.freezesAvailable}/{streak.maxFreezes}
        </span>
      </div>

      <ol className="grid grid-cols-7 gap-1.5" aria-label="7 ngày gần nhất">
        {week.map(({ key, label, day, isToday }) => (
          <li key={key} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                'grid size-8 place-items-center rounded-full border text-xs',
                day?.qualified
                  ? 'border-transparent bg-streak text-white'
                  : day?.frozen
                    ? 'border-transparent bg-surface-brand text-primary-text'
                    : 'border-line bg-surface text-text-muted',
                isToday && !day?.qualified && 'border-streak border-dashed'
              )}
              title={day?.qualified ? 'Đã học' : day?.frozen ? 'Đóng băng' : undefined}
            >
              {day?.qualified ? <Flame size={14} /> : day?.frozen ? <Snowflake size={14} /> : null}
            </span>
            <span className={cn('text-[11px]', isToday ? 'font-bold text-text-heading' : 'text-text-muted')}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {!streak.doneToday && (
        <p className="text-sm text-text-body">Hoàn thành một bài học hoặc đạt một bài kiểm tra để giữ chuỗi hôm nay.</p>
      )}

      <Button
        appearance="outline"
        size="sm"
        disabled={atLimit}
        onClick={() => {
          setError(null)
          setConfirming(true)
        }}
      >
        <Snowflake size={16} />
        {atLimit ? 'Đã đủ lượt đóng băng' : 'Mua đóng băng chuỗi'}
      </Button>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Mua đóng băng chuỗi" maxWidth={420}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-body">
            Mỗi lượt giữ chuỗi cho bạn khi lỡ một ngày. Lượt chỉ dùng cho những ngày lỡ sau khi mua.
          </p>
          <div className="flex items-center justify-between rounded-xl bg-surface-hover px-4 py-3 text-sm">
            <span className="text-text-body">Giá</span>
            <CreditAmount value={streak.freezePrice} />
          </div>
          {!canAfford && (
            <Notice tone="warning">Bạn chưa đủ {CREDIT_UNIT} để mua lượt này.</Notice>
          )}
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="flex justify-end gap-2">
            <Button appearance="ghost" onClick={() => setConfirming(false)}>
              Để sau
            </Button>
            <Button onClick={buy} disabled={buying || !canAfford}>
              {buying ? 'Đang mua...' : 'Mua'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}

export default StreakCard
