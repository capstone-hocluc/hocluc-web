import { Button } from '../../tailgrids/core/button';
import { useTheme } from '../../common/useTheme';
import { MoonIcon, SunIcon } from './header-icons';

// NextAdmin theme toggle (same markup, backed by the app ThemeProvider).
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      iconOnly
      appearance="outline"
      onPress={toggleTheme}
      aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className="size-10 rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs outline-none focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 [&>svg]:size-auto"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
