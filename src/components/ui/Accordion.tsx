import type { ComponentProps } from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from '../console/icons'
import { cn } from '../../lib/cn'

// Thin wrappers over Radix Accordion: state, aria-expanded and keyboard
// handling come from the library; these only add the chevron + layout hooks.
const Accordion = AccordionPrimitive.Root
const AccordionItem = AccordionPrimitive.Item

interface AccordionTriggerProps extends ComponentProps<typeof AccordionPrimitive.Trigger> {
  iconSize?: number
}

function AccordionTrigger({ className, children, iconSize = 18, ...props }: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="m-0 flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'group flex w-full cursor-pointer items-center gap-3 p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          className
        )}
        {...props}
      >
        <ChevronDown
          size={iconSize}
          className="shrink-0 text-heading transition-transform duration-200 group-data-[state=closed]:-rotate-90"
        />
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return <AccordionPrimitive.Content className={className} {...props} />
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
