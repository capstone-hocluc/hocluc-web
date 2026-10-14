import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, X } from '../console/icons'
import Logo from '../common/Logo'
import ThemeToggle from '../ui/ThemeToggle'

interface AuthShellProps {
  children: ReactNode
  onBack: () => void
  backLabel?: string
  /** Extra classes kept on <main> so legacy state selectors (is-verification) still match. */
  className?: string
  showThemeToggle?: boolean
  /** `dialog` floats the card over the current page as a modal; `page` fills the screen. */
  variant?: 'page' | 'dialog'
}

const CARD =
  'relative z-[1] w-full max-w-[480px] overflow-hidden rounded-[24px] border border-border-primary bg-white shadow-[0_24px_64px_-36px_rgba(0,125,181,.42)]'

/** Shared light-brand page frame for learner login and management login. */
function AuthShell({
  children,
  onBack,
  backLabel = 'Về trang chủ',
  className = '',
  showThemeToggle = false,
  variant = 'page',
}: AuthShellProps) {
  const body = (
    <section className="flex min-w-0 flex-col px-5 py-6 sm:px-9 sm:py-8">
      <div className="mb-4 flex justify-center">
        <Logo size={34} />
      </div>
      <div className="m-auto w-full max-w-[410px]">{children}</div>
    </section>
  )

  if (variant === 'dialog') {
    return (
      <Dialog.Root open onOpenChange={(next) => !next && onBack()}>
        <Dialog.Portal>
          <Dialog.Overlay className="hl-auth-dialog-overlay hl-auth-page fixed inset-0 z-80 grid place-items-center overflow-y-auto p-2 sm:p-5">
            <Dialog.Content
              aria-describedby={undefined}
              className={`${CARD} max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-h-[calc(100dvh-2.5rem)] ${className}`}
            >
              <Dialog.Title className="sr-only">Tài khoản HocLuc</Dialog.Title>
              <Dialog.Close
                aria-label="Đóng"
                className="absolute right-3 top-3 z-10 grid size-9 cursor-pointer place-items-center rounded-full text-text-muted transition-colors hover:bg-brand-soft-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X size={18} aria-hidden="true" />
              </Dialog.Close>
              {body}
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <main
      className={`hl-auth-page relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-gradient-to-br from-brand-soft-bg via-white to-brand-soft/60 px-4 pb-6 pt-16 sm:px-6 ${className}`}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Quay lại trang chủ"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold text-primary-text transition-colors hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:left-6"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </button>
      {showThemeToggle && (
        <ThemeToggle className="absolute right-4 top-4 border border-border-primary bg-white/90 text-primary-text sm:right-6" />
      )}
      <div className={CARD}>{body}</div>
    </main>
  )
}

export default AuthShell
