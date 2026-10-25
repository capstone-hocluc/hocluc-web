import { Flame, LogOut, Menu, Settings, User, UserRound } from '../../console/icons'
import Logo from '../../common/Logo'
import Avatar from '../../ui/Avatar'
import RoleSwitcher from '../../ui/RoleSwitcher'
import Skeleton from '../../ui/Skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu'
import NotificationBell from '../../notifications/NotificationBell'
import type { UserProfile } from '../../../services/userService'
import { getUserDisplayName, getUserInitials } from '../../../lib/userDisplay'
import { ROLE_LABELS } from '../../../lib/role-home'
import { cn } from '../../../lib/cn'

interface StudentTopbarProps {
  /** Signed-in user from useCurrentUser(); null until it has loaded. */
  profile: UserProfile | null
  profileLoading?: boolean
  /** Consecutive learning days (mock until the backend has a streak endpoint). */
  streak?: number
  onToggleSidebar?: () => void
  sidebarCollapsed?: boolean
  onOpenNavigation?: () => void
  mobileNavigationOpen?: boolean
  onNavigateHome?: () => void
  onNavigateLearningProfile?: () => void
  onNavigateProfile?: () => void
  onLogout?: () => void
  logoutLoading?: boolean
  onNotify?: (message: string) => void
}

const iconButton =
  'relative grid size-11 flex-none cursor-pointer place-items-center rounded-xl border border-line bg-surface text-text-body transition-colors hover:border-line-brand hover:bg-surface-hover active:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2'

function StudentTopbar({
  profile,
  profileLoading = false,
  streak = 0,
  onToggleSidebar,
  sidebarCollapsed = false,
  onOpenNavigation,
  mobileNavigationOpen = false,
  onNavigateHome,
  onNavigateLearningProfile,
  onNavigateProfile,
  onLogout,
  logoutLoading = false,
  onNotify,
}: StudentTopbarProps) {
  return (
    <header className="student-topbar sticky top-0 z-50 col-span-full row-start-1 flex min-h-[72px] items-center justify-between gap-4 bg-surface px-6 py-3 max-[760px]:gap-2 max-[760px]:px-4 max-[560px]:flex-wrap">
      <div className="flex min-w-0 flex-none items-center gap-3 max-[760px]:flex-[1_0_auto]">
        <button
          type="button"
          className={cn(iconButton, 'hidden border-transparent hover:border-transparent max-[760px]:grid')}
          aria-label="Mở menu học tập"
          aria-expanded={mobileNavigationOpen}
          onClick={onOpenNavigation}
        >
          <Menu size={20} />
        </button>
        <button
          type="button"
          className={cn(iconButton, 'border-transparent hover:border-transparent max-[1180px]:hidden')}
          aria-label={sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          aria-expanded={!sidebarCollapsed}
          aria-controls="student-navigation"
          onClick={onToggleSidebar}
        >
          <Menu size={20} />
        </button>
        <button
          type="button"
          aria-label="HocLuc.com"
          onClick={onNavigateHome}
          className="flex min-h-11 cursor-pointer items-center p-0"
        >
          <Logo wordmarkSize={24} />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 max-[760px]:gap-2">
        <button
          type="button"
          aria-label={`Chuỗi ${streak} ngày`}
          onClick={() => onNotify?.(`Bạn đang giữ chuỗi học tập ${streak} ngày.`)}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 text-streak transition-colors hover:bg-streak-soft focus-visible:outline-2 focus-visible:outline-offset-2 max-[560px]:hidden"
        >
          <Flame size={17} />
          <strong className="text-sm font-semibold whitespace-nowrap">{streak} ngày học</strong>
        </button>

        <RoleSwitcher className="h-11 rounded-xl" />

        <NotificationBell variant="student" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Mở menu hồ sơ"
              className={cn(iconButton, 'overflow-hidden rounded-full p-0')}
            >
              {profileLoading ? (
                <Skeleton className="size-full rounded-none" />
              ) : (
                <Avatar
                  src={profile?.avatarUrl}
                  alt={getUserDisplayName(profile)}
                  fallback={getUserInitials(profile) || <User size={18} />}
                  className="size-full rounded-none"
                />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[250px]">
            {profile && (
              <div className="flex items-center gap-3 border-b border-line-blue px-[11px] pt-1 pb-3">
                <Avatar
                  src={profile.avatarUrl}
                  alt=""
                  fallback={getUserInitials(profile) || <User size={18} />}
                />
                <span className="flex min-w-0 flex-col">
                  <strong className="truncate text-[13px] text-text-heading">
                    {getUserDisplayName(profile)}
                  </strong>
                  <span className="truncate text-xs text-text-muted">{profile.email}</span>
                  <span className="mt-1.5 self-start rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-text">
                    {ROLE_LABELS[profile.role]}
                  </span>
                </span>
              </div>
            )}
            <DropdownMenuItem onSelect={() => onNavigateProfile?.()}>
              <UserRound size={16} />
              Hồ sơ cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onNavigateLearningProfile?.()}>
              <User size={16} />
              Hồ sơ học tập
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onNotify?.('Tính năng Cài đặt đang được phát triển.')}
            >
              <Settings size={16} />
              Cài đặt
            </DropdownMenuItem>
            <div role="separator" className="my-1 h-px bg-line-blue" />
            <DropdownMenuItem disabled={logoutLoading} onSelect={() => onLogout?.()}>
              <LogOut size={16} />
              {logoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default StudentTopbar
