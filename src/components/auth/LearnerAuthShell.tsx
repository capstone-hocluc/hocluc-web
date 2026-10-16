import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from '../console/icons'
import LandingLogo from '../landing-page/LandingLogo'
import '../../styles/auth/learner-auth.css'

interface LearnerAuthShellProps {
  children: ReactNode
  onBack: () => void
  className?: string
}

export default function LearnerAuthShell({
  children,
  onBack,
  className = '',
}: LearnerAuthShellProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onBack()}>
      <Dialog.Portal>
        <Dialog.Overlay className="hl-learner-auth learner-auth-overlay">
          <Dialog.Content
            className={`learner-auth-card ${className}`}
            aria-describedby={undefined}
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
            <Dialog.Title className="learner-auth-sr-only">Tài khoản Học Lực</Dialog.Title>
            <Dialog.Close className="learner-auth-close" aria-label="Đóng">
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
            <aside className="learner-auth-story" aria-label="Học cùng Học Lực">
              <div className="learner-auth-logo">
                <LandingLogo size={30} />
              </div>
              <div className="learner-auth-story-copy">
                <h2>
                  Mỗi ngày một chút.
                  <br />
                  <span>Tiến xa một bước.</span>
                </h2>
                <p>Hiểu điều mình cần học, luyện từng chút và tự tin hơn mỗi ngày.</p>
              </div>
              <img
                className="learner-auth-art"
                src="/landing-v2/assets/hero-mai-nam-learning.webp"
                alt="Mai và Nam cùng học, trao đổi cách giải bài"
                width={1672}
                height={940}
              />
              <p className="learner-auth-story-note">Cùng bạn trên hành trình chinh phục V-ACT.</p>
            </aside>
            <section className="learner-auth-form-panel">
              <div className="learner-auth-compact-logo">
                <LandingLogo size={28} />
              </div>
              {children}
            </section>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
