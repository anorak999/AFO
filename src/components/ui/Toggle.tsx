import { motion } from "framer-motion";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export default function Toggle({ checked, onChange, disabled, size = "md" }: ToggleProps) {
  const w = size === "sm" ? 36 : 44;
  const h = size === "sm" ? 20 : 26;
  const knob = size === "sm" ? 16 : 22;
  const pad = size === "sm" ? 2 : 2;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      style={{
        width: w,
        height: h,
        backgroundColor: checked ? "var(--toggle-on-bg)" : "var(--toggle-off-bg)",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <motion.div
        className="absolute rounded-full"
        style={{
          width: knob,
          height: knob,
          backgroundColor: checked ? "var(--toggle-on-knob)" : "var(--toggle-off-knob)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
        animate={{
          x: checked ? w - knob - pad : pad,
          y: pad,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
