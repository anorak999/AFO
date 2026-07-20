import { useState } from "react";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "watching", label: "Folder Watching" },
  { id: "scheduling", label: "Schedules" },
  { id: "about", label: "About" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

export default function SettingsPanel() {
  const [activeSection, setActiveSection] = useState<Section>("general");

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-white/40">
          Application settings and configuration.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeSection === s.id
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {activeSection === "general" && <GeneralSection />}
          {activeSection === "watching" && <WatchingSection />}
          {activeSection === "scheduling" && <SchedulingSection />}
          {activeSection === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

function GeneralSection() {
  return (
    <div className="space-y-6">
      <SectionCard title="Category Mapping">
        <p className="text-xs text-white/40 mb-3">
          File extensions are mapped to category folders during organize-by-extension.
          Default mapping is used unless overridden in <code className="text-afo-purple/80">~/.config/afo/config.json</code>.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ["Images", "jpg, jpeg, png, gif, bmp, svg, webp, heic"],
            ["Documents", "pdf, doc, docx, txt, rtf, odt"],
            ["Audio", "mp3, wav, flac, aac, ogg, m4a"],
            ["Video", "mp4, mkv, avi, mov, wmv, flv"],
            ["Archives", "zip, tar, gz, rar, 7z"],
            ["Code", "rs, py, js, ts, go, c, cpp, h"],
          ].map(([cat, exts]) => (
            <div key={cat} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="font-medium text-white/70">{cat}</span>
              <span className="ml-2 text-white/30">{exts}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Default Options">
        <div className="space-y-3">
          <SettingRow label="Recursive scan depth" value="5 (default)" />
          <SettingRow label="Quarantine auto-delete" value="30 days" />
          <SettingRow label="Watch debounce" value="300ms" />
        </div>
      </SectionCard>
    </div>
  );
}

function WatchingSection() {
  return (
    <div className="space-y-6">
      <SectionCard title="Watched Directories">
        <p className="text-xs text-white/40 mb-3">
          Configure directories for real-time file watching. Files added to watched
          directories will be automatically organized based on your rules.
        </p>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/30">Folder watching coming in Phase 7.</p>
        </div>
      </SectionCard>
    </div>
  );
}

function SchedulingSection() {
  return (
    <div className="space-y-6">
      <SectionCard title="Scheduled Tasks">
        <p className="text-xs text-white/40 mb-3">
          Set up cron-like schedules for automatic organization runs.
        </p>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/30">Scheduling coming in Phase 8.</p>
        </div>
      </SectionCard>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-6">
      <SectionCard title="About AFO">
        <div className="space-y-2 text-sm text-white/50">
          <p>
            <span className="font-medium text-white/70">AFO</span> — Advanced File Organizer
          </p>
          <p>Version 2.0.0 (Tauri Edition)</p>
          <p className="text-xs text-white/30 mt-4">
            Cross-platform desktop file organization. Rule-based sorting,
            duplicate detection, batch rename, and metadata-aware organization.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Data Locations">
        <div className="space-y-1.5 font-mono text-xs text-white/40">
          <p>Config: ~/.config/afo/config.json</p>
          <p>Rules: ~/.config/afo/rules.json</p>
          <p>Journal: ~/.local/share/afo/journal.db</p>
          <p>Quarantine: ~/.local/share/afo/quarantine/</p>
          <p>Logs: ~/.local/share/afo/afo.log</p>
        </div>
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <h3 className="mb-3 text-sm font-semibold text-white/80">{title}</h3>
      {children}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span className="text-sm text-white/60">{label}</span>
      <span className="text-sm text-white/40">{value}</span>
    </div>
  );
}
