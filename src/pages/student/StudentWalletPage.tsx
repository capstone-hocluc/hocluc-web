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
import PurchaseArrival from '../../components/credits/PurchaseArrival'
import { useShownBalance } from '../../components/credits/use-shown-balance'
import { usePageResource } from '../../hooks/usePageResource'
import { ApiError } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatDateTime } from '../../lib/courseFormat'
import { CREDIT_ENTRY_LABELS, CREDIT_UNIT, creditEntryPurpose, refreshCredits, useCredits } from '../../lib/credits'
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
      <StudentWalletContent onOpenPayment={onOpenPayment} />
    </StudentPageContainer>
  )
}

export function StudentWalletContent({ onOpenPayment }: StudentWalletPageProps) {
  return (
    <div className="flex flex-col gap-5">
      <BalanceCard />
      <Packs onOpenPayment={onOpenPayment} />
      <History />
      <PurchaseArrival />
    </div>
  )
}

function BalanceCard() {
  const { balance, balanceError } = useCredits()
  const shown = useShownBalance(balance?.available ?? null)
  if (!balance) {
    return balanceError ? <BalanceLoadError /> : <Skeleton className="h-[132px] rounded-2xl" />
  }
  return (
    <>
      {balanceError && <BalanceLoadError hasPreviousBalance />}
      <Card variant="panel" radius="lg" padding="none" className="flex flex-wrap items-center gap-4 p-4">
        <CreditIcon size={44} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[28px] leading-none font-bold text-text-heading tabular-nums">
            {(shown.value ?? balance.available).toLocaleString('vi-VN')}
            <span className="ml-2 text-lg font-semibold text-text-muted">{CREDIT_UNIT}</span>
          </p>
          <p className="text-sm text-text-body">
            {balance.bonus.toLocaleString('vi-VN')} {CREDIT_UNIT} thưởng · {balance.paid.toLocaleString('vi-VN')}{' '}
            {CREDIT_UNIT} đã mua
          </p>
          {balance.held > 0 && (
            <p className="text-sm text-text-muted">
              {balance.held.toLocaleString('vi-VN')} {CREDIT_UNIT} đang tạm giữ cho câu hỏi chưa có lời giải.
            </p>
          )}
        </div>
      </Card>
    </>
  )
}

function BalanceLoadError({ hasPreviousBalance = false }: { hasPreviousBalance?: boolean }) {
  return (
    <Notice tone="danger" className="flex-wrap justify-between gap-3">
      <span>{hasPreviousBalance ? 'Không thể cập nhật số dư. Bạn đang xem số dư lần tải trước.' : 'Không tải được số dư Ví Sao.'}</span>
      <Button appearance="outline" size="sm" onClick={() => void refreshCredits()}>Thử lại</Button>
    </Notice>
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
      <SectionHeader title={`Mua ${CREDIT_UNIT}`} titleClassName="text-lg max-[760px]:text-lg" />
      <div className="mt-3 flex flex-col gap-3">
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
          <ul className="grid max-h-[360px] grid-cols-3 gap-3 overflow-y-auto px-1 pt-3 pb-1 max-[1100px]:grid-cols-2 max-[760px]:grid-cols-1" aria-label="Các gói Sao" tabIndex={0}>
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
    <span className="flex shrink-0 items-center gap-0.5 [&_svg]:size-7 max-[760px]:[&_svg]:size-6" aria-hidden="true">
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
        'relative flex flex-col items-center gap-2 rounded-2xl border bg-surface p-3 pt-5 text-center transition-shadow hover:shadow-card',
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
      <span className="grid h-14 place-items-center max-[760px]:h-auto max-[760px]:w-[76px] max-[760px]:justify-items-start">
        <StarStack count={tier} />
      </span>
      <div className="flex min-w-0 flex-col items-center gap-1 max-[760px]:flex-1 max-[760px]:items-start">
        <p className="text-xl leading-none font-bold text-text-heading tabular-nums max-[760px]:text-xl">
          {pack.credits.toLocaleString('vi-VN')}
          <span className="ml-1.5 text-base font-semibold text-text-muted">{CREDIT_UNIT}</span>
        </p>
        {name && <p className="text-sm text-text-body">{name}</p>}
        <p className="flex flex-wrap justify-center gap-x-1.5 text-xs whitespace-nowrap text-text-muted max-[760px]:justify-start">
          <span>
            {perStar(pack).toLocaleString('vi-VN')}đ / {CREDIT_UNIT}
          </span>
          {saving > 0 && <span className="font-semibold text-success">−{saving}%</span>}
        </p>
      </div>
      <Button
        size="sm"
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
      .history(0, 5)
      .then((result) => {
        if (cancelled) return
        setRows([...result.content].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
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
      const result = await creditService.history(page + 1, 5)
      setRows((current) => [...new Map([...(current ?? []), ...result.content].map(row => [row.id, row])).values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
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
      <SectionHeader title="Lịch sử giao dịch" titleClassName="text-lg max-[760px]:text-lg" />
      <p className="mt-1 text-xs text-text-secondary">Mới nhất trước · Tải thêm 5 giao dịch mỗi lần</p>
      <div className="mt-3">
        {error && <Notice tone="danger">{error}</Notice>}
        {rows === null && !error && <Skeleton className="h-[240px] rounded-2xl" />}
        {rows !== null && rows.length === 0 && <MascotState title={`Chưa có giao dịch ${CREDIT_UNIT}`} />}
        {rows !== null && rows.length > 0 && (
          <Card radius="lg" padding="none">
            <ul className="max-h-[300px] divide-y divide-line overflow-y-auto" aria-label="Lịch sử giao dịch Sao" tabIndex={0}>
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
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
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
