import type { ComponentProps } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/cn'

// Segmented "pill" tabs (Radix Tabs: roles, aria-selected and arrow-key
// navigation come from the library). Student screens all use this one look.
function Tabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root {...props} />
}

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex w-max max-w-full gap-1.5 overflow-x-auto rounded-[14px] border border-line-blue bg-primary-soft p-1 shadow-[0_10px_22px_rgba(17,24,58,0.04)]',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'min-h-[38px] cursor-pointer rounded-[10px] px-5 text-sm font-black whitespace-nowrap text-text-secondary transition-colors hover:text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary/25 data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-[0_8px_18px_rgba(28, 176, 246,0.12)]',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('outline-none', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
