import { Video } from '../../console/icons'
import Button from '../../ui/Button'
import ConfirmDialog from '../../ui/ConfirmDialog'
import { CREDIT_UNIT } from '../../../lib/credits'
import { useLiveClassJoin, type JoinableLiveClass } from '../../../hooks/useLiveClassJoin'

interface LiveClassJoinButtonProps {
  liveClass: JoinableLiveClass
  size?: 'sm' | 'md'
  shape?: 'default' | 'pill'
  showIcon?: boolean
  onJoined?: () => void
}

export default function LiveClassJoinButton({
  liveClass,
  size = 'sm',
  shape = 'default',
  showIcon = false,
  onJoined,
}: LiveClassJoinButtonProps) {
  const join = useLiveClassJoin(liveClass, onJoined)

  if (!join.visible) return null

  return (
    <>
      <div className="flex flex-col items-start gap-1.5">
        <Button
          size={size}
          shape={shape}
          disabled={join.isUpcoming || join.busy}
          onClick={join.handleJoinClick}
        >
          {showIcon && <Video aria-hidden="true" />}
          {join.busy ? 'Đang vào lớp…' : join.label}
        </Button>
        {join.error && (
          <p className="text-sm text-danger" role="alert">
            {join.error}
          </p>
        )}
      </div>

      {join.confirmOpen && (
        <ConfirmDialog
          title="Tham gia buổi học?"
          description={
            <>
              Tham gia buổi học <strong>{liveClass.title}</strong> sẽ trừ{' '}
              <strong>
                {join.price} {CREDIT_UNIT}
              </strong>{' '}
              (chỉ tính một lần cho buổi học này).
            </>
          }
          cancelLabel="Hủy"
          confirmLabel={`Tham gia · ${join.price} ${CREDIT_UNIT}`}
          busyLabel="Đang xử lý…"
          busy={join.busy}
          onCancel={() => join.setConfirmOpen(false)}
          onConfirm={() => void join.executeJoin()}
        />
      )}

      {join.insufficientOpen && (
        <ConfirmDialog
          title="Không đủ Sao"
          description={
            <>
              Bạn cần có ít nhất{' '}
              <strong>
                {join.price} {CREDIT_UNIT}
              </strong>{' '}
              để tham gia buổi học này. Hãy mua thêm gói Sao để tiếp tục.
            </>
          }
          cancelLabel="Đóng"
          confirmLabel="Mua gói Sao"
          onCancel={() => join.setInsufficientOpen(false)}
          onConfirm={join.goToBuyCredits}
        />
      )}
    </>
  )
}
