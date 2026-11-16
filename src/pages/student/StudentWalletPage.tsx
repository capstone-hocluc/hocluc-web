import { useEffect, useState } from 'react'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import SectionHeader from '../../components/student/common/SectionHeader'
import ResourceState from '../../components/student/common/ResourceState'
import MascotState from '../../components/common/MascotState'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import Skeleton from '../../components/ui/Skeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import { CreditAmount, CreditIcon } from '../../components/credits/CreditIcon'
import { usePageResource } from '../../hooks/usePageResource'
import { ApiError } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatDateTime } from '../../lib/courseFormat'
import { CREDIT_ENTRY_LABELS, CREDIT_UNIT, creditEntryPurpose, useCredits } from '../../lib/credits'
import { creditService, type CreditEntry, type CreditPack } from '../../services/creditService'
import { cn } from '../../lib/cn'

interface StudentWalletPageProps {
  /** Opens the SePay QR page of a pack order. */
  onOpenPayment: (orderId: string) => void
}

const vnd = (value: number) => `${value.toLocaleString('vi-VN')}đ`

/** The student's stars: balance, packs to buy and every movement. */
function StudentWalletPage({ onOpenPayment }: StudentWalletPageProps) {
  return (
    <StudentPageContainer width="narrow" className="pb-10">
      <StudentPageHeader title={`Ví ${CREDIT_UNIT}`} />
      <div className="flex flex-col gap-8">
        <BalanceCard />
        <Packs onOpenPayment={onOpenPayment} />
        <History />
      </div>
    </StudentPageContainer>
  )
}

function BalanceCard() {
  const { balance } = useCredits()
  if (!balance) return <Skeleton className="h-[148px] rounded-2xl" />
  return (
    <Card
      radius="lg"
      padding="lg"
      className="relative flex flex-wrap items-center gap-5 overflow-hidden border-live-line bg-linear-to-br from-live-tint via-surface to-surface"
    >
      {/* A large star behind the balance, faint, so the card reads as the wallet without more words. */}
      <CreditIcon size={180} className="pointer-events-none absolute -top-10 -right-8 opacity-15" />
      <span className="grid size-[72px] shrink-0 place-items-center rounded-2xl bg-live-soft">
        <CreditIcon size={48} />
      </span>
      <div className="relative flex min-w-0 flex-1 flex-col gap-2.5">
        <p className="text-[40px] leading-none font-bold text-text-heading tabular-nums">
          {balance.available.toLocaleString('vi-VN')}
          <span className="ml-2 text-lg font-semibold text-text-muted">{CREDIT_UNIT}</span>
        </p>
        <ul className="flex flex-wrap gap-2 text-[13px]">
          <BalancePart value={balance.bonus} label="thưởng" />
          <BalancePart value={balance.paid} label="đã mua" />
          {balance.held > 0 && <BalancePart value={balance.held} label="đang tạm giữ" muted />}
        </ul>
      </div>
    </Card>
  )
}

function BalancePart({ value, label, muted = false }: { value: number; label: string; muted?: boolean }) {
  return (
    <li
      className={cn(
        'rounded-full border px-3 py-1',
        muted ? 'border-line bg-surface text-text-muted' : 'border-live-line bg-surface text-text-body'
      )}
    >
      <span className="font-semibold text-text-heading tabular-nums">{value.toLocaleString('vi-VN')}</span> {CREDIT_UNIT}{' '}
      {label}
    </li>
  )
}

/** What one star costs in a pack, rounded to the đồng. */
const perStar = (pack: CreditPack) => Math.round(pack.price / pack.credits)

/** A pack's name when it says more than its size ("Gói 50" for 50 Sao says nothing new). */
const packName = (pack: CreditPack) => (/^gói\s*\d+$/i.test(pack.name.trim()) ? null : pack.name)

