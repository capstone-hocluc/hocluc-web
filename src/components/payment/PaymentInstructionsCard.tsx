import { useState } from 'react'
import { Copy, QrCode } from '../console/icons'
import type { OrderPaymentData } from '../../services/orderService'
import { copyToClipboard } from '../../lib/clipboard'
import { formatCoursePrice } from '../../lib/courseFormat'

interface PaymentInstructionsCardProps {
  paymentData: OrderPaymentData
}

function CopyField({
  label,
  value,
  copyValue,
  successMessage,
  emphasize,
}: {
  label: string
  value: string
  copyValue: string
  successMessage: string
  emphasize?: boolean
}) {
  return (
    <div className="hl-pay-field">
      <span className="hl-pay-field-label">{label}</span>
      <div className="hl-pay-field-row">
        <strong className={emphasize ? 'is-emphasized' : ''}>{value}</strong>
        <button
          type="button"
          className="hl-pay-copy-btn"
          onClick={() => copyToClipboard(copyValue, successMessage)}
          aria-label={`Sao chép ${label}`}
        >
          <Copy size={14} />
        </button>
      </div>
    </div>
  )
}

function PaymentInstructionsCard({ paymentData }: PaymentInstructionsCardProps) {
  const [qrError, setQrError] = useState(false)
  const showQr = Boolean(paymentData.qrUrl) && !qrError

  return (
    <div className="hl-pay-card">
      <div className="hl-pay-qr-section">
        {showQr ? (
          <img
            src={paymentData.qrUrl}
            alt="Mã QR thanh toán"
            className="hl-pay-qr-image"
            onError={() => setQrError(true)}
          />
        ) : (
          <div className="hl-pay-qr-fallback">
            <QrCode size={40} />
            <p>Không thể hiển thị mã QR. Vui lòng dùng thông tin chuyển khoản bên dưới.</p>
          </div>
        )}
        {showQr && <p className="hl-pay-qr-caption">Quét mã QR bằng ứng dụng ngân hàng</p>}
      </div>

      <div className="hl-pay-info-section">
        <div className="hl-pay-field">
          <span className="hl-pay-field-label">Ngân hàng</span>
          <strong>{paymentData.bankCode}</strong>
        </div>

        <CopyField
          label="Số tài khoản"
          value={paymentData.accountNumber}
          copyValue={paymentData.accountNumber}
          successMessage="Đã sao chép số tài khoản."
        />

        <div className="hl-pay-field">
          <span className="hl-pay-field-label">Chủ tài khoản</span>
          <strong>{paymentData.accountName}</strong>
        </div>

        <CopyField
          label="Số tiền"
          value={formatCoursePrice(paymentData.amount)}
          copyValue={String(paymentData.amount)}
          successMessage="Đã sao chép số tiền."
          emphasize
        />

        <CopyField
          label="Nội dung chuyển khoản"
          value={paymentData.paymentCode}
          copyValue={paymentData.paymentCode}
          successMessage="Đã sao chép nội dung chuyển khoản."
          emphasize
        />

        <p className="hl-pay-warning">
          Vui lòng chuyển đúng số tiền và nội dung chuyển khoản để hệ thống xác nhận thanh toán.
        </p>
      </div>
    </div>
  )
}

export default PaymentInstructionsCard
