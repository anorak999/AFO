/**
 * Merge this into your existing tailwind.config.js.
 * darkMode MUST be 'class' so ThemeProvider's `.dark` toggle on <html> works.
 */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        sidebar: 'var(--color-sidebar)',
        card: 'var(--color-card)',
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          dim: 'var(--color-text-dim)',
          faint: 'var(--color-text-faint)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'var(--color-accent-soft)',
          contrast: 'var(--color-accent-contrast)',
        },
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        icon: {
          organize: 'var(--icon-organize)',
          rules: 'var(--icon-rules)',
          duplicates: 'var(--icon-duplicates)',
          history: 'var(--icon-history)',
          settings: 'var(--icon-settings)',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        popover: 'var(--shadow-popover)',
      },
      borderRadius: {
        card: '12px',
        pill: '8px',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif',
        ],
      },
    },
  },
};
