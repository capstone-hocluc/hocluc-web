import type { ComponentProps } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/cn'

// Segmented tabs in the landing style (Radix Tabs: roles, aria-selected and arrow-key
// navigation come from the library). Student screens all use this one look.
function Tabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root {...props} />
}

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex w-max max-w-full gap-1.5 overflow-x-auto rounded-2xl border-2 border-line bg-surface p-1',
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
        'min-h-10 cursor-pointer rounded-xl px-5 text-[15px] font-extrabold whitespace-nowrap text-text-body transition-colors hover:bg-surface-brand hover:text-primary-text focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#174fbd] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:hover:bg-primary',
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
