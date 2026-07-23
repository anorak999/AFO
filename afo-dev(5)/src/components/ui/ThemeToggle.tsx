import './ThemeToggle.css';
import { useTheme } from '../../lib/ThemeProvider';

/**
 * Theme-specific toggle for Settings > General > Appearance ONLY.
 * This intentionally does NOT reuse src/components/ui/Toggle.tsx —
 * it's a distinct visual (sun/moon gradient slide) reserved for this
 * one control. Every other on/off setting in the app should keep
 * using <Toggle>.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <input
      type="checkbox"
      className="theme-checkbox"
      checked={theme === 'dark'}
      onChange={toggleTheme}
      aria-label="Switch between light and dark theme"
    />
  );
}
