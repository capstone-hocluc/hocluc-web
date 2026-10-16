import { useEffect, useRef, useState } from 'react'
import { landingNav } from '../../data/landing-content'
import Icon from './Icon'
import LandingLogo from './LandingLogo'
import AuthLink from './AuthLink'

// Matches the breakpoint where the CSS switches from the inline nav to the menu button.
const DESKTOP_QUERY = '(min-width: 1051px)'

function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

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

  return (
    <>
      <div className="header-scroll-sentinel" aria-hidden="true" ref={sentinelRef} />
      <header
        className={`header${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' is-menu-open' : ''}`}
      >
        <nav className="container nav" aria-label="Điều hướng chính">
          <a className="logo" href="#top" aria-label="hocluc.com — Trang chủ">
            <LandingLogo size={27} />
          </a>
          <div className="nav-links">
            {landingNav.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
          <div className="nav-actions">
            <AuthLink className="login-link">Đăng nhập</AuthLink>
            <AuthLink mode="signup" className="btn btn-primary btn-small">
              Bắt đầu miễn phí
              <Icon name="arrow-right" />
            </AuthLink>
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
            <a key={link.href} href={link.href} onClick={closeMenu}>
              {link.label}
            </a>
          ))}
          <AuthLink onNavigate={closeMenu}>Đăng nhập</AuthLink>
        </nav>
      </header>
    </>
  )
}

export default LandingHeader
