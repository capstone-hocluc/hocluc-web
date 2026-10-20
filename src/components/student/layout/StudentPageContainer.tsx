import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

// Width + rhythm of the content area inside StudentLayout. Pages compose
// their sections inside this instead of setting their own max-width.
const container = cva('student-page mx-auto w-full min-w-0', {
  variants: {
    width: {
      default: 'max-w-[1180px]',
      compact: 'max-w-[680px]',
      reading: 'max-w-[960px]',
      narrow: 'max-w-[980px]',
      wide: 'max-w-[1280px]',
    },
    spacing: {
      none: '',
      stack: 'flex flex-col gap-6',
    },
  },
  defaultVariants: { width: 'default', spacing: 'none' },
})

type StudentPageContainerProps = ComponentProps<'section'> & VariantProps<typeof container>

function StudentPageContainer({ width, spacing, className, ...props }: StudentPageContainerProps) {
  return <section className={cn(container({ width, spacing }), className)} {...props} />
}

export default StudentPageContainer
