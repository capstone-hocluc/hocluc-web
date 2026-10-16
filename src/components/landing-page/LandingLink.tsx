import type { AnchorHTMLAttributes } from 'react'

import { isPlainNavigation } from './navigation'

export default function LandingLink({
  href,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event)
        if (!isPlainNavigation(event) || !href?.startsWith('/') || href.startsWith('//')) return
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('hl-navigate', { detail: { path: href } }))
      }}
    />
  )
}
