import type { AnchorHTMLAttributes, MouseEvent } from 'react'

interface AppLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
}

// Keeps a real href for open-in-new-tab, but a plain click asks App to switch routes in place
// (App listens for 'hl-navigate') instead of reloading the whole page.
function AppLink({ href, onClick, ...rest }: AppLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    event.preventDefault()
    window.dispatchEvent(new CustomEvent('hl-navigate', { detail: { path: href } }))
  }
  return <a href={href} {...rest} onClick={handleClick} />
}

export default AppLink
