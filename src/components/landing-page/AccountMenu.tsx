import { useEffect, useRef, useState } from 'react'
import type { UserProfile } from '../../services/userService'
import { accountLinks, profileInitials, profileName, requestLogout } from './account-links'
import AppLink from './AppLink'
import Icon from './Icon'

// Signed-in part of the public header: avatar button with a small account menu.
function AccountMenu({ profile }: { profile: UserProfile }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const name = profileName(profile)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản: ${name}`}
        onClick={() => setOpen((current) => !current)}
      >
        {profile.avatarUrl ? (
          <img className="account-avatar" src={profile.avatarUrl} alt="" />
        ) : (
          <span className="account-avatar" aria-hidden="true">
            {profileInitials(profile)}
          </span>
        )}
        <span className="account-name">{name}</span>
        <Icon name="chevron-down" />
      </button>
      {open && (
        <div className="account-dropdown" role="menu">
          {accountLinks(profile).map((link) => (
            <AppLink
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Icon name={link.icon} />
              {link.label}
            </AppLink>
          ))}
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            onClick={() => {
              setOpen(false)
              requestLogout()
            }}
          >
            <Icon name="log-out" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}

export default AccountMenu
