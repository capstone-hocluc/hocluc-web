import type { ComponentProps, ReactNode } from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '../../lib/cn'

interface AvatarProps extends ComponentProps<typeof AvatarPrimitive.Root> {
  src?: string
  alt?: string
  /** Shown while the image loads or when it fails (e.g. initials). */
  fallback?: ReactNode
}

function Avatar({ src, alt = '', fallback, className, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative inline-flex size-10 shrink-0 overflow-hidden rounded-full',
        className
      )}
      {...props}
    >
      <AvatarPrimitive.Image src={src} alt={alt} className="size-full object-cover" />
      <AvatarPrimitive.Fallback className="grid size-full place-items-center bg-primary-soft text-sm font-bold text-primary-text">
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

export default Avatar
