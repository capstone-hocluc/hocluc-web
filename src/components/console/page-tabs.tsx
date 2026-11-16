import type { ReactNode } from 'react'
import type { PageTab } from '../../lib/console-nav'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'

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
    <TabsList aria-label={label} className="w-full flex-wrap gap-x-4 gap-y-0 sm:flex-nowrap sm:gap-x-6">
      {tabs.map((tab) => (
        <TabsTrigger key={tab.page} value={tab.page}>
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
