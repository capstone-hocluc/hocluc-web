import { Moon, Sun } from '../console/icons'
import { cn } from '../../lib/cn'
import { useTheme } from '../common/useTheme'

interface ThemeToggleProps {
  className?: string
  iconSize?: number
}

function ThemeToggle({ className, iconSize = 17 }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'

  return (
    <button
      type="button"
      className={cn(
        'inline-grid shrink-0 place-items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        className
      )}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      onClick={toggleTheme}
    >
      {isDark ? <Sun size={iconSize} aria-hidden="true" /> : <Moon size={iconSize} aria-hidden="true" />}
    </button>
  )
}

export default ThemeToggle
