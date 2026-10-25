import { useState } from 'react';
import { cn } from '../../../lib/cn';
import ScrollArea from '../../ui/ScrollArea';
import { ChevronDown } from '../icons';
import Logo from '../../common/Logo';
import { CloseIcon, SidebarExpandedIcon } from './sidebar-icons';
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

const COLLAPSED_GROUPS_KEY = 'hocluc.console.collapsedNavGroups';

function readCollapsedGroups(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_GROUPS_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeCollapsedGroups(groups: string[]) {
  try {
    localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(groups));
  } catch {
    // Remembering folded groups is a convenience; the menu works without it.
  }
}

// NextAdmin sidebar: logo + collapse toggle, navigation in foldable groups.
export default function Sidebar({
  sections,
  activeKey,
  onSelect,
  isSidebarOpen,
  toggleSidebar,
  isMobileSheet = false,
}: SidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState(readCollapsedGroups);
  const toggleGroup = (label: string) => {
    setCollapsedGroups((current) => {
      const next = current.includes(label) ? current.filter((item) => item !== label) : [...current, label];
      writeCollapsedGroups(next);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className={cn(
          'flex items-center px-4 pt-7 text-text-primary',
          isSidebarOpen ? 'justify-between' : 'flex-col justify-center gap-4',
        )}
      >
        <Logo markOnly={!isSidebarOpen} />
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            'p-1.5 transition-colors',
            isMobileSheet
              ? 'rounded-lg text-icon-tertiary hover:bg-background-gray-primary hover:text-text-primary'
              : 'text-icon-tertiary hover:text-text-secondary',
          )}
          aria-label={isMobileSheet ? 'Đóng menu' : isSidebarOpen ? 'Thu gọn menu' : 'Mở rộng menu'}
          aria-expanded={isSidebarOpen}
        >
          {isMobileSheet ? <CloseIcon /> : <SidebarExpandedIcon />}
        </button>
      </div>

      <ScrollArea as="nav" className={cn('flex-1 pb-6', isSidebarOpen ? 'mt-5 space-y-3 px-4' : 'mt-5 px-2')}>
        {sections.map((section, index) => {
          // The icon rail has no room for group titles, so it always lists every entry.
          const folded = isSidebarOpen && collapsedGroups.includes(section.label);
          const groupId = `nav-group-${section.label}`;
          return (
          <div key={section.label}>
            {isSidebarOpen ? (
              <button
                type="button"
                onClick={() => toggleGroup(section.label)}
                aria-expanded={!folded}
                aria-controls={groupId}
                className="mt-3 mb-2 flex w-full items-center justify-between rounded-md py-1 text-left text-xs text-text-tertiary uppercase transition-colors hover:text-text-secondary"
              >
                <span>{section.label}</span>
                <ChevronDown size={14} className={cn('transition-transform duration-200', folded && '-rotate-90')} aria-hidden />
              </button>
            ) : (
              index > 0 && <hr className="mx-2 my-3 border-border-primary" />
            )}
            <div id={groupId} hidden={folded} className={cn('space-y-1', !isSidebarOpen && 'space-y-1.5')}>
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
          );
        })}
      </ScrollArea>
    </div>
  );
}
