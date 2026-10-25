import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import ScrollArea from '../ui/ScrollArea'
import ThemeProvider from '../common/ThemeProvider'
import { ConsoleFocusContext } from './console-focus'
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
  // A workspace screen asks for the whole window; the sidebar and header leave while it is open.
  const [focused, setFocused] = useState(false)
  const focus = useMemo(() => ({ focused, setFocused }), [focused])

  // Flag on <html> so overlays rendered in portals also get the console border colours.
  useEffect(() => {
    document.documentElement.dataset.console = ''
    return () => {
      delete document.documentElement.dataset.console
    }
  }, [])

  return (
    <ThemeProvider>
      <ConsoleFocusContext.Provider value={focus}>
      <div className={cn('dashboard-layout console-layout flex min-h-screen bg-background-gray-secondary_alt_2 font-sans xl:h-screen xl:overflow-hidden', focused && 'h-dvh overflow-hidden')}>
        {!focused && <aside
          style={{
            width: isSidebarOpen ? '270px' : '72px',
            minWidth: isSidebarOpen ? '270px' : '72px',
            transition: 'width 300ms cubic-bezier(0.4,0,0.2,1), min-width 300ms cubic-bezier(0.4,0,0.2,1)',
          }}
          className="hidden shrink-0 overflow-hidden border-r border-card-border bg-card-background xl:block"
        >
          <Sidebar
            sections={sections}
            activeKey={activeKey}
            onSelect={onNavigate}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
        </aside>}

        {!focused && <SheetOverlay isOpen={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
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
        </SheetOverlay>}

        <div className={cn('min-w-0 flex-1', !focused && (isSidebarOpen ? 'lg:p-4 xl:pr-4' : 'lg:py-4 xl:px-4'))}>
          <div className={cn(
            'flex h-full min-h-screen flex-col overflow-hidden bg-card-surface-area',
            focused
              ? 'min-h-0'
              : 'border-[0.5px] border-card-surface-border lg:min-h-0 lg:rounded-2xl lg:shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),0_1px_1px_0_rgba(0,0,0,0.04)]',
          )}>
            {!focused && <Header
              onMenuClick={() => setIsMobileSheetOpen(true)}
              sections={sections}
              onNavigate={onNavigate}
              onOpenProfile={onOpenProfile}
              onLogout={onLogout}
              logoutLoading={logoutLoading}
            />}
            <ScrollArea as="main" className={cn('min-h-0 flex-1', focused && 'overflow-hidden')}>
              <div className={cn('mx-auto flex w-full flex-col', focused ? 'h-full' : 'max-w-384 gap-5 p-4 pb-5 sm:p-6 lg:p-8')}>{children}</div>
            </ScrollArea>
          </div>
        </div>
      </div>
      </ConsoleFocusContext.Provider>
    </ThemeProvider>
  )
}

export default ConsoleShell
