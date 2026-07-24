import { Sparkles } from "lucide-react";

export default function ReadyStep() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Celebration Icon */}
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "var(--accent-soft)" }}
      >
        <Sparkles
          size={40}
          style={{ color: "var(--accent)" }}
          strokeWidth={1.5}
        />
      </div>

      <h2
        className="mb-3 text-2xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        You're Ready!
      </h2>

      <p
        className="max-w-sm text-base leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        Start organizing your files. You can always re-open this tutorial from
        Settings if you need a refresher.
      </p>
    </div>
  );
}