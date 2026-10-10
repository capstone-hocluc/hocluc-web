import type { ComponentType } from 'react'
import { ClipboardCheck, FileText, PlayCircle, Target, Video } from '../../console/icons'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

// One place that maps a kind of learning content to its semantic colour + icon:
// video/document = blue, practice = green, quiz/mini test = purple,
// live = amber, locked = gray.
const tile = cva('grid shrink-0 place-items-center', {
  variants: {
    type: {
      video: 'bg-primary-soft text-primary',
      document: 'bg-primary-soft text-primary',
      practice: 'bg-practice-soft text-practice',
      assessment: 'bg-assess-soft text-assess',
      live: 'bg-live-soft text-live',
    },
    locked: {
      true: 'bg-lock-soft text-lock',
      false: '',
    },
    size: {
      md: 'size-8 rounded-[11px]',
    },
  },
  defaultVariants: { locked: false, size: 'md' },
})

export type LearningType = NonNullable<VariantProps<typeof tile>['type']>

const icons: Record<LearningType, ComponentType<{ size?: number }>> = {
  video: PlayCircle,
  document: FileText,
  practice: ClipboardCheck,
  assessment: Target,
  live: Video,
}

interface LearningTypeIconProps {
  type: LearningType
  locked?: boolean
  className?: string
}

function LearningTypeIcon({ type, locked = false, className }: LearningTypeIconProps) {
  const Icon = icons[type]
  return (
    <span className={cn(tile({ type, locked }), className)}>
      <Icon size={17} />
    </span>
  )
}

export default LearningTypeIcon
