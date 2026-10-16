import { useEffect, useRef, useState } from 'react'
import { landingNav, type LandingLink } from '../../data/landing-content'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import AccountMenu from './AccountMenu'
import { accountLinks, requestLogout } from './account-links'
import AppLink from './AppLink'
import Icon from './Icon'
import LandingLogo from './LandingLogo'
import AuthLink from './AuthLink'

// Matches the breakpoint where the CSS switches from the inline nav to the menu button.
const DESKTOP_QUERY = '(min-width: 1051px)'

interface NavItemProps {
  link: LandingLink
  onLanding: boolean
  onClick?: () => void
}

// On the landing page every item is an in-page anchor. Elsewhere an item either has its own page
// (opened in place) or points back at the anchor on the landing page.
function NavItem({ link, onLanding, onClick }: NavItemProps) {
  if (onLanding) {
    return (
      <a href={link.href} onClick={onClick}>
        {link.label}
      </a>
    )
  }
  if (link.pageHref) {
    return (
      <AppLink href={link.pageHref} onClick={onClick}>
        {link.label}
      </AppLink>
    )
  }
  return (
    <a href={`/${link.href}`} onClick={onClick}>
      {link.label}
    </a>
  )
}

// Shared header of the landing page and the public course pages (catalog, detail, cart, orders).
function LandingHeader({ onLanding = true }: { onLanding?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  // Reads the profile already loaded in this session; it does not fetch one, because an expired
  // token would then bounce a visitor of a public page to the login dialog.
  const { profile } = useCurrentUser()

  // The sentinel sits at the very top of the page; once it scrolls out the header gets its shadow.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(([entry]) => {
      setScrolled(entry.boundingClientRect.top < 0)
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)
  const solid = scrolled || !onLanding

  return (
    <>
      <div className="header-scroll-sentinel" aria-hidden="true" ref={sentinelRef} />
      <header
        className={`header${solid ? ' is-scrolled' : ''}${menuOpen ? ' is-menu-open' : ''}`}
      >
        <nav className="container nav" aria-label="Điều hướng chính">
          {onLanding ? (
            <a className="logo" href="#top" aria-label="hocluc.com — Trang chủ">
              <LandingLogo size={27} />
            </a>
          ) : (
            <AppLink className="logo" href="/" aria-label="hocluc.com — Trang chủ">
              <LandingLogo size={27} />
            </AppLink>
          )}
          <div className="nav-links">
            {landingNav.map((link) => (
              <NavItem key={link.href} link={link} onLanding={onLanding} />
            ))}
          </div>
          <div className="nav-actions">
            {profile ? (
              <>
                <AppLink className="nav-icon-button" href="/cart" aria-label="Giỏ hàng">
                  <Icon name="shopping-cart" />
                </AppLink>
                <AccountMenu profile={profile} />
              </>
            ) : (
              <>
                <AuthLink className="login-link">Đăng nhập</AuthLink>
                <AuthLink mode="signup" className="btn btn-primary btn-small">
                  Bắt đầu miễn phí
                  <Icon name="arrow-right" />
                </AuthLink>
              </>
            )}
            <button
              ref={menuButtonRef}
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name={menuOpen ? 'x' : 'menu'} />
            </button>
          </div>
        </nav>
        <nav
          className={`mobile-nav${menuOpen ? ' open' : ''}`}
          id="mobile-nav"
          aria-label="Điều hướng trên điện thoại"
        >
          {landingNav.map((link) => (
            <NavItem key={link.href} link={link} onLanding={onLanding} onClick={closeMenu} />
          ))}
          {profile ? (
            <div className="mobile-nav-account">
              {accountLinks(profile).map((link) => (
                <AppLink key={link.href} href={link.href} onClick={closeMenu}>
                  {link.label}
                </AppLink>
              ))}
              <button
                type="button"
                onClick={() => {
                  closeMenu()
                  requestLogout()
                }}
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <AuthLink onNavigate={closeMenu}>Đăng nhập</AuthLink>
          )}
        </nav>
      </header>
    </>
  )
}

export default LandingHeader
