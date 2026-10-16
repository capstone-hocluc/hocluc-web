import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, X } from '../console/icons'
import LandingLogo from '../landing-page/LandingLogo'
import ThemeToggle from '../ui/ThemeToggle'
import '../../styles/auth/auth-brand.css'

interface BrandAuthShellProps {
  children: ReactNode
  onBack: () => void
  className?: string
  variant?: 'page' | 'dialog'
  context?: 'learner' | 'management'
  backLabel?: string
  showThemeToggle?: boolean
  theme?: 'light' | 'dark'
}

export default function BrandAuthShell({
  children,
  onBack,
  className = '',
  variant = 'dialog',
  context = 'learner',
  backLabel = 'Về trang chủ',
  showThemeToggle = false,
  theme = 'light',
}: BrandAuthShellProps) {
  const management = context === 'management'
  const body = (
    <>
      <aside className="brand-auth-story" aria-label="Học Lực">
        <div className="brand-auth-logo">
          <LandingLogo size={30} />
        </div>
        <div className="brand-auth-story-copy">
          <h2>
            {management ? 'Vận hành rõ ràng.' : 'Mỗi ngày một chút.'}
            <br />
            <span>{management ? 'Đồng hành việc học.' : 'Tiến xa một bước.'}</span>
          </h2>
          <p>
            {management
              ? 'Kết nối đội ngũ, quản lý hoạt động và hỗ trợ hành trình học tập của học viên.'
              : 'Hiểu điều mình cần học, luyện từng chút và tự tin hơn mỗi ngày.'}
          </p>
        </div>
        <img
          className="brand-auth-art"
          src="/landing-v2/assets/hero-mai-nam-learning.webp"
          alt="Mai và Nam cùng học, trao đổi cách giải bài"
          width={1672}
          height={940}
        />
        <p className="brand-auth-story-note">
          {management
            ? 'Không gian làm việc dành cho đội ngũ Học Lực.'
            : 'Cùng bạn trên hành trình chinh phục V-ACT.'}
        </p>
      </aside>
      <section className="brand-auth-form-panel">
        <div className="brand-auth-compact-logo">
          <LandingLogo size={28} />
        </div>
        {children}
      </section>
    </>
  )

  if (variant === 'page')
    return (
      <main className="hl-brand-auth brand-auth-page" data-auth-theme={theme}>
        <header className="brand-auth-page-header">
          <button type="button" className="brand-auth-back" onClick={onBack}>
            <ArrowLeft size={18} aria-hidden="true" />
            {backLabel}
          </button>
          {showThemeToggle && <ThemeToggle className="brand-auth-theme" />}
        </header>
        <div className={`brand-auth-card ${className}`}>{body}</div>
      </main>
    )

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onBack()}>
      <Dialog.Portal>
        <Dialog.Overlay className="hl-brand-auth brand-auth-overlay">
          <Dialog.Content
            className={`brand-auth-card ${className}`}
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              const input =
                event.currentTarget instanceof HTMLElement
                  ? event.currentTarget.querySelector<HTMLInputElement>('input')
                  : null
              if (input) {
                event.preventDefault()
                input.focus({ preventScroll: true })
              }
            }}
          >
            <Dialog.Title className="brand-auth-sr-only">Tài khoản Học Lực</Dialog.Title>
            <Dialog.Close className="brand-auth-close" aria-label="Đóng">
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
            {body}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