function Packs({ onOpenPayment }: StudentWalletPageProps) {
  const { data: packs, status, errorMessage, reload } = usePageResource(() => creditService.packs(), [], {
    forbidden: false,
    notFound: false,
  })
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string; activeOrderId?: string } | null>(null)

  const buy = async (pack: CreditPack) => {
    setBuying(pack.id)
    setError(null)
    try {
      const payment = await creditService.checkoutPack(pack.id, `pack-${pack.id}-${crypto.randomUUID()}`)
      onOpenPayment(payment.order.id)
    } catch (e) {
      const activeOrderId =
        e instanceof ApiError && e.code === 'ORDER_PAYMENT_IN_PROGRESS' ? e.errors?.activeOrderId : undefined
      setError({ message: getErrorMessage(e), activeOrderId })
    } finally {
      setBuying(null)
    }
  }

  // Savings are measured against the dearest star on sale; the pack with the cheapest star is the best value.
  const dearest = packs?.length ? Math.max(...packs.map(perStar)) : 0
  const best = packs && packs.length > 1 ? packs.reduce((a, b) => (perStar(b) < perStar(a) ? b : a)) : null

  return (
    <section>
      <SectionHeader title={`Mua ${CREDIT_UNIT}`} />
      <div className="mt-4 flex flex-col gap-4">
        {error && (
          <Notice tone="warning" className="flex flex-wrap items-center gap-3">
            <span>{error.message}</span>
            {error.activeOrderId && (
              <Button appearance="ghost" size="sm" onClick={() => onOpenPayment(error.activeOrderId!)}>
                Mở đơn đang chờ
              </Button>
            )}
          </Notice>
        )}
        <ResourceState
          status={status}
          errorMessage={errorMessage}
          onRetry={reload}
          loading={
            <div className="grid grid-cols-3 gap-4 max-[760px]:grid-cols-1">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[236px] rounded-2xl max-[760px]:h-[92px]" />
              ))}
            </div>
          }
          error={{ title: 'Không tải được các gói' }}
        />
        {status === 'ready' && packs && packs.length === 0 && <MascotState title="Chưa có gói nào đang bán" />}
        {status === 'ready' && packs && packs.length > 0 && (
          <ul className="grid grid-cols-3 gap-4 max-[760px]:grid-cols-1">
            {packs.map((pack, index) => (
              <PackCard
                key={pack.id}
                pack={pack}
                tier={Math.min(index, 2) + 1}
                saving={dearest > 0 ? Math.round((1 - perStar(pack) / dearest) * 100) : 0}
                best={best?.id === pack.id}
                buying={buying}
                onBuy={() => void buy(pack)}
              />
            ))}
          </ul>
        )}
        <p className="text-xs text-text-muted">
          {CREDIT_UNIT} đã mua không hết hạn, không đổi lại thành tiền và không chuyển cho tài khoản khác.
        </p>
      </div>
    </section>
  )
}

/** One star per tier of the pack, a little apart: its size at a glance. */
function StarStack({ count }: { count: number }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5 [&_svg]:size-10 max-[760px]:[&_svg]:size-7" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <CreditIcon key={i} size={40} />
      ))}
    </span>
  )
}

