import { Upload, FolderSearch } from "lucide-react";

export default function QuickStartStep() {
  return (
    <div>
      <h2
        className="mb-2 text-xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        Quick Start
      </h2>

      <p
        className="mb-6 text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        Two ways to get started:
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Option 1: Drag & Drop */}
        <div
          className="flex flex-col items-center rounded-xl p-5 text-center transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: "var(--accent-soft)" }}
          >
            <Upload
              size={24}
              style={{ color: "var(--accent)" }}
              strokeWidth={1.5}
            />
          </div>
          <h3
            className="mb-1 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Drag & Drop
          </h3>
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            Drop files anywhere on the app
          </p>
        </div>

        {/* Option 2: Pick Folder */}
        <div
          className="flex flex-col items-center rounded-xl p-5 text-center transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: "var(--accent-soft)" }}
          >
            <FolderSearch
              size={24}
              style={{ color: "var(--accent)" }}
              strokeWidth={1.5}
            />
          </div>
          <h3
            className="mb-1 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Pick a Folder
          </h3>
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            Browse and select a folder to organize
          </p>
        </div>
      </div>
    </div>
  );
}