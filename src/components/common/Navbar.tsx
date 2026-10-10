import { ROLE_LABELS, roleHome } from '../../lib/role-home'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, PackageSearch, ShoppingCart, Sparkles, UserRound } from '../console/icons'
import { navLinks } from '../../data/content'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import Logo from './Logo'

const navLinkStyle = {
  textDecoration: 'none',
  color: '#2A3354',
  fontWeight: 600,
  fontSize: 14.5,
  whiteSpace: 'nowrap' as const,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: '9px 16px',
  borderRadius: 999,
  display: 'inline-flex',
  alignItems: 'center',
}

function navigateTo(path: string) {
  window.dispatchEvent(new CustomEvent('hl-navigate', { detail: { path } }))
}

function openAuth(mode: 'login' | 'signup') {
  window.dispatchEvent(new CustomEvent('open-auth', { detail: { mode } }))
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { profile } = useCurrentUser()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const displayName =
    profile?.displayName ||
    [profile?.lastName, profile?.firstName].filter(Boolean).join(' ') ||
    profile?.email ||
    'Học viên'
  const profileInitials =
    `${profile?.lastName?.[0] ?? ''}${profile?.firstName?.[0] ?? ''}`.trim() ||
    profile?.email?.slice(0, 2).toUpperCase() ||
    'HV'

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        transition: 'background .35s, box-shadow .35s, padding .35s',
        padding: scrolled ? '12px 0' : '20px 0',
        background: scrolled ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.6)',
        boxShadow: scrolled ? '0 8px 30px -12px rgba(24,48,68,.18)' : 'none',
        backdropFilter: 'saturate(180%) blur(10px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div
          style={{
            height: 52,
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            padding: '0 24px',
            borderRadius: 999,
            background: '#fff',
            boxShadow: scrolled
              ? '0 10px 30px -12px rgba(17,24,58,.22)'
              : '0 8px 24px -14px rgba(17,24,58,.16)',
            transition: 'box-shadow .35s',
          }}
        >
          <a href="/#top" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Logo size={34} />
          </a>

          <nav style={{ display: 'flex', gap: 4 }} className="hl-desktop-nav">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hl-nav" style={navLinkStyle}>
                {link.label}
              </a>
            ))}
            <button
              type="button"
              className="hl-nav"
              style={navLinkStyle}
              onClick={() => navigateTo('/courses')}
            >
              Khóa học
            </button>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {profile ? (
            <>
              <button
                type="button"
                aria-label="Giỏ hàng"
                onClick={() => navigateTo('/cart')}
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  border: '1px solid rgba(28, 176, 246,.16)',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  background: '#fff',
                  color: '#2A3354',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <ShoppingCart size={18} />
              </button>
              <div className="hl-nav-user" ref={menuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                aria-expanded={menuOpen}
                aria-label="Mở menu tài khoản"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid rgba(28, 176, 246,.16)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: '#fff',
                  padding: '6px 14px 6px 6px',
                  borderRadius: 40,
                  boxShadow: '0 6px 16px -8px rgba(24,48,68,.2)',
                }}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-[#E8F7FC] text-xs font-extrabold text-[#1679A4]"
                  >
                    {profileInitials}
                  </span>
                )}
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 13.5,
                    color: '#2A3354',
                    maxWidth: 130,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </span>
                <ChevronDown size={16} color="#2A3354" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    minWidth: 200,
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: '0 20px 44px -18px rgba(24,48,68,.32)',
                    border: '1px solid rgba(24,48,68,.06)',
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <button
                    type="button"
                    className="hl-nav-menu-item"
                    onClick={() => {
                      setMenuOpen(false)
                      navigateTo(roleHome(profile.role))
                    }}
                  >
                    <Sparkles size={16} />
                    {profile.role === 'STUDENT' ? 'Bắt đầu học' : `Khu vực ${ROLE_LABELS[profile.role]}`}
                  </button>
                  <button
                    type="button"
                    className="hl-nav-menu-item"
                    onClick={() => {
                      setMenuOpen(false)
                      navigateTo(profile.role === 'STUDENT' ? '/student/profile' : roleHome(profile.role).replace('/dashboard', '/profile'))
                    }}
                  >
                    <UserRound size={16} />
                    Hồ sơ
                  </button>
                  <button
                    type="button"
                    className="hl-nav-menu-item"
                    onClick={() => {
                      setMenuOpen(false)
                      navigateTo('/orders')
                    }}
                  >
                    <PackageSearch size={16} />
                    Đơn hàng của tôi
                  </button>
                  <button
                    type="button"
                    className="hl-nav-menu-item is-danger"
                    onClick={() => {
                      setMenuOpen(false)
                      window.dispatchEvent(new CustomEvent('hl-logout'))
                    }}
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              )}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="hl-nav-ghost"
                onClick={() => openAuth('signup')}
                style={{
                  border: '1.5px solid rgba(28, 176, 246,.3)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  fontWeight: 800,
                  fontSize: 13.5,
                  letterSpacing: '.5px',
                  textTransform: 'uppercase',
                  padding: '12px 20px',
                  borderRadius: 40,
                }}
              >
                Đăng ký
              </button>
              <button
                type="button"
                className="hl-by"
                onClick={() => openAuth('login')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: 'linear-gradient(180deg,var(--color-accent),var(--color-accent-dark))',
                  color: 'var(--color-primary-dark)',
                  fontWeight: 800,
                  fontSize: 13.5,
                  letterSpacing: '.5px',
                  textTransform: 'uppercase',
                  padding: '13px 24px',
                  borderRadius: 40,
                  boxShadow: '0 8px 20px rgba(59,175,218,.4)',
                }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                aria-label="Mở menu"
                className="hl-rot"
                style={{
                  width: 46,
                  height: 46,
                  flexShrink: 0,
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  background: 'linear-gradient(180deg,var(--color-accent),var(--color-accent-dark))',
                  color: 'var(--color-primary-dark)',
                  fontSize: 18,
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 8px 20px rgba(59,175,218,.4)',
                }}
              >
                ↗
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
