import { useState } from 'react';
import { cn } from '../../../lib/cn';
import Logo from '../../common/Logo';
import { MenuIcon } from './header-icons';
import { ThreeDots } from './sidebar-icons';
import { NotificationsButton } from './notifications';
import SearchBar from './searchbar';
import ThemeToggle from './theme-toggle';
import { UserProfileButton } from './user-profile';
import type { NavSection } from './nav-types';

interface HeaderProps {
  onMenuClick: () => void;
  sections: NavSection[];
  onNavigate: (key: string) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  logoutLoading?: boolean;
}

// NextAdmin header: mobile (< xl) menu | logo | dots drawer, desktop search + actions.
export default function Header({
  onMenuClick,
  sections,
  onNavigate,
  onOpenProfile,
  onLogout,
  logoutLoading,
}: HeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const profile = (
    <UserProfileButton onOpenProfile={onOpenProfile} onLogout={onLogout} logoutLoading={logoutLoading} />
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b-[0.5px] border-card-border bg-card-surface-area px-2 py-4 lg:px-5">
        <div className="flex items-center xl:hidden">
          <div className="flex flex-1 justify-start">
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Mở menu"
              className="rounded-md px-1.5 py-1 text-icon-tertiary transition-colors hover:text-text-primary"
            >
              <MenuIcon />
            </button>
          </div>
          <div className="flex items-center justify-center">
            <Logo />
          </div>
          <div className="flex flex-1 justify-end">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              aria-label="Mở truy cập nhanh"
              className={cn(
                'rounded-md px-1.5 py-3 transition-colors',
                isDrawerOpen
                  ? 'bg-background-gray-secondary text-text-primary'
                  : 'text-icon-tertiary hover:text-text-primary',
              )}
            >
              <ThreeDots />
            </button>
          </div>
        </div>

        <div className="hidden items-center justify-between xl:flex">
          <div className="max-w-xs flex-1">
            <SearchBar sections={sections} onSelect={onNavigate} />
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <NotificationsButton />
            {profile}
          </div>
        </div>
      </header>

      <div className={cn('xl:hidden', isDrawerOpen ? 'block' : 'hidden')}>
        <div className="px-5 py-4 shadow-xs">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <NotificationsButton />
              <ThemeToggle />
              <SearchBar sections={sections} onSelect={onNavigate} />
            </div>
            {profile}
          </div>
        </div>
      </div>
    </>
  );
}
