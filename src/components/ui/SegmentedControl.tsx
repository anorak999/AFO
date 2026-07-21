import { motion } from "framer-motion";

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
}

export default function SegmentedControl({
  options,
  value,
  onChange,
  size = "md",
}: SegmentedControlProps) {
  const padding = size === "sm" ? "p-0.5" : "p-1";
  const text = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={`inline-flex items-center rounded-lg ${padding}`}
      style={{ backgroundColor: "var(--segment-bg)" }}
    >
      {options.map((opt) => {
        const isActive = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`relative rounded-md px-3 py-1.5 font-medium transition-colors ${text} ${
              isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="segmented-active"
                className="absolute inset-0 rounded-md"
                style={{
                  backgroundColor: "var(--segment-active-bg)",
                  boxShadow: "var(--segment-active-shadow)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
