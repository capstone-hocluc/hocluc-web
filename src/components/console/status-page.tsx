import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import Button from './button'
import { AlertTriangle, ArrowLeft, LockKeyhole, RefreshCw, Settings } from './icons'
import type { LucideIcon } from './icons'

type Tone = 'info' | 'warning' | 'danger'

// Disc and code colour per tone; the ring around them is NextAdmin's error-page frame.
const TONES: Record<Tone, { disc: string; code: string }> = {
  info: { disc: 'bg-badge-blue-background text-badge-blue-icon-color', code: 'text-badge-blue-text' },
  warning: { disc: 'bg-badge-orange-background text-badge-orange-icon-color', code: 'text-badge-orange-text' },
  danger: { disc: 'bg-badge-error-background text-badge-error-icon-color', code: 'text-badge-error-text' },
}

interface StatusPageProps {
  tone: Tone
  icon: LucideIcon
  /** Big figure inside the ring (an HTTP status); the icon disc shows when there is none. */
  code?: string
  title: string
  description: string
  actions: ReactNode
}

/** Full-screen state in the NextAdmin error-page layout, for errors that replace the whole console. */
export default function StatusPage({ tone, icon: Icon, code, title, description, actions }: StatusPageProps) {
  const palette = TONES[tone]
  return (
    <main className="grid min-h-screen place-items-center bg-card-background px-5 py-10">
      <div className="flex w-full max-w-125 flex-col items-center">
        <div className="flex h-62.5 w-full items-center justify-center rounded-[746px] border border-border-secondary/20">
          {code ? (
            <span className={cn('text-7xl leading-none font-semibold tracking-tight', palette.code)}>{code}</span>
          ) : (
            <span className={cn('grid size-20 place-items-center rounded-full', palette.disc)}>
              <Icon size={36} aria-hidden />
            </span>
          )}
        </div>
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl leading-10 font-semibold text-text-primary">{title}</h1>
          <p className="max-w-md text-sm leading-5 text-text-tertiary">{description}</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      </div>
    </main>
  )
}

/** A console URL that matches no screen at all. */
export function NotFoundStatusPage({ onHome }: { onHome: () => void }) {
  return (
    <StatusPage
      tone="info"
      icon={AlertTriangle}
      code="404"
      title="Không tìm thấy trang"
      description="Đường dẫn này không tồn tại hoặc đã được chuyển đi."
      actions={
        <Button onClick={onHome}>
          <ArrowLeft size={18} aria-hidden />
          Về trang đăng nhập
        </Button>
      }
    />
  )
}

/** Session or profile could not be checked, normally a dropped connection. */
export function AuthErrorStatusPage({ onRetry }: { onRetry: () => void }) {
  return (
    <StatusPage
      tone="warning"
      icon={LockKeyhole}
      title="Chưa xác thực được tài khoản"
      description="Kiểm tra kết nối mạng rồi thử lại."
      actions={
        <Button onClick={onRetry}>
          <RefreshCw size={18} aria-hidden />
          Thử lại
        </Button>
      }
    />
  )
}

/** The API answered 502/503/504: the server is being updated or is down. */
export function MaintenanceStatusPage({ onRetry }: { onRetry: () => void }) {
  return (
    <StatusPage
      tone="warning"
      icon={Settings}
      title="Hệ thống đang bảo trì"
      description="Máy chủ tạm thời chưa phản hồi. Vui lòng quay lại sau ít phút."
      actions={
        <Button onClick={onRetry}>
          <RefreshCw size={18} aria-hidden />
          Thử lại
        </Button>
      }
    />
  )
}

/** The signed-in account has no role allowed in this part of the console. */
export function NoAccessStatusPage({ onExit }: { onExit: () => void }) {
  return (
    <StatusPage
      tone="danger"
      icon={LockKeyhole}
      code="403"
      title="Bạn không có quyền truy cập"
      description="Tài khoản hiện tại không được phép mở khu vực quản lý này."
      actions={
        <Button variant="danger" onClick={onExit}>
          Đăng xuất
        </Button>
      }
    />
  )
}
