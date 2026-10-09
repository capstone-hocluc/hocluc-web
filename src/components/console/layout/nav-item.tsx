import { cn } from '../../../lib/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../tailgrids/core/tooltip';
import type { NavEntry } from './nav-types';

interface NavItemProps {
  item: NavEntry;
  active: boolean;
  collapsed?: boolean;
  onSelect: (key: string) => void;
}

// NextAdmin sidebar item: expanded = icon + label row, collapsed = icon-only with tooltip.
export default function NavItem({ item, active, collapsed, onSelect }: NavItemProps) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <Tooltip placement="right">
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              aria-label={item.title}
              className={cn(
                'flex items-center justify-center rounded-lg px-3 py-2.5',
                active
                  ? 'bg-sidebar-navigation-nav-item-nav-hover-background text-icon-primary'
                  : 'text-icon-tertiary transition-colors duration-200 hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-icon-primary',
              )}
            >
              <Icon size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{item.title}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-navigation-nav-item-nav-hover-background text-text-primary'
          : 'text-text-secondary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary',
      )}
    >
      <span className="text-icon-tertiary">
        <Icon size={20} />
      </span>
      <span>{item.title}</span>
    </button>
  );
}
