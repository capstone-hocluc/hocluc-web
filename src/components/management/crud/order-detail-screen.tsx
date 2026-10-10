import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import Notice from '../../console/notice'
import Panel from '../../console/panel'
import Status from '../../console/status'
import ConfirmDialog from '../../console/confirm-dialog'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { ArrowLeft, RefreshCw } from '../../console/icons'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import {
  cancelAdminOrder,
  getAdminOrder,
  type OrderAdminDetail,
  type OrderItem,
  type OrderPayment,
} from '../../../services/orderAdminService'
import { crudError, unknownMutation } from './crud-errors'
import { EMPTY, formatDateTime, formatVnd } from './crud-format'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES, PAYMENT_PROVIDER_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES, canCancelOrder, canConfirmOrder } from './order-labels'
import ConfirmPaymentDialog from './confirm-payment-dialog'

export default function OrderDetailScreen({
  id,
  readOnly,
  canConfirm,
  onBack,
}: {
  id: string
  readOnly: boolean
  canConfirm: boolean
  onBack: () => void
}) {
  const resource = useScheduleResource(`admin-order:${id}`, () => getAdminOrder(id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const itemColumns = useMemo<ColumnDef<OrderItem>[]>(
    () => [
      { accessorKey: 'courseTitle', header: 'Khóa học', enableSorting: false },
      {
        id: 'unitPrice',
        header: 'Đơn giá (chốt lúc đặt)',
        cell: ({ row }) => <span className="whitespace-nowrap">{formatVnd(row.original.unitPrice)}</span>,
      },
    ],
    []
  )

  const paymentColumns = useMemo<ColumnDef<OrderPayment>[]>(
    () => [
      {
        id: 'provider',
        header: 'Kênh',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-32">
            <span className="block">{PAYMENT_PROVIDER_LABELS[row.original.provider]}</span>
            {row.original.manual && (
              <span className="mt-1 block text-xs text-text-tertiary">Xác nhận thủ công</span>
            )}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Kết quả',
        cell: ({ row }) => (
          <Status tone={PAYMENT_STATUS_TONES[row.original.status]}>
            {PAYMENT_STATUS_LABELS[row.original.status]}
          </Status>
        ),
      },
      {
        id: 'amount',
        header: 'Số tiền',
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatVnd(row.original.amount)}</span>
        ),
      },
      {
        id: 'reference',
        header: 'Mã giao dịch',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-48 truncate text-text-tertiary">
            {row.original.transactionNo ?? (row.original.sepayTransactionId ?? EMPTY)}
          </span>
        ),
      },
      {
        id: 'when',
        header: 'Thời điểm',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateTime(row.original.paidAt ?? row.original.createdAt)}</span>
        ),
      },
      {
        id: 'note',
        header: 'Ghi chú',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="max-w-64 text-xs text-text-tertiary">
            {row.original.confirmedByEmail && <span className="block">{row.original.confirmedByEmail}</span>}
            {row.original.confirmReason && <span className="block">{row.original.confirmReason}</span>}
            {!row.original.confirmedByEmail && !row.original.confirmReason && EMPTY}
          </div>
        ),
      },
    ],
    []
  )

  async function cancel() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await cancelAdminOrder(id)
      setNotice('Đã hủy đơn hàng.')
      setCancelling(false)
      resource.reload()
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err)) {
        setCancelling(false)
        resource.reload()
      }
    } finally {
      setBusy(false)
    }
  }

  const order: OrderAdminDetail | null = resource.data
  const canClose = !readOnly && !!order && canCancelOrder(order.status)
  const canSettle = canConfirm && !!order && canConfirmOrder(order.status)

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button appearance="ghost" onClick={onBack} disabled={busy}>
          <ArrowLeft size={16} />
          Danh sách đơn
        </Button>
        <div className="flex gap-2">
          <Button
            appearance="outline"
            onClick={resource.reload}
            disabled={busy || resource.status === 'loading'}
          >
            <RefreshCw size={16} />
            Làm mới
          </Button>
          {canClose && (
            <Button
              variant="danger"
              appearance="outline"
              onClick={() => {
                setError('')
                setCancelling(true)
              }}
              disabled={busy}
            >
              Hủy đơn
            </Button>
          )}
          {canSettle && (
            <Button
              onClick={() => {
                setError('')
                setConfirming(true)
              }}
              disabled={busy}
            >
              Xác nhận thanh toán
            </Button>
          )}
        </div>
      </div>
      {notice && (
        <Notice tone="info">
          <span role="status">{notice}</span>
        </Notice>
      )}
      {error && (
        <Notice tone="danger">
          <span role="alert">{error}</span>
        </Notice>
      )}
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
      >
        {order && (
          <>
            <Panel
              title={<span className="break-words">{order.orderCode}</span>}
              action={
                <Status tone={ORDER_STATUS_TONES[order.status]}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Status>
              }
            >
              <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <dt className="text-text-tertiary">Học viên</dt>
                  <dd className="mt-1 font-medium text-text-primary">
                    {order.studentName ?? order.studentEmail}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Email</dt>
                  <dd className="mt-1 break-words font-medium text-text-primary">
                    {order.studentEmail}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Tổng tiền</dt>
                  <dd className="mt-1 font-medium text-text-primary">{formatVnd(order.totalAmount)}</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Mã thanh toán</dt>
                  <dd className="mt-1 break-words font-medium text-text-primary">
                    {order.paymentCode ?? EMPTY}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Tạo lúc</dt>
                  <dd className="mt-1 font-medium text-text-primary">{formatDateTime(order.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Hạn thanh toán</dt>
                  <dd className="mt-1 font-medium text-text-primary">{formatDateTime(order.expiresAt)}</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Thanh toán lúc</dt>
                  <dd className="mt-1 font-medium text-text-primary">{formatDateTime(order.paidAt)}</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Số lần tạo QR</dt>
                  <dd className="mt-1 font-medium text-text-primary">{order.paymentAttempts}</dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Khóa học trong đơn">
              <DataTable
                columns={itemColumns}
                data={order.items}
                getRowKey={(item) => item.courseId}
                emptyMessage="Đơn không còn dòng nào."
              />
            </Panel>

            <Panel title="Lịch sử thanh toán">
              <DataTable
                columns={paymentColumns}
                data={order.payments}
                getRowKey={(payment) => payment.id}
                emptyMessage="Chưa có giao dịch nào được ghi nhận."
              />
            </Panel>

            {(order.confirmedAt || order.cancelledAt || order.confirmReason) && (
              <Panel title="Dấu vết xử lý">
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  {order.confirmedAt && (
                    <>
                      <div>
                        <dt className="text-text-tertiary">Xác nhận thủ công</dt>
                        <dd className="mt-1 font-medium text-text-primary">
                          {order.confirmedByEmail ?? EMPTY} · {formatDateTime(order.confirmedAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-text-tertiary">Lý do</dt>
                        <dd className="mt-1 font-medium text-text-primary">
                          {order.confirmReason ?? EMPTY}
                        </dd>
                      </div>
                    </>
                  )}
                  {order.cancelledAt && (
                    <div>
                      <dt className="text-text-tertiary">Hủy bởi</dt>
                      <dd className="mt-1 font-medium text-text-primary">
                        {order.cancelledByEmail ?? EMPTY} · {formatDateTime(order.cancelledAt)}
                      </dd>
                    </div>
                  )}
                </dl>
              </Panel>
            )}
          </>
        )}
      </ScheduleResourceState>

      {cancelling && (
        <ConfirmDialog
          title="Hủy đơn hàng?"
          description={
            <>
              Đơn sẽ đóng vĩnh viễn và học viên không thể thanh toán lại. Chỉ áp dụng cho đơn chưa thanh toán.
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Giữ đơn"
          confirmLabel="Hủy đơn"
          variant="danger"
          busy={busy}
          onCancel={() => setCancelling(false)}
          onConfirm={() => void cancel()}
        />
      )}

      {confirming && order && (
        <ConfirmPaymentDialog
          order={order}
          onClose={() => setConfirming(false)}
          onConfirmed={() => {
            setConfirming(false)
            setNotice('Đã xác nhận thanh toán thủ công.')
            resource.reload()
          }}
        />
      )}
    </section>
  )
}
