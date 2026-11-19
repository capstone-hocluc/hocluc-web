import type { ComponentProps } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/cn'

// Browser-style tabs for console screens (Radix: roles, aria-selected and arrow keys). The active
// tab is a white, top-rounded card in brand text that sits over the row's baseline; short
// dividers separate the resting tabs. Panels stay mounted while hidden, so a panel that loads data
// keeps its state across tabs.
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
        // The baseline is an inset shadow, so the active tab's background covers it.
        'flex items-end gap-0.5 overflow-x-auto overflow-y-hidden px-1 shadow-[inset_0_-1px_0_var(--color-card-border)]',
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
        'relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-t-lg px-4 text-sm font-medium whitespace-nowrap text-text-tertiary transition-colors hover:bg-card-border/40 hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500',
        // Divider on the left edge, dropped where it would touch the active or hovered tab.
        'bg-[linear-gradient(var(--color-card-border),var(--color-card-border))] bg-size-[1px_16px] bg-position-[0_50%] bg-no-repeat first:bg-none hover:bg-none [:hover+&]:bg-none [[data-state=active]+&]:bg-none',
        'data-[state=active]:bg-card-background data-[state=active]:bg-none data-[state=active]:text-brand-500 data-[state=active]:shadow-[inset_1px_1px_0_var(--color-card-border),inset_-1px_0_0_var(--color-card-border)]',
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

// Second-level tabs inside a tab panel: a small segmented control, so it never reads as another
// row of page tabs. Use ConsoleTabs and ConsoleTabsContent around it as usual.
export function ConsoleSubTabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex max-w-full items-center gap-1 self-start overflow-x-auto rounded-lg bg-background-gray-secondary p-1',
        className
      )}
      {...props}
    />
  )
}

export function ConsoleSubTabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500',
        'data-[state=active]:bg-card-background data-[state=active]:text-brand-500 data-[state=active]:shadow-xs',
        className
      )}
      {...props}
    />
  )
}
