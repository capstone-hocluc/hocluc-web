import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { openLandingAuth, type LandingAuthMode } from './landing-auth'

interface AuthLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  mode?: LandingAuthMode
  onNavigate?: () => void
}

// Keeps a real /login href for open-in-new-tab, but opens the auth dialog on a normal click.
function AuthLink({ mode = 'login', onNavigate, onClick, children, ...rest }: AuthLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    event.preventDefault()
    onNavigate?.()
    openLandingAuth(mode)
  }
  return (
    <a href="/login" data-auth={mode} {...rest} onClick={handleClick}>
      {children}
    </a>
  )
}

export default AuthLink
