import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import ThemeProvider from '../common/ThemeProvider'
import { SheetContent, SheetOverlay, SheetTitle } from '../tailgrids/core/sheet'
import Header from './layout/header'
import type { NavSection } from './layout/nav-types'
import Sidebar from './layout/sidebar'

interface ConsoleShellProps {
  sections: NavSection[]
  activeKey: string
  onNavigate: (key: string) => void
  onOpenProfile: () => void
  onLogout: () => void
  logoutLoading?: boolean
  children: ReactNode
}

// The one layout every non-student role renders in: NextAdmin's collapsible
// sidebar (sheet on mobile), header and rounded content card.
function ConsoleShell({
  sections,
  activeKey,
  onNavigate,
  onOpenProfile,
  onLogout,
  logoutLoading,
  children,
}: ConsoleShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)

  // Flag on <html> so overlays rendered in portals also get the console border colours.
  useEffect(() => {
    document.documentElement.dataset.console = ''
    return () => {
      delete document.documentElement.dataset.console
    }
  }, [])

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-background-gray-secondary_alt_2 font-sans xl:h-screen xl:overflow-hidden">
        <aside
          style={{
            width: isSidebarOpen ? '270px' : '72px',
            minWidth: isSidebarOpen ? '270px' : '72px',
            transition: 'width 300ms cubic-bezier(0.4,0,0.2,1), min-width 300ms cubic-bezier(0.4,0,0.2,1)',
          }}
          className="hidden shrink-0 overflow-hidden xl:block"
        >
          <Sidebar
            sections={sections}
            activeKey={activeKey}
            onSelect={onNavigate}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
        </aside>

        <SheetOverlay isOpen={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-67.5! max-w-67.5! border-r border-card-border bg-card-surface-area p-0"
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Sidebar
              sections={sections}
              activeKey={activeKey}
              onSelect={(key) => {
                setIsMobileSheetOpen(false)
                onNavigate(key)
              }}
              isSidebarOpen
              toggleSidebar={() => setIsMobileSheetOpen(false)}
              isMobileSheet
            />
          </SheetContent>
        </SheetOverlay>

        <div className={cn('min-w-0 flex-1', isSidebarOpen ? 'lg:p-4 xl:pr-4' : 'lg:py-4 xl:px-4')}>
          <div className="flex h-full min-h-screen flex-col overflow-hidden border-[0.5px] border-card-surface-border bg-card-surface-area lg:min-h-0 lg:rounded-2xl lg:shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),0_1px_1px_0_rgba(0,0,0,0.04)]">
            <Header
              onMenuClick={() => setIsMobileSheetOpen(true)}
              sections={sections}
              onNavigate={onNavigate}
              onOpenProfile={onOpenProfile}
              onLogout={onLogout}
              logoutLoading={logoutLoading}
            />
            <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-384 flex-col gap-5 p-4 pb-5 sm:p-6 lg:p-8">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default ConsoleShell
