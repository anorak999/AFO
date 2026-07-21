import type { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  primary: "color: var(--text-inverse); background: var(--accent);",
  secondary: "color: var(--text-primary); background: var(--bg-inset); border: 1px solid var(--border-default);",
  danger: "color: white; background: var(--danger);",
};

const hoverStyles: Record<string, string> = {
  primary: "background: var(--accent-hover);",
  secondary: "background: var(--bg-card-hover);",
  danger: "background: #e6352b;",
};

export default function Button({
  variant = "primary",
  disabled,
  className = "",
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}`}
      style={{
        ...(variantStyles[variant] ? parseStyle(variantStyles[variant]) : {}),
        ...(!disabled && variantStyles[variant] ? { ["--hover" as string]: hoverStyles[variant] } : {}),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && hoverStyles[variant]) {
          Object.assign(e.currentTarget.style, parseStyle(hoverStyles[variant]));
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!disabled && variantStyles[variant]) {
          Object.assign(e.currentTarget.style, parseStyle(variantStyles[variant]));
        }
        props.onMouseLeave?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function parseStyle(s: string): Record<string, string> {
  const obj: Record<string, string> = {};
  s.split(";").forEach((rule) => {
    const [k, v] = rule.split(":").map((x) => x.trim());
    if (k && v) obj[k] = v;
  });
  return obj;
}
