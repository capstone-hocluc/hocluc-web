import { useState } from 'react';
import { useActiveRole } from '../../../hooks/useActiveRole';
import { useTheme } from '../../common/useTheme';
import type { UserRole } from '../../../services/userService';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { Check } from '../icons';
import ConfirmDialog from '../confirm-dialog';
import Status from '../status';
import { ROLE_LABELS } from '../../../lib/role-home';
import { Avatar, AvatarFallback, AvatarImage } from '../../tailgrids/core/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSection,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../tailgrids/core/dropdown';
import { getDisplayName, getInitials } from '../profile-utils';
import { AltArrowDownIcon } from './sidebar-icons';
import { LogoutIcon, MoonIcon, SunIcon, UserCircleIcon } from './header-icons';

interface UserProfileButtonProps {
  onOpenProfile: () => void;
  onLogout: () => void;
  logoutLoading?: boolean;
}

// NextAdmin header profile dropdown. Order: who you are, your profile, switching role (only with
// several roles), theme, and Đăng xuất last.
export function UserProfileButton({ onOpenProfile, onLogout, logoutLoading = false }: UserProfileButtonProps) {
  const { profile } = useCurrentUser();
  const { roles, activeRole, switchRole, switching, error } = useActiveRole();
  const { theme, toggleTheme } = useTheme();
  // The menu closes as soon as an item fires, so the confirmation lives outside it.
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  if (!profile) return null;

  const name = getDisplayName(profile);
  const initials = getInitials(profile);

  return (
    <div className="relative">
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2.5 rounded-lg border-0 p-0 transition-all outline-none focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 focus-visible:ring-offset-1">
        <Avatar>
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={name} className="size-10 rounded-lg" />}
          <AvatarFallback className="rounded-lg border border-border-secondary-alt bg-background-gray-secondary_alt">
            {initials}
          </AvatarFallback>
        </Avatar>

        <span className="flex min-w-0 flex-col text-left">
          <span className="max-w-40 truncate text-sm leading-5 font-medium text-text-primary">{name}</span>
          <span className="text-xs text-text-tertiary">{switching ? 'Đang chuyển vai trò...' : `Đang dùng: ${ROLE_LABELS[profile.role]}`}</span>
        </span>

        <AltArrowDownIcon className="text-icon-tertiary transition-transform duration-200 group-aria-expanded:-rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent placement="bottom end" className="w-70 overflow-hidden p-0 shadow-3xl">
        <DropdownMenuHeader className="flex w-full items-center justify-start gap-2 border-b border-border-secondary-alt px-4 py-3">
          <Avatar size="md">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={name} />}
            <AvatarFallback className="border border-border-secondary-alt bg-background-gray-secondary_alt">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-text-primary">{name}</span>
            <span className="truncate text-xs text-gray-500">{profile.email}</span>
            <span className="mt-1.5 self-start">
              <Status tone="info">{ROLE_LABELS[profile.role]}</Status>
            </span>
          </span>
        </DropdownMenuHeader>

        <DropdownMenuSection className="p-1.5">
          <DropdownMenuItem className="cursor-pointer px-3 py-2.5" onAction={onOpenProfile}>
            <span className="shrink-0 text-icon-secondary group-hover:text-text-primary">
              <UserCircleIcon />
            </span>
            <span className="leading-5 font-medium">Hồ sơ cá nhân</span>
          </DropdownMenuItem>
        </DropdownMenuSection>

        {roles.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuHeader className="px-4 pt-3 pb-1 text-xs text-text-tertiary">Chuyển vai trò</DropdownMenuHeader>
            <DropdownMenuSection className="p-1.5" items={roles.map((role) => ({ id: role, label: ROLE_LABELS[role] }))}>
              {(item) => (
                <DropdownMenuItem id={item.id} textValue={item.label}
                  className="cursor-pointer px-3 py-2.5"
                  isDisabled={switching || item.id === activeRole}
                  onAction={() => setPendingRole(item.id)}>
                  <span className="flex-1 leading-5 font-medium">{item.label}</span>
                  {item.id === activeRole && <Check size={16} aria-label="Đang dùng" className="text-brand-500" />}
                </DropdownMenuItem>
              )}
            </DropdownMenuSection>
          </>
        )}

        {switching && <DropdownMenuHeader role="status" className="px-4 py-2 text-xs text-text-tertiary">Đang chuyển vai trò...</DropdownMenuHeader>}
        <DropdownMenuSeparator />

        <DropdownMenuSection className="p-1.5">
          <DropdownMenuItem className="cursor-pointer px-3 py-2.5" onAction={toggleTheme}>
            <span className="shrink-0 text-icon-secondary group-hover:text-text-primary">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </span>
            <span className="leading-5 font-medium">{theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}</span>
          </DropdownMenuItem>
        </DropdownMenuSection>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onAction={onLogout}
          isDisabled={logoutLoading || switching}
          className="m-1.5 w-auto cursor-pointer px-3 py-2.5"
        >
          <span className="text-icon-secondary group-hover:text-text-primary">
            <LogoutIcon />
          </span>
          <span className="leading-5">{logoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {pendingRole && (
      <ConfirmDialog
        title="Chuyển vai trò?"
        description={`Chuyển sang ${ROLE_LABELS[pendingRole]} sẽ kết thúc các phiên đăng nhập khác của tài khoản này.`}
        cancelLabel="Ở lại"
        confirmLabel="Chuyển vai trò"
        onCancel={() => setPendingRole(null)}
        onConfirm={() => {
          switchRole(pendingRole);
          setPendingRole(null);
        }}
      />
    )}
    {error && <p role="alert" className="absolute top-full right-0 mt-2 w-70 rounded-lg border border-card-border bg-card-background p-3 text-xs text-red-500">{error}</p>}
    </div>
  );
}
