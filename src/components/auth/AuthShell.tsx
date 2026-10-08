import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import Logo from '../common/Logo'
import ThemeToggle from '../ui/ThemeToggle'

interface AuthShellProps {
  children: ReactNode
  onBack: () => void
  backLabel?: string
  /** Extra classes kept on <main> so legacy state selectors (is-verification) still match. */
  className?: string
  showThemeToggle?: boolean
}

/** Shared light-brand frame for learner login and management login. */
function AuthShell({ children, onBack, backLabel = 'Về trang chủ', className = '', showThemeToggle = false }: AuthShellProps) {
  return (
    <main
      className={`relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-gradient-to-br from-brand-soft-bg via-white to-brand-soft/60 px-4 pb-6 pt-16 sm:px-6 ${className}`}
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
      <div className="relative z-[1] grid w-full max-w-[1040px] overflow-hidden rounded-[28px] border border-border-primary bg-white shadow-[0_28px_70px_-40px_rgba(0,125,181,.4)] md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section className="flex min-w-0 flex-col px-5 py-6 sm:px-9 sm:py-8">
          <div className="mb-4 flex justify-center md:justify-start">
            <Logo size={34} />
          </div>
          <div className="m-auto w-full max-w-[410px]">{children}</div>
        </section>
        <aside
          aria-hidden="true"
          className="relative hidden items-end justify-center overflow-hidden bg-gradient-to-b from-brand-soft-bg to-brand-soft/70 md:flex"
        >
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/60" />
          <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-primary/10" />
          <img
            src="/owl-welcome-wave.png"
            alt=""
            className="relative z-[1] h-auto max-h-[88%] w-[78%] max-w-[420px] object-contain"
          />
        </aside>
      </div>
    </main>
  )
}

export default AuthShell
