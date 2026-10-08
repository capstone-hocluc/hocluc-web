import { useState, type ComponentType, type ReactNode } from 'react'
import { ChevronRight, LogOut, Menu } from 'lucide-react'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { getUserDisplayName, getUserInitials } from '../../lib/userDisplay'
import Logo from '../common/Logo'
import Button from '../ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu'
import NavItem, { SidebarGroupLabel } from '../ui/NavItem'
import RoleSwitcher from '../ui/RoleSwitcher'
import Sidebar from '../ui/Sidebar'
import ThemeToggle from '../ui/ThemeToggle'

export interface RoleShellNavItem {
  key: string
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}

export interface RoleShellNavGroup {
  label?: string
  items: RoleShellNavItem[]
}

export interface RoleShellAccountItem {
  label: string
  icon: ComponentType<{ size?: number }>
  onSelect: () => void
}

interface RoleShellProps {
  /** Role name shown under the avatar and in the sidebar. */
  roleLabel: string
  /** Section name used as the first breadcrumb segment (e.g. "Vận hành"). */
  areaLabel: string
  /** Current page title, last breadcrumb segment. */
  pageTitle: string
  navGroups: RoleShellNavGroup[]
  activeKey: string
  onNavigate: (key: string) => void
  onLogout: () => void
  logoutLoading?: boolean
  /** Extra account-menu entries shown above "Đăng xuất" (e.g. profile). */
  accountItems?: RoleShellAccountItem[]
  children: ReactNode
}

// The one frame every staff-side role (admin, manager, staff, mentor, teacher)
// renders inside: sidebar, header (breadcrumb, role switcher, theme toggle,
// account menu) and the padded page area. Pages never draw their own chrome.
function RoleShell({
  roleLabel,
  areaLabel,
  pageTitle,
  navGroups,
  activeKey,
  onNavigate,
  onLogout,
  logoutLoading = false,
  accountItems = [],
  children,
}: RoleShellProps) {
  const { profile } = useCurrentUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const displayName = getUserDisplayName(profile) || roleLabel
  const initials = getUserInitials(profile) || roleLabel.slice(0, 2).toUpperCase()

  return (
    <main className="flex min-h-screen bg-surface-soft text-text-heading">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        brand={<Logo />}
        roleLabel={roleLabel}
        footer={
          <Button
            variant="primary"
            appearance="ghost"
            size="sm"
            className="w-full justify-start px-3 text-text-muted"
            onClick={onLogout}
            disabled={logoutLoading}
          >
            <LogOut size={16} />
            {logoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </Button>
        }
      >
        {navGroups.map((group, index) => (
          <div key={group.label ?? index} className="flex flex-col gap-1">
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            {group.items.map(({ key, label, icon }) => (
              <NavItem
                key={key}
                icon={icon}
                label={label}
                active={activeKey === key}
                onClick={() => {
                  setSidebarOpen(false)
                  onNavigate(key)
                }}
              />
            ))}
          </div>
        ))}
      </Sidebar>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border-subtle bg-surface px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-hover lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden items-center gap-2 text-sm text-text-muted sm:flex">
            <span>{areaLabel}</span>
            <ChevronRight size={15} />
            <strong className="font-semibold text-text-heading">{pageTitle}</strong>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <RoleSwitcher />
            <ThemeToggle className="size-9 rounded-lg border border-border-subtle bg-surface text-text-muted hover:bg-surface-hover" />
            <span className="hidden text-right sm:block">
              <strong className="block text-sm font-semibold text-text-heading">{displayName}</strong>
              <small className="block text-xs text-text-muted">{roleLabel}</small>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="grid size-9 cursor-pointer place-items-center rounded-full bg-badge-info-bg text-sm font-semibold text-badge-info-text outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  aria-label="Mở menu tài khoản"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="px-[11px] py-1.5">
                  <strong className="block truncate text-sm text-text-heading">{displayName}</strong>
                  <small className="block truncate text-xs text-text-muted">
                    {profile?.email ?? roleLabel}
                  </small>
                </div>
                {accountItems.map(({ label, icon: Icon, onSelect }) => (
                  <DropdownMenuItem key={label} onSelect={onSelect}>
                    <Icon size={16} />
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem disabled={logoutLoading} onSelect={onLogout}>
                  <LogOut size={16} />
                  {logoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </section>
    </main>
  )
}

export default RoleShell
