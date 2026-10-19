import { studentNavGroups, type StudentNavKey } from '../../../lib/studentNav'
import { cn } from '../../../lib/cn'
import { Sheet, SheetBody } from '../../ui/Sheet'

interface StudentSidebarProps {
  activeKey: StudentNavKey | null
  onNavigate: (path: string) => void
  collapsed?: boolean
  mobileOpen?: boolean
  onCloseMobile: () => void
}

function StudentSidebar({
  activeKey,
  onNavigate,
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
}: StudentSidebarProps) {
  const navigation = (mobile: boolean) => (
    <nav aria-label="Điều hướng học sinh" className="flex w-full flex-col gap-6 overflow-y-auto">
      {studentNavGroups.map((group, index) => (
        <div
          key={group.label}
          role="group"
          aria-label={group.label}
          className={cn(
            'flex flex-col gap-1',
            !mobile &&
              index > 0 &&
              'group-data-[collapsed=true]/sidebar:border-t group-data-[collapsed=true]/sidebar:border-line-shell group-data-[collapsed=true]/sidebar:pt-4 max-[1180px]:border-t max-[1180px]:border-line-shell max-[1180px]:pt-4'
          )}
        >
          <p
            className={cn(
              'px-3.5 pb-2 text-xs font-medium text-text-muted',
              !mobile && 'group-data-[collapsed=true]/sidebar:hidden max-[1180px]:hidden'
            )}
          >
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
                onClick={() => {
                  onCloseMobile()
                  onNavigate(item.path)
                }}
                className={cn(
                  'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 text-left text-sm font-semibold transition-colors duration-200 active:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                  !mobile &&
                    'group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0 max-[1180px]:justify-center max-[1180px]:px-0',
                  active
                    ? 'bg-surface-brand text-primary-text'
                    : 'text-text-body hover:bg-surface-brand hover:text-primary-text'
                )}
              >
                <Icon size={20} className="shrink-0" />
                <span
                  className={cn(
                    'min-w-0',
                    !mobile && 'group-data-[collapsed=true]/sidebar:hidden max-[1180px]:hidden'
                  )}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )

  return (
    <>
      <aside
        id="student-navigation"
        data-collapsed={collapsed}
        className={cn(
          'group/sidebar sticky top-[72px] col-start-1 row-start-2 flex h-[calc(100dvh-72px)] flex-col border-r border-line-shell bg-surface py-6 max-[760px]:hidden',
          collapsed ? 'items-center px-3' : 'px-4',
          'max-[1180px]:items-center max-[1180px]:px-3'
        )}
      >
        {navigation(false)}
      </aside>
      <Sheet
        open={mobileOpen}
        onClose={onCloseMobile}
        title="Không gian học tập"
        closeLabel="Đóng menu học tập"
        className="max-[760px]:w-[min(320px,90vw)]"
      >
        <SheetBody className="p-4">{navigation(true)}</SheetBody>
      </Sheet>
    </>
  )
}

export default StudentSidebar
