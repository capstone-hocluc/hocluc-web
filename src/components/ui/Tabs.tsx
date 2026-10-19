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
        'inline-flex w-max max-w-full gap-6 overflow-x-auto border-b border-line bg-transparent',
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
        'min-h-12 shrink-0 cursor-pointer border-b-2 border-transparent px-1 py-3 text-sm font-semibold whitespace-nowrap text-text-body transition-colors hover:border-line-brand hover:text-primary-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring data-[state=active]:border-primary-bright data-[state=active]:text-primary-text',
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
