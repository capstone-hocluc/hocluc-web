import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { openLandingAuth, type LandingAuthMode } from './landing-auth'
import { isPlainNavigation } from './navigation'

interface AuthLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  mode?: LandingAuthMode
  onNavigate?: () => void
}

// Keeps a real /login href for open-in-new-tab, but opens the auth dialog on a normal click.
function AuthLink({ mode = 'login', onNavigate, onClick, children, ...rest }: AuthLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (!isPlainNavigation(event)) return
    event.preventDefault()
    onNavigate?.()
    openLandingAuth(mode)
  }
  return (
    <a href={`/${mode}`} data-auth={mode} {...rest} onClick={handleClick}>
      {children}
    </a>
  )
}

export default AuthLink
