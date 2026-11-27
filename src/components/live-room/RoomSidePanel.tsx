import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconAction } from '../console/icon-action'
import { ConsoleSubTabsList, ConsoleSubTabsTrigger, ConsoleTabs, ConsoleTabsContent } from '../console/tabs'

export type RoomTab = 'class' | 'chat'

export interface RoomSideTab {
  value: RoomTab
  label: string
  /** Unread count shown on the tab while it is not the open one. */
  badge?: number
  content: ReactNode
}

interface RoomSidePanelProps {
  tabs: RoomSideTab[]
  active: RoomTab
  onChange: (tab: RoomTab) => void
  onClose: () => void
}

/** The card next to the video: one tab per panel (class list, chat), so switching is one click. */
export default function RoomSidePanel({ tabs, active, onChange, onClose }: RoomSidePanelProps) {
  return (
    <aside aria-label={tabs.map((tab) => tab.label).join(' và ')} className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-card-border bg-card-background shadow-sm md:w-80">
      <ConsoleTabs value={active} onValueChange={(value) => onChange(value as RoomTab)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-card-border p-2">
          {tabs.length > 1 ? (
            <ConsoleSubTabsList className="flex flex-1">
              {tabs.map((tab) => (
                <ConsoleSubTabsTrigger key={tab.value} value={tab.value} className="flex-1 justify-center">
                  {tab.label}
                  {!!tab.badge && tab.value !== active && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-badge-error-text px-1 text-[11px] leading-none font-semibold text-white">{tab.badge > 9 ? '9+' : tab.badge}</span>
                  )}
                </ConsoleSubTabsTrigger>
              ))}
            </ConsoleSubTabsList>
          ) : <h2 className="flex-1 pl-2 font-semibold text-text-primary">{tabs[0]?.label}</h2>}
          <IconAction label="Đóng" icon={X} onClick={onClose} />
        </div>
        {tabs.map((tab) => (
          <ConsoleTabsContent key={tab.value} value={tab.value} className="min-h-0 flex-1 gap-0 pt-0">{tab.content}</ConsoleTabsContent>
        ))}
      </ConsoleTabs>
    </aside>
  )
}
