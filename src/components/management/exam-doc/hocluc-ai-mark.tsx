import { useId } from 'react'

/**
 * HọcLực's mark as the AI assistant's: the same figure, its body in blue running to violet and magenta, and its head a
 * four-point spark. Inline, so each copy keeps its own gradients (`useId`); its size comes from `className`.
 */
export function HocLucAiMark({ className }: { className?: string }) {
  const id = useId()
  const body = `${id}-body`
  const spark = `${id}-spark`
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={body} x1="8" y1="30" x2="27" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1d7cf2" />
          <stop offset=".55" stopColor="#6d5df6" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
        <linearGradient id={spark} x1="12.8" y1="11.5" x2="20" y2="4.3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ec4899" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path
        opacity=".55"
        fill={`url(#${body})`}
        d="M5.48 11.89C8.8 13.99 9.7 15.53 9.21 19.5C10.3 17.37 12.03 15.83 13.82 14.28C12.51 12.29 7.7 11.07 5.48 11.89Z"
      />
      <path
        fill={`url(#${body})`}
        d="M26.28 2.02C24.33 7.19 23.52 8.65 18.63 11.81C16.28 13.32 13.92 14.44 11.96 16.74C9.58 19.52 7.98 22.03 7.98 25.81C7.98 27.28 8.31 28.61 8.78 29.9C9.41 29.7 14.14 25.71 14.81 24.95C17.6 21.74 17.4 17.82 19.65 15.42C23.3 11.53 27.71 8.04 26.28 2.02Z"
      />
      <path fill={`url(#${spark})`} d="M16.4 4.3Q17.3 7 20 7.9Q17.3 8.8 16.4 11.5Q15.5 8.8 12.8 7.9Q15.5 7 16.4 4.3Z" />
    </svg>
  )
}
