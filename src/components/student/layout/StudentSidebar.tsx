import { studentNavItems, type StudentNavKey } from '../../../lib/studentNav'
import { cn } from '../../../lib/cn'

interface StudentSidebarProps {
  /** Entry to highlight; comes from getStudentNavKey(route), so deep routes keep their section active. */
  activeKey: StudentNavKey | null
  onNavigate: (path: string) => void
  collapsed?: boolean
  onNotify?: (message: string) => void
}

// Icon rail. Labels are hidden when collapsed, and always below 1180px
// (StudentLayout forces the 92px rail there); below 760px it becomes a
// horizontal bar under the topbar.
function StudentSidebar({
  activeKey,
  onNavigate,
  collapsed = false,
  onNotify,
}: StudentSidebarProps) {
  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        'group/sidebar sticky top-[86px] col-start-1 row-start-2 flex h-[calc(100vh-86px)] flex-col gap-6 border-r border-line-shell bg-surface/90 shadow-[10px_0_34px_rgba(17,24,58,0.04)]',
        collapsed ? 'items-center px-3.5 pt-[30px] pb-5' : 'px-[18px] pt-[30px] pb-6',
        'max-[1180px]:items-center max-[1180px]:px-3.5 max-[1180px]:py-5',
        'max-[760px]:static max-[760px]:z-40 max-[760px]:h-auto max-[760px]:flex-row max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-3 max-[760px]:py-2.5'
      )}
    >
      <nav className="flex w-full flex-col gap-2 max-[760px]:flex-1 max-[760px]:flex-row max-[760px]:justify-center">
        {studentNavItems.map((item) => {
          const Icon = item.icon
          const active = item.key === activeKey
          return (
            <button
              key={item.key}
              type="button"
              title={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() =>
                item.path ? onNavigate(item.path) : onNotify?.('Tính năng đang được phát triển.')
              }
              className={cn(
                'flex min-h-[46px] w-full cursor-pointer items-center gap-[11px] rounded-[15px] border px-3.5 text-[13px] font-extrabold transition duration-200',
                'group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0',
                'max-[1180px]:justify-center max-[1180px]:px-0 max-[760px]:min-h-[42px] max-[760px]:w-[42px] max-[760px]:rounded-[14px]',
                active
                  ? 'border-line-brand bg-linear-to-br from-badge-info-bg to-surface-sky text-primary shadow-[0_10px_22px_rgba(28, 176, 246,0.08)]'
                  : 'border-transparent text-text-body hover:-translate-y-px hover:border-line-blue hover:bg-surface-brand hover:text-primary'
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="group-data-[collapsed=true]/sidebar:hidden max-[1180px]:hidden">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export default StudentSidebar
