import { Inbox, ArrowRight, CheckCircle2 } from "lucide-react";

const steps = [
  { icon: Inbox, label: "Files in" },
  { icon: ArrowRight, label: "AFO sorts" },
  { icon: CheckCircle2, label: "Undo anytime" },
];

export default function HowItWorksStep() {
  return (
    <div>
      <h2
        className="mb-2 text-xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        How It Works
      </h2>

      <p
        className="mb-8 text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        Simple, safe, and reversible:
      </p>

      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isArrow = i < steps.length - 1;
          return (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: "var(--accent-soft)",
                  }}
                >
                  <Icon
                    size={28}
                    style={{ color: "var(--accent)" }}
                    strokeWidth={1.5}
                  />
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {step.label}
                </span>
              </div>
              {isArrow && (
                <ArrowRight
                  size={16}
                  className="mx-4 mb-6"
                  style={{ color: "var(--text-tertiary)" }}
                  strokeWidth={1.5}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}