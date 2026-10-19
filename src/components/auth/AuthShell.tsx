import type { ReactNode } from 'react'
import { useTheme } from '../common/useTheme'
import BrandAuthShell from './BrandAuthShell'

interface AuthShellProps {
  children: ReactNode
  onBack: () => void
  backLabel?: string
  className?: string
  showThemeToggle?: boolean
}

/** Management sign-in keeps its full-page entry and shared brand presentation. */
export default function AuthShell(props: AuthShellProps) {
  const { theme } = useTheme()
  return <BrandAuthShell {...props} variant="page" context="management" theme={theme} />
}
