import { cn } from '../../../lib/cn';
import Logo from '../../common/Logo';
import { CloseIcon, SidebarExpandedIcon, ThreeDots } from './sidebar-icons';
import NavItem from './nav-item';
import type { NavSection } from './nav-types';

interface SidebarProps {
  sections: NavSection[];
  activeKey: string;
  onSelect: (key: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isMobileSheet?: boolean;
}

// NextAdmin sidebar: logo + collapse toggle, sectioned navigation.
export default function Sidebar({
  sections,
  activeKey,
  onSelect,
  isSidebarOpen,
  toggleSidebar,
  isMobileSheet = false,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className={cn(
          'flex items-center px-4 pt-7 text-text-primary',
          isSidebarOpen ? 'justify-between' : 'flex-col justify-center gap-4',
        )}
      >
        <Logo />
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            'p-1.5 transition-colors',
            isMobileSheet
              ? 'rounded-lg text-icon-tertiary hover:bg-background-gray-primary hover:text-text-primary'
              : 'text-icon-tertiary hover:text-text-secondary',
          )}
          aria-label={isMobileSheet ? 'Đóng menu' : 'Thu gọn menu'}
        >
          {isMobileSheet ? <CloseIcon /> : <SidebarExpandedIcon />}
        </button>
      </div>

      <nav className={cn('scrollbar-thin flex-1 overflow-y-auto', isSidebarOpen ? 'mt-7 space-y-6 px-4' : 'mt-5 px-2')}>
        {sections.map((section) => (
          <div key={section.label}>
            {isSidebarOpen ? (
              <p className="mt-6 mb-4 text-xs text-text-tertiary uppercase">{section.label}</p>
            ) : (
              <span className="flex items-center justify-center pt-6 pb-4 text-icon-secondary">
                <ThreeDots />
              </span>
            )}
            <div className={cn('space-y-1', !isSidebarOpen && 'space-y-1.5')}>
              {section.items.map((item) => (
                <NavItem
                  key={item.key}
                  item={item}
                  active={item.key === activeKey}
                  collapsed={!isSidebarOpen}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
