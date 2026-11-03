import { useState } from 'react'
import { cn } from '../../../lib/cn'

import { courseImageSrc } from './course-image-src'

interface Props {
  imageUrl: string | null
  title: string
  categoryName: string | null
  className?: string
  loading?: 'lazy' | 'eager'
}

export default function CourseCover({ imageUrl, title, categoryName, className, loading }: Props) {
  const src = courseImageSrc(imageUrl)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const initial = (categoryName?.trim() || title.trim()).charAt(0).toLocaleUpperCase('vi-VN')

  return (
    <div className={cn('aspect-video overflow-hidden rounded-lg bg-background-gray-secondary', className)}>
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={title}
          loading={loading}
          onError={() => setFailedSrc(src)}
          className="size-full object-cover"
        />
      ) : (
        <span
          role="img"
          aria-label={title}
          className="flex size-full items-center justify-center font-semibold text-text-secondary"
        >
          {initial}
        </span>
      )}
    </div>
  )
}
