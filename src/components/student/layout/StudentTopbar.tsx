import { Bell, Flame, LogOut, Menu, Settings, User, UserRound } from '../../console/icons'
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
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/Popover'
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
  notificationCount?: number
  onToggleSidebar?: () => void
  onNavigateHome?: () => void
  onNavigateLearningProfile?: () => void
  onNavigateProfile?: () => void
  onLogout?: () => void
  logoutLoading?: boolean
  onNotify?: (message: string) => void
}

const iconButton =
  'relative grid size-11 flex-none cursor-pointer place-items-center rounded-2xl border-2 border-line bg-surface text-primary-text transition active:translate-y-0.5 active:shadow-none focus-visible:outline-3 focus-visible:outline-offset-2'

function StudentTopbar({
  profile,
  profileLoading = false,
  streak = 0,
  notificationCount = 0,
  onToggleSidebar,
  onNavigateHome,
  onNavigateLearningProfile,
  onNavigateProfile,
  onLogout,
  logoutLoading = false,
  onNotify,
}: StudentTopbarProps) {
  return (
    <header className="sticky top-0 z-60 col-span-full row-start-1 flex min-h-[72px] items-center justify-between gap-[18px] border-b border-line-shell bg-surface/92 px-7 py-3 backdrop-blur-md backdrop-saturate-[180%] max-[760px]:flex-wrap max-[760px]:gap-2.5 max-[760px]:px-3.5 max-[760px]:py-2.5">
      <div className="flex min-w-0 flex-none items-center gap-3 max-[760px]:flex-[1_0_auto]">
        <button
          type="button"
          className={iconButton}
          aria-label="Thu gọn thanh điều hướng"
          onClick={onToggleSidebar}
        >
          <Menu size={20} />
        </button>
        <button
          type="button"
          aria-label="HocLuc.com"
          onClick={onNavigateHome}
          className="cursor-pointer p-0 max-[560px]:[&>span>span]:hidden! max-[560px]:[&_img]:mt-0! max-[560px]:[&_img]:size-[42px]!"
        >
          <Logo size={46} />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-3.5 max-[760px]:gap-2">
        <button
          type="button"
          aria-label={`Chuỗi ${streak} ngày`}
          onClick={() => onNotify?.(`Bạn đang giữ chuỗi học tập ${streak} ngày.`)}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-2xl border-2 border-[#ffd9a3] bg-streak-soft px-[18px] text-streak transition active:translate-y-0.5 active:shadow-none max-[760px]:size-11 max-[760px]:justify-center max-[760px]:p-0"
        >
          <Flame size={17} />
          <strong className="text-sm whitespace-nowrap max-[760px]:hidden">Khám phá streak</strong>
        </button>

        <RoleSwitcher className="h-11 rounded-2xl" />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Thông báo"
              className={cn(
                iconButton,
                'text-text-heading'
              )}
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-[3px] grid h-5 min-w-5 place-items-center rounded-full border-2 border-surface bg-danger px-[5px] text-[10px] leading-none font-black text-surface">
                  {notificationCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent>
            <strong className="block text-sm text-text-heading">Thông báo</strong>
            <p className="mt-[7px] text-[13px] leading-normal text-text-body">
              Chưa có thông báo mới.
            </p>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Mở menu hồ sơ"
              className={cn(iconButton, 'overflow-hidden p-0')}
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
                  <strong className="truncate text-[13px] text-text-heading">{getUserDisplayName(profile)}</strong>
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
