import { useActiveRole } from '../../../hooks/useActiveRole';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
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
import { LogoutIcon, UserCircleIcon } from './header-icons';

interface UserProfileButtonProps {
  onOpenProfile: () => void;
  onLogout: () => void;
  logoutLoading?: boolean;
}

// NextAdmin header profile dropdown; role switching lives here too.
export function UserProfileButton({ onOpenProfile, onLogout, logoutLoading = false }: UserProfileButtonProps) {
  const { profile } = useCurrentUser();
  const { roles, activeRole, switchRole, switching, error } = useActiveRole();
  if (!profile) return null;

  const name = getDisplayName(profile);
  const initials = getInitials(profile);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2.5 rounded-lg border-0 p-0 transition-all outline-none focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 focus-visible:ring-offset-1">
        <Avatar>
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={name} className="size-10 rounded-lg" />}
          <AvatarFallback className="rounded-lg border border-border-secondary-alt bg-background-gray-secondary_alt">
            {initials}
          </AvatarFallback>
        </Avatar>

        <span className="text-sm leading-5 font-medium text-text-primary">{name}</span>

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
            <DropdownMenuSection className="p-1.5">
              <span className="block px-3 pt-1.5 pb-1 text-xs text-text-tertiary uppercase">Đổi vai trò</span>
              {roles.map((role) => (
                <DropdownMenuItem
                  key={role}
                  className="cursor-pointer px-3 py-2.5"
                  isDisabled={switching}
                  onAction={() => void switchRole(role)}
                >
                  <span className="flex-1 leading-5 font-medium">{ROLE_LABELS[role]}</span>
                  {role === activeRole && <span className="size-2 rounded-full bg-brand-500" aria-label="Đang dùng" />}
                </DropdownMenuItem>
              ))}
              {error && (
                <p role="alert" className="px-3 py-2 text-xs text-red-500">
                  {error}
                </p>
              )}
            </DropdownMenuSection>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onAction={onLogout}
          isDisabled={logoutLoading}
          className="m-1.5 w-auto cursor-pointer px-3 py-2.5"
        >
          <span className="text-icon-secondary group-hover:text-text-primary">
            <LogoutIcon />
          </span>
          <span className="leading-5">{logoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
