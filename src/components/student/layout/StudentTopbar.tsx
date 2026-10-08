import { Bell, Flame, LogOut, Menu, Settings, User, UserRound } from 'lucide-react'
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
  'relative grid size-12 flex-none cursor-pointer place-items-center rounded-[15px] bg-surface text-primary shadow-[0_10px_22px_rgba(17,24,58,0.04)] max-[760px]:size-11'

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
    <header className="sticky top-0 z-60 col-span-full row-start-1 flex min-h-16 items-center justify-between gap-[18px] border-b border-line-shell bg-surface/95 px-7 py-3 shadow-[0_10px_28px_rgba(17,24,58,0.05)] backdrop-blur-md backdrop-saturate-[180%] max-[760px]:flex-wrap max-[760px]:gap-2.5 max-[760px]:px-3.5 max-[760px]:py-2.5">
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

      <div className="flex min-w-0 flex-1 items-center justify-end gap-3.5 max-[760px]:w-full max-[760px]:flex-[1_1_100%] max-[760px]:gap-2">
        <button
          type="button"
          aria-label={`Chuỗi ${streak} ngày`}
          onClick={() => onNotify?.(`Bạn đang giữ chuỗi học tập ${streak} ngày.`)}
          className="inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-full bg-streak-soft px-[18px] text-streak max-[760px]:size-11 max-[760px]:justify-center max-[760px]:p-0"
        >
          <Flame size={17} />
          <strong className="text-sm whitespace-nowrap max-[760px]:hidden">Khám phá streak</strong>
        </button>

        <RoleSwitcher className="h-[42px] rounded-full max-[760px]:h-11" />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Thông báo"
              className={cn(
                iconButton,
                'size-[42px] rounded-full bg-surface-sky text-text-heading shadow-none max-[760px]:size-11'
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
              className={cn(iconButton, 'overflow-hidden border border-line-blue p-0')}
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
          <DropdownMenuContent>
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
