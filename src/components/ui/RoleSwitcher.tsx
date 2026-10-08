import { Check, ChevronDown, Repeat2 } from 'lucide-react'
import { useActiveRole } from '../../hooks/useActiveRole'
import { ROLE_LABELS } from '../../lib/role-home'
import { cn } from '../../lib/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './DropdownMenu'

// Lets a user who holds several roles hop between their areas. Always shows the
// current role; with a single role the menu just explains there is nothing to
// switch to yet.
function RoleSwitcher({ className }: { className?: string }) {
  const { roles, activeRole, switchRole } = useActiveRole()
  if (!activeRole) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Vai trò hiện tại: ${ROLE_LABELS[activeRole]}. Đổi vai trò`}
          className={cn(
            'inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 text-[13px] font-semibold text-text-heading outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus-ring',
            className
          )}
        >
          <Repeat2 size={15} aria-hidden="true" className="text-primary-text" />
          <span className="hidden sm:inline">{ROLE_LABELS[activeRole]}</span>
          <ChevronDown size={14} aria-hidden="true" className="text-text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[230px]">
        <span className="px-[11px] pt-1 pb-0.5 text-[11px] font-bold tracking-wide text-text-subtle uppercase">
          Đổi vai trò
        </span>
        {roles.map((role) => (
          <DropdownMenuItem
            key={role}
            aria-current={role === activeRole ? 'true' : undefined}
            onSelect={() => switchRole(role)}
          >
            <span className="flex-1">{ROLE_LABELS[role]}</span>
            {role === activeRole && <Check size={15} aria-hidden="true" className="text-primary" />}
          </DropdownMenuItem>
        ))}
        {roles.length < 2 && (
          <p className="px-[11px] py-2 text-xs leading-5 text-text-muted">
            Tài khoản chưa được cấp thêm vai trò nào khác.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default RoleSwitcher
