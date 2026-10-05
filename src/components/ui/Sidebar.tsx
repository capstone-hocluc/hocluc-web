import type { ReactNode } from 'react'
import { X, MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/cn'

// Tailwind utility classes only (no index.css rule) - one shared shell for
// every role's app sidebar, modeled after the reference CRM's
// components/common/sidebar/index.tsx (brand header, role/section label,
// scrollable nav list, pinned footer, mobile off-canvas + overlay).
interface SidebarUser {
  initials: ReactNode
  name: ReactNode
  role: ReactNode
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
  brand?: ReactNode
  roleLabel?: ReactNode
  children?: ReactNode
  user?: SidebarUser
  onUserClick?: () => void
  footer?: ReactNode
}

function Sidebar({ open, onClose, brand, roleLabel, children, user, onUserClick, footer }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          'z-30 flex w-[250px] flex-none flex-col gap-0 bg-[#f5f7fc] px-3.5 py-6 text-text-heading',
          'fixed inset-y-0 left-0 -translate-x-full shadow-[12px_0_30px_rgba(7,12,30,0.25)] transition-transform duration-200',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:shadow-none',
          open && 'translate-x-0'
        )}
      >
        <div className="relative flex items-center justify-center px-3 pb-8">
          {brand}
          <button
            type="button"
            className="absolute right-0 grid place-items-center text-text-muted lg:hidden"
            onClick={onClose}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>
        {roleLabel && (
          <span className="px-3 pb-3 text-[11px] font-bold tracking-wide text-text-subtle uppercase">
            {roleLabel}
          </span>
        )}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">{children}</nav>
        {(footer || user) && (
          <div className="mt-auto flex flex-col gap-1 border-t border-border-subtle pt-3">
            {footer}
            {user && (
              <button
                type="button"
                onClick={onUserClick}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-black/5"
              >
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-primary text-sm font-semibold text-white">
                  {user.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold">{user.name}</strong>
                  <small className="block truncate text-xs text-text-subtle">{user.role}</small>
                </span>
                <MoreHorizontal size={18} className="flex-none text-text-subtle" />
              </button>
            )}
          </div>
        )}
      </aside>
      {open && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-surface-overlay lg:hidden"
        />
      )}
    </>
  )
}

export default Sidebar
