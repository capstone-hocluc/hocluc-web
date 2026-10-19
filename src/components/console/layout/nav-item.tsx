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
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center rounded-lg px-3 py-2.5',
                active
                  ? 'bg-sidebar-navigation-nav-item-nav-hover-background text-icon-primary'
                  : 'text-icon-tertiary transition-colors duration-200 hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-icon-primary',
              )}
            >
              <span className="relative">
                <Icon size={20} />
                {!!item.badge && (
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-brand-500" aria-hidden />
                )}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{item.badge ? `${item.title} · ${item.badge} đang chờ` : item.title}</p>
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
          ? 'bg-sidebar-navigation-nav-item-nav-hover-background text-primary-text'
          : 'text-text-secondary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary',
      )}
    >
      <span className={active ? 'text-primary-text' : 'text-icon-tertiary'}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">{item.title}</span>
      {!!item.badge && (
        <span
          className="ml-auto min-w-5 rounded-full bg-badge-blue-background px-1.5 text-center text-xs leading-5 font-medium text-badge-blue-text"
          aria-label={`${item.badge} đang chờ`}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}
