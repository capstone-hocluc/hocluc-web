import { studentNavGroups, type StudentNavKey } from '../../../lib/studentNav'
import { cn } from '../../../lib/cn'

interface StudentSidebarProps {
  /** Entry to highlight; comes from getStudentNavKey(route), so deep routes keep their section active. */
  activeKey: StudentNavKey | null
  onNavigate: (path: string) => void
  collapsed?: boolean
}

// Icon rail in three groups. Labels and group titles are hidden when collapsed,
// and always below 1180px (StudentLayout forces the 92px rail there); below
// 760px it becomes a horizontal bar under the topbar that scrolls sideways.
function StudentSidebar({ activeKey, onNavigate, collapsed = false }: StudentSidebarProps) {
  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        'group/sidebar sticky top-[72px] col-start-1 row-start-2 flex h-[calc(100vh-72px)] flex-col gap-6 border-r border-line-shell bg-surface',
        collapsed ? 'items-center px-3.5 pt-6 pb-5' : 'px-4 pt-6 pb-6',
        'max-[1180px]:items-center max-[1180px]:px-3.5 max-[1180px]:py-5',
        'max-[760px]:static max-[760px]:z-40 max-[760px]:h-auto max-[760px]:flex-row max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-3 max-[760px]:py-2.5'
      )}
    >
      <nav className="scrollbar-thin flex w-full flex-col gap-4 overflow-y-auto max-[760px]:flex-1 max-[760px]:flex-row max-[760px]:gap-1 max-[760px]:overflow-x-auto max-[760px]:overflow-y-visible">
        {studentNavGroups.map((group, index) => (
          <div
            key={group.label}
            role="group"
            aria-label={group.label}
            className={cn(
              'flex flex-col gap-1.5 max-[760px]:shrink-0 max-[760px]:flex-row max-[760px]:gap-1',
              index > 0 &&
                'group-data-[collapsed=true]/sidebar:border-t group-data-[collapsed=true]/sidebar:border-line-shell group-data-[collapsed=true]/sidebar:pt-4 max-[1180px]:border-t max-[1180px]:border-line-shell max-[1180px]:pt-4 max-[760px]:border-t-0 max-[760px]:border-l max-[760px]:pt-0 max-[760px]:pl-1'
            )}
          >
            <p className="px-3.5 pb-1 text-xs font-extrabold tracking-[0.08em] text-text-muted uppercase group-data-[collapsed=true]/sidebar:hidden max-[1180px]:hidden">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon
              const active = item.key === activeKey
              return (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onNavigate(item.path)}
                  className={cn(
                    'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border-2 px-3.5 text-[15px] font-extrabold transition duration-200 focus-visible:outline-3 focus-visible:outline-offset-2',
                    'group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0',
                    'max-[1180px]:justify-center max-[1180px]:px-0 max-[760px]:min-h-11 max-[760px]:w-11 max-[760px]:shrink-0',
                    active
                      ? 'border-transparent bg-surface-brand text-primary-text'
                      : 'border-transparent text-text-body hover:bg-surface-brand hover:text-primary-text'
                  )}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="group-data-[collapsed=true]/sidebar:hidden max-[1180px]:hidden">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default StudentSidebar