function PackCard({
  pack,
  tier,
  saving,
  best,
  buying,
  onBuy,
}: {
  pack: CreditPack
  tier: number
  saving: number
  best: boolean
  buying: string | null
  onBuy: () => void
}) {
  const name = packName(pack)
  return (
    <li
      className={cn(
        'relative flex flex-col items-center gap-4 rounded-2xl border bg-surface p-5 pt-7 text-center transition-shadow hover:shadow-card',
        'max-[760px]:flex-row max-[760px]:gap-3.5 max-[760px]:p-4 max-[760px]:text-left',
        best ? 'border-live bg-linear-to-b from-live-tint to-surface shadow-card-soft' : 'border-line-card'
      )}
    >
      {best && (
        <StatusBadge
          tone="live"
          size="sm"
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 font-semibold whitespace-nowrap max-[760px]:right-3 max-[760px]:left-auto max-[760px]:translate-x-0"
        >
          Lợi nhất
        </StatusBadge>
      )}
      <span className="grid h-14 place-items-center max-[760px]:h-auto max-[760px]:w-[88px] max-[760px]:justify-items-start">
        <StarStack count={tier} />
      </span>
      <div className="flex min-w-0 flex-col items-center gap-1 max-[760px]:flex-1 max-[760px]:items-start">
        <p className="text-[28px] leading-none font-bold text-text-heading tabular-nums max-[760px]:text-2xl">
          {pack.credits.toLocaleString('vi-VN')}
          <span className="ml-1.5 text-base font-semibold text-text-muted">{CREDIT_UNIT}</span>
        </p>
        {name && <p className="text-sm text-text-body">{name}</p>}
        <p className="text-xs whitespace-nowrap text-text-muted">
          {perStar(pack).toLocaleString('vi-VN')}đ / {CREDIT_UNIT}
          {saving > 0 && <span className="ml-1.5 font-semibold text-success">−{saving}%</span>}
        </p>
      </div>
      <Button
        className="w-full max-[760px]:w-auto max-[760px]:shrink-0"
        appearance={best ? 'fill' : 'outline'}
        disabled={buying !== null}
        onClick={onBuy}
      >
        {buying === pack.id ? 'Đang tạo đơn...' : vnd(pack.price)}
      </Button>
    </li>
  )
}

function History() {
  const [rows, setRows] = useState<CreditEntry[] | null>(null)
  const [page, setPage] = useState(0)
  const [last, setLast] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { balance } = useCredits()

  // Reload from the top whenever the balance changes, so a new movement shows up.
  useEffect(() => {
    let cancelled = false
    creditService
      .history(0, 20)
      .then((result) => {
        if (cancelled) return
        setRows(result.content)
        setPage(0)
        setLast(result.last)
        setError(null)
      })
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [balance?.available, balance?.held])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const result = await creditService.history(page + 1, 20)
      setRows((current) => [...(current ?? []), ...result.content])
      setPage(page + 1)
      setLast(result.last)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <section>
      <SectionHeader title="Lịch sử" />
      <div className="mt-4">
        {error && <Notice tone="danger">{error}</Notice>}
        {rows === null && !error && <Skeleton className="h-[240px] rounded-2xl" />}
        {rows !== null && rows.length === 0 && <MascotState title={`Chưa có giao dịch ${CREDIT_UNIT}`} />}
        {rows !== null && rows.length > 0 && (
          <Card radius="lg" padding="none">
            <ul className="divide-y divide-line">
              {rows.map((row) => (
                <HistoryRow key={row.id} row={row} />
              ))}
            </ul>
          </Card>
        )}
        {rows !== null && !last && (
          <div className="mt-4 flex justify-center">
            <Button appearance="outline" size="sm" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? 'Đang tải...' : 'Xem thêm'}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

function HistoryRow({ row }: { row: CreditEntry }) {
  const purpose = creditEntryPurpose(row.refType)
  const label = CREDIT_ENTRY_LABELS[row.type] ?? row.type
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-heading">
          {purpose ? `${label} · ${purpose}` : row.note ? `${label} · ${row.note}` : label}
        </p>
        <p className="text-xs text-text-muted">
          {formatDateTime(row.createdAt)}
          {row.expiresAt && row.amount > 0 ? ` · hết hạn ${formatDateTime(row.expiresAt)}` : ''}
        </p>
      </div>
      {row.amount !== 0 ? (
        <CreditAmount
          value={row.amount}
          signed
          className={cn(row.amount > 0 ? 'text-success' : 'text-text-body')}
        />
      ) : (
        <span className="text-sm text-text-muted">Đã trừ phần tạm giữ</span>
      )}
    </li>
  )
}

export default StudentWalletPage
