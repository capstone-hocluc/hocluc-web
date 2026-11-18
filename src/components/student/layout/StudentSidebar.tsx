import { studentNavGroups, type StudentNavKey } from '../../../lib/studentNav'
import { cn } from '../../../lib/cn'
import { Sheet, SheetBody } from '../../ui/Sheet'
import styles from './StudentSidebar.module.css'

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
    <nav aria-label="Điều hướng học sinh" className="flex w-full flex-col gap-1 app-scroll overflow-y-auto">
      {studentNavGroups.flatMap((group) => group.items).map((item) => {
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
              !mobile && styles.item,
              active
                ? 'bg-surface-brand text-primary-text'
                : 'text-text-body hover:bg-surface-brand hover:text-primary-text'
            )}
          >
            <Icon size={20} className="shrink-0" />
            <span
              className={cn(
                'min-w-0',
                !mobile && styles.label
              )}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )

  return (
    <>
      <aside
        id="student-navigation"
        data-collapsed={collapsed}
        className={styles.sidebar}
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
