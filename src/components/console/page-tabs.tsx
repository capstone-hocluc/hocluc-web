import type { ReactNode } from 'react'
import type { PageTab } from '../../lib/console-nav'
import { Tabs, TabsContent } from '../ui/Tabs'
import { ConsoleTabsList, ConsoleTabsTrigger } from './tabs'

/**
 * Pages that share one sidebar entry. Each tab is its own route, so switching tabs navigates; the screen shows
 * `PageTabsList` under its heading, as the quiz pages do.
 */
export function PageTabs({ value, onNavigate, children }: {
  value: string
  onNavigate: (page: string) => void
  children: ReactNode
}) {
  return (
    <Tabs value={value} onValueChange={onNavigate} activationMode="manual" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TabsContent value={value} className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
        {children}
      </TabsContent>
    </Tabs>
  )
}

/** On a phone the row wraps instead of scrolling, so no tab is hidden off the edge. */
export function PageTabsList({ tabs, label }: { tabs: PageTab[]; label: string }) {
  return (
    <ConsoleTabsList aria-label={label} className="max-sm:flex-wrap max-sm:overflow-visible">
      {tabs.map((tab) => (
        <ConsoleTabsTrigger key={tab.page} value={tab.page}>
          {tab.label}
        </ConsoleTabsTrigger>
      ))}
    </ConsoleTabsList>
  )
}
