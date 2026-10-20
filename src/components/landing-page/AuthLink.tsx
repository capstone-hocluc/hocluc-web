import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { openLandingAuth, type LandingAuthMode } from './landing-auth'
import { isPlainNavigation } from './navigation'

interface AuthLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  mode?: LandingAuthMode
  onNavigate?: () => void
  destination?: string
}

// Assessment links enter the protected destination; its guard preserves the login return path.
function AuthLink({ mode = 'login', destination, onNavigate, onClick, children, ...rest }: AuthLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (!isPlainNavigation(event)) return
    event.preventDefault()
    onNavigate?.()
    if (destination) window.dispatchEvent(new CustomEvent('hl-navigate', { detail: { path: destination } }))
    else openLandingAuth(mode)
  }
  return (
    <a href={destination ?? `/${mode}`} data-auth={mode} {...rest} onClick={handleClick}>
      {children}
    </a>
  )
}

export default AuthLink
