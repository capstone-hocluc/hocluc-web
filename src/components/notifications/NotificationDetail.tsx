import { useNotifications } from '../../hooks/useNotifications'
import { useActiveRole } from '../../hooks/useActiveRole'
import { ROLE_LABELS } from '../../lib/role-home'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Notice from '../ui/Notice'
import type { UserNotification } from '../../services/notificationService'
import type { UserRole } from '../../services/userService'

export function NotificationTime({ value, className }: { value: string; className?: string }) {
  const date = new Date(value)
  return <time dateTime={value} className={className}>
    {Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })}
  </time>
}

/** The feed's one detail dialog, whichever bell or toast opened it. */
export default function NotificationDetail({ notification, switchTo, onClose }: {
  notification: UserNotification | null
  /** The role it was sent to, when the user must switch to it before its page can open. */
  switchTo: UserRole | null
  onClose: () => void
}) {
  const feed = useNotifications()
  const { switchRole, switching, error: switchError } = useActiveRole()

  return <Modal open={notification !== null} title="Chi tiết thông báo" maxWidth={640}
    description={notification ? <NotificationTime value={notification.createdAt} className="text-xs text-text-tertiary" /> : undefined}
    className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col overflow-hidden [&>h2]:pr-8"
    onClose={onClose}>
    {notification && <>
      <div role="region" aria-label="Nội dung thông báo" tabIndex={0}
        className="min-h-0 app-scroll overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-4 focus-visible:outline-2 focus-visible:outline-focus-ring">
        <h3 className="mb-3 text-base font-semibold leading-6 text-text-heading [overflow-wrap:anywhere]">{notification.title}</h3>
        <p className="text-sm leading-7 whitespace-pre-wrap text-text-body [overflow-wrap:anywhere]">{notification.message || 'Thông báo này không có nội dung bổ sung.'}</p>
      </div>
      {feed.mutationError && <Notice tone="danger" role="alert" className="shrink-0 text-xs font-normal">
        {feed.mutationError}
        <Button size="sm" appearance="ghost" disabled={Boolean(feed.busy)} onClick={() => void feed.markRead(notification)}>Thử lại đánh dấu đã đọc</Button>
      </Notice>}
      {switchTo && switchError && <Notice tone="danger" role="alert" className="shrink-0 text-xs font-normal">{switchError}</Notice>}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-xs text-text-tertiary" role="status">{feed.busy === notification.id ? 'Đang đánh dấu đã đọc...' : notification.read ? 'Đã đọc' : 'Chưa đọc'}</span>
        <div className="flex flex-wrap justify-end gap-2">
          {switchTo && <Button size="sm" disabled={switching} onClick={() => switchRole(switchTo)}>
            {switching ? 'Đang chuyển vai trò...' : `Chuyển sang vai trò ${ROLE_LABELS[switchTo]}`}
          </Button>}
          <Button size="sm" appearance="outline" onClick={onClose}>Đóng thông báo</Button>
        </div>
      </div>
    </>}
  </Modal>
}
