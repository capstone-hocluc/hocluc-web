import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import Notice from '../../console/notice'
import Panel from '../../console/panel'
import Status from '../../console/status'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import DateTime from '../../console/detail/date-time'
import DangerZone from '../../console/detail/danger-zone'
import DetailHeader from '../../console/detail/detail-header'
import DetailSection from '../../console/detail/detail-section'
import KeyFacts from '../../console/detail/key-facts'
import SystemInfo, { SystemRow } from '../../console/detail/system-info'
import { ArrowLeft } from '../../console/icons'
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

  /** Resolves to whether the confirmation should close: false keeps it open with the error shown. */
  async function cancel(): Promise<boolean> {
    if (busy) return false
    setBusy(true)
    setError('')
    try {
      await cancelAdminOrder(id)
      setNotice('Đã hủy đơn hàng.')
      resource.reload()
      return true
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err)) {
        resource.reload()
        return true
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  const order: OrderAdminDetail | null = resource.data
  const canClose = !readOnly && !!order && canCancelOrder(order.status)
  const canSettle = canConfirm && !!order && canConfirmOrder(order.status)

  // The channel that actually settled the order; before payment, the latest attempt.
  const settled = order?.payments.find((payment) => payment.status === 'SUCCESS') ?? order?.payments.at(-1)

  return (
    <section className="flex flex-col gap-5">
      <div>
        <Button appearance="ghost" onClick={onBack} disabled={busy}>
          <ArrowLeft size={16} />
          Danh sách đơn
        </Button>
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
      <ScheduleResourceState skeleton="detail"
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
      >
        {order && (
          <Panel>
            <div className="flex flex-col gap-5">
              <DetailHeader
                title={order.orderCode}
                chips={
                  <Status tone={ORDER_STATUS_TONES[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Status>
                }
                actions={
                  canSettle ? (
                    <Button
                      onClick={() => {
                        setError('')
                        setConfirming(true)
                      }}
                      disabled={busy}
                    >
                      Xác nhận thanh toán
                    </Button>
                  ) : undefined
                }
              />

              <KeyFacts
                facts={[
                  {
                    label: 'Học viên',
                    required: true,
                    value: (
                      <>
                        {order.studentName ?? order.studentEmail}
                        {order.studentName && (
                          <span className="block text-xs font-normal break-words text-text-tertiary">
                            {order.studentEmail}
                          </span>
                        )}
                      </>
                    ),
                  },
                  { label: 'Tổng tiền', required: true, value: formatVnd(order.totalAmount) },
                  { label: 'Phương thức', value: settled && PAYMENT_PROVIDER_LABELS[settled.provider] },
                  { label: 'Mã thanh toán', value: order.paymentCode },
                  { label: 'Tạo lúc', value: <DateTime value={order.createdAt} /> },
                  order.paidAt
                    ? { label: 'Thanh toán lúc', value: <DateTime value={order.paidAt} /> }
                    : {
                        label: 'Hạn thanh toán',
                        value: order.status === 'PENDING' && <DateTime value={order.expiresAt} />,
                      },
                ]}
              />

              <DetailSection title="Khóa học trong đơn">
                <DataTable
                  columns={itemColumns}
                  data={order.items}
                  getRowKey={(item) => item.courseId}
                  emptyMessage="Đơn không còn dòng nào."
                />
              </DetailSection>

              <DetailSection title="Lịch sử thanh toán">
                <DataTable
                  columns={paymentColumns}
                  data={order.payments}
                  getRowKey={(payment) => payment.id}
                  emptyMessage="Chưa có giao dịch nào được ghi nhận."
                />
              </DetailSection>

              <SystemInfo id={order.id}>
                <SystemRow label="Số lần tạo QR">{order.paymentAttempts}</SystemRow>
                {order.paidAt && order.expiresAt && (
                  <SystemRow label="Hạn thanh toán">
                    <DateTime value={order.expiresAt} />
                  </SystemRow>
                )}
                {order.confirmedAt && (
                  <>
                    <SystemRow label="Xác nhận thủ công">
                      {order.confirmedByEmail ?? EMPTY} · {formatDateTime(order.confirmedAt)}
                    </SystemRow>
                    <SystemRow label="Lý do">{order.confirmReason ?? EMPTY}</SystemRow>
                  </>
                )}
                {order.cancelledAt && (
                  <SystemRow label="Hủy bởi">
                    {order.cancelledByEmail ?? EMPTY} · {formatDateTime(order.cancelledAt)}
                  </SystemRow>
                )}
              </SystemInfo>

              {canClose && (
                <DangerZone
                  actions={[
                    {
                      id: 'cancel-order',
                      label: 'Hủy đơn',
                      hint: 'Đóng đơn chưa thanh toán. Học viên không thể thanh toán lại.',
                      busy,
                      onOpen: () => setError(''),
                      confirm: {
                        title: 'Hủy đơn hàng?',
                        description: (
                          <>
                            Đơn sẽ đóng vĩnh viễn và học viên không thể thanh toán lại. Chỉ áp dụng cho đơn chưa thanh toán.
                            {error && (
                              <span role="alert" className="mt-2 block text-danger">
                                {error}
                              </span>
                            )}
                          </>
                        ),
                        confirmLabel: 'Hủy đơn',
                        cancelLabel: 'Giữ đơn',
                      },
                      onConfirm: cancel,
                    },
                  ]}
                />
              )}
            </div>
          </Panel>
        )}
      </ScheduleResourceState>

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
