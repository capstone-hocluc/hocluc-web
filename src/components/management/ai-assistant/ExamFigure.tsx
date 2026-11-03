import { useState } from 'react'
import { cn } from '../../../lib/cn'

interface ExamFigureProps {
  src: string | null
  alt: string
  className?: string
}

/** A figure of the paper; a signed URL that no longer loads leaves nothing behind. */
export default function ExamFigure({ src, alt, className }: ExamFigureProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (!src || failedSrc === src) return null
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={cn('max-w-full', className)}
    />
  )
}
