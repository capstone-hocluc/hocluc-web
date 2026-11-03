import { useEffect, useLayoutEffect, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import Logo from '../common/Logo'
import Button from '../console/button'
import { ArrowLeft } from '../console/icons'
import ThemeToggle from '../console/layout/theme-toggle'

interface AuthShellProps {
  children: ReactNode
  onBack: () => void
  backLabel?: string
  className?: string
}

// The console kit only wears the Học Lực palette while <html data-console> is set, and the sign-in
// page renders outside ConsoleShell, so it raises the flag itself. The layout effect avoids a first
// paint in the kit's default colours; the passive one re-asserts it after the previous console
// screen's own cleanup (signing out lands here in the same commit and would otherwise clear it).
function useConsolePalette() {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.console = ''
    return () => {
      delete root.dataset.console
    }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.console = ''
  }, [])
}

/** Management sign-in page: console surface, a way back to the public site and the theme switch. */
export default function AuthShell({
  children,
  onBack,
  backLabel = 'Quay lại trang chủ',
  className,
}: AuthShellProps) {
  useConsolePalette()

  return (
    <div className="dashboard-layout console-layout flex min-h-dvh flex-col bg-card-background font-sans text-text-primary sm:bg-background-gray-secondary_alt_2">
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Button
          appearance="ghost"
          size="lg"
          onClick={onBack}
          className="-ml-4 text-text-secondary hover:bg-background-gray-secondary hover:text-text-primary"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {backLabel}
        </Button>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 justify-center px-4 pt-4 pb-10 sm:pt-[min(6vh,3.5rem)]">
        <div
          data-auth-card
          className={cn(
            'h-fit w-full max-w-104 sm:rounded-xl sm:border sm:border-card-border sm:bg-card-background sm:p-8 sm:shadow-xs',
            className
          )}
        >
          <div className="mb-6 flex justify-center">
            <Logo wordmarkSize={26} />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
