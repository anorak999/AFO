import { FolderOpen, GitBranch, Copy, Radio } from "lucide-react";

const features = [
  {
    icon: FolderOpen,
    title: "Organize",
    description: "Sort files by type, date, or custom patterns",
  },
  {
    icon: GitBranch,
    title: "Rule Builder",
    description: "Create visual rules to automate organization",
  },
  {
    icon: Copy,
    title: "Duplicates",
    description: "Find and remove duplicate files safely",
  },
  {
    icon: Radio,
    title: "Live Capture",
    description: "Watch folders and auto-sort new files",
  },
];

export default function FeaturesStep() {
  return (
    <div>
      <h2
        className="mb-2 text-xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        Core Features
      </h2>

      <p
        className="mb-6 text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        Everything you need to stay organized:
      </p>

      <div className="space-y-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex items-center gap-4 rounded-xl p-3"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: "var(--accent-soft)" }}
              >
                <Icon
                  size={20}
                  style={{ color: "var(--accent)" }}
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}