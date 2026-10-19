import type { ComponentProps } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/cn'

// Underline tabs for console detail screens (Radix: roles, aria-selected and arrow keys).
// Panels stay mounted while hidden, so a panel that loads data keeps its state across tabs.
export function ConsoleTabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root {...props} />
}

export function ConsoleTabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex gap-1 overflow-x-auto overflow-y-hidden border-b border-card-border',
        className
      )}
      {...props}
    />
  )
}

export function ConsoleTabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-11 cursor-pointer items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium whitespace-nowrap text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 data-[state=active]:border-brand-500 data-[state=active]:text-brand-500',
        className
      )}
      {...props}
    />
  )
}

export function ConsoleTabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      forceMount
      className={cn(
        'flex flex-col gap-5 pt-5 outline-none data-[state=inactive]:hidden',
        className
      )}
      {...props}
    />
  )
}
