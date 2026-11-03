import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from '../console/icons'
import LandingLogo from '../landing-page/LandingLogo'
import { isAuthSwapRunning } from './swap-auth-form'
import '../../styles/auth/auth-brand.css'

interface BrandAuthShellProps {
  children: ReactNode
  onBack: () => void
  className?: string
}

// The learner dialog over the public pages is just the form: logo, title, fields.
// Management sign-in has its own page shell (AuthShell) in the console kit.
export default function BrandAuthShell({ children, onBack, className = '' }: BrandAuthShellProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onBack()}>
      <Dialog.Portal>
        <Dialog.Overlay className="hl-brand-auth brand-auth-overlay">
          <Dialog.Content
            className={`brand-auth-card is-compact ${className}`}
            aria-describedby={undefined}
            // A click during the login/signup swap lands on the page root under the animation.
            onPointerDownOutside={(event) => {
              if (isAuthSwapRunning()) event.preventDefault()
            }}
            onOpenAutoFocus={(event) => {
              const input =
                event.currentTarget instanceof HTMLElement
                  ? event.currentTarget.querySelector<HTMLInputElement>('input')
                  : null
              if (input) {
                event.preventDefault()
                input.focus({ preventScroll: true })
              }
            }}
          >
            <Dialog.Title className="brand-auth-sr-only">Tài khoản Hocluc</Dialog.Title>
            <Dialog.Close className="brand-auth-close" aria-label="Đóng">
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
            <section className="brand-auth-form-panel">
              <div className="brand-auth-compact-logo">
                <LandingLogo size={26} />
              </div>
              {children}
            </section>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
