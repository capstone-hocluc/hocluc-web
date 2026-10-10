import { useState, type FormEvent } from 'react'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import {
  confirmAdminPayment,
  type OrderAdminDetail,
} from '../../../services/orderAdminService'
import { crudError } from './crud-errors'
import { formatVnd } from './crud-format'

/**
 * Administrator confirms by hand that the money arrived. The settlement runs through the same
 * path as the SePay webhook, so the student is never enrolled twice.
 */
export default function ConfirmPaymentDialog({
  order,
  onClose,
  onConfirmed,
}: {
  order: OrderAdminDetail
  onClose: () => void
  onConfirmed: (order: OrderAdminDetail) => void
}) {
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const received = amount.trim() === '' ? null : Number(amount)
  const amountInvalid = received !== null && (!Number.isFinite(received) || received < 0)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!reason.trim()) {
      setError('Cần nhập lý do xác nhận thanh toán.')
      return
    }
    if (amountInvalid) {
      setError('Số tiền nhận không hợp lệ.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const updated = await confirmAdminPayment(order.id, {
        reason: reason.trim(),
        receivedAmount: received,
      })
      onConfirmed(updated)
    } catch (err) {
      setError(crudError(err))
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title="Xác nhận thanh toán thủ công"
      maxWidth={560}
      dismissable={!busy}
      onSubmit={submit}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang xác nhận...' : 'Xác nhận thanh toán'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-tertiary">
          Đơn <strong className="font-medium text-text-primary">{order.orderCode}</strong> sẽ được đánh
          dấu đã thanh toán và cấp quyền học ngay, theo đúng luồng tự động.
        </p>
        <Field label="Lý do xác nhận" hint="Bắt buộc. Lưu vào đơn và lần thanh toán này để đối soát.">
          <textarea
            className={textareaControlClass}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
          />
        </Field>
        <Field
          label="Số tiền thực nhận (VND)"
          hint={`Để trống nếu nhận đủ ${formatVnd(order.totalAmount)}.`}
        >
          <input
            className={fieldControlClass}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
            disabled={busy}
          />
        </Field>
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
      </div>
    </ConsoleDialog>
  )
}
