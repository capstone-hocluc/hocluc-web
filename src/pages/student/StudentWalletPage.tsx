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
  if (!balance) return <Skeleton className="h-[132px] rounded-2xl" />
  return (
    <Card variant="panel" radius="lg" padding="lg" className="flex flex-wrap items-center gap-5">
      <CreditIcon size={64} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[34px] leading-none font-bold text-text-heading tabular-nums">
          {balance.available.toLocaleString('vi-VN')}
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
  )
}

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
                <Skeleton key={i} className="h-[168px] rounded-2xl" />
              ))}
            </div>
          }
          error={{ title: 'Không tải được các gói' }}
        />
        {status === 'ready' && packs && packs.length === 0 && (
          <MascotState title="Chưa có gói nào đang bán" />
        )}
        {status === 'ready' && packs && packs.length > 0 && (
          <div className="grid grid-cols-3 gap-4 max-[760px]:grid-cols-1">
            {packs.map((pack) => (
              <Card key={pack.id} variant="elevated" radius="lg" padding="lg" className="flex flex-col items-center gap-3 text-center">
                <CreditIcon size={44} />
                <p className="text-2xl font-bold text-text-heading tabular-nums">
                  {pack.credits.toLocaleString('vi-VN')} <span className="text-base font-semibold text-text-muted">{CREDIT_UNIT}</span>
                </p>
                <p className="text-sm text-text-muted">{pack.name}</p>
                <Button className="w-full" disabled={buying !== null} onClick={() => void buy(pack)}>
                  {buying === pack.id ? 'Đang tạo đơn...' : vnd(pack.price)}
                </Button>
              </Card>
            ))}
          </div>
        )}
        <p className="text-xs text-text-muted">
          {CREDIT_UNIT} đã mua không hết hạn, không đổi lại thành tiền và không chuyển cho tài khoản khác.
        </p>
      </div>
    </section>
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
        setLast(result.isLast)
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
      setLast(result.isLast)
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
