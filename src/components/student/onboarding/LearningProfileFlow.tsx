import { useState, type ReactNode } from 'react'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { LearningProfileDialogContext } from '../../../hooks/useLearningProfileDialog'
import StudentOnboarding from '../StudentOnboarding'
import Button from '../../ui/Button'

export default function LearningProfileFlow({ currentPath, onNavigate, children }: {
  currentPath: string
  onNavigate: (path: string) => void
  children: ReactNode
}) {
  const { profile } = useCurrentUser()
  const [manualOpen, setManualOpen] = useState(false)
  const [dismissedUser, setDismissedUser] = useState<string | null>(null)
  const [restoreFocus, setRestoreFocus] = useState<HTMLElement | null>(null)
  const state = profile?.onboardingState
  const student = profile?.role === 'STUDENT'
  const autoOpen = student && state === 'NOT_SHOWN' && dismissedUser !== profile.id &&
    (currentPath === '/student/dashboard' || currentPath === '/student/assessments/placement')
  const open = () => {
    setRestoreFocus(document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setManualOpen(true)
  }
  const close = () => {
    setDismissedUser(profile?.id ?? null)
    setManualOpen(false)
  }
  return (
    <LearningProfileDialogContext.Provider value={open}>
      {student && state === 'DEFERRED' && currentPath === '/student/dashboard' && (
        <section aria-label="Nhắc hoàn tất hồ sơ học tập" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line-brand bg-surface-brand p-4">
          <div><h2 className="font-bold text-text-heading">Hoàn tất hồ sơ học tập</h2><p className="text-sm text-text-body">Tiếp tục từ bản nháp để cá nhân hóa mục tiêu của bạn.</p></div>
          <Button appearance="outline" onClick={open}>Hoàn tất hồ sơ học tập</Button>
        </section>
      )}
      {children}
      {student && (manualOpen || autoOpen) && (
        <StudentOnboarding key={profile.id} restoreFocus={restoreFocus} onClose={close} onComplete={() => { close(); onNavigate('/student/assessments/placement') }} />
      )}
    </LearningProfileDialogContext.Provider>
  )
}
