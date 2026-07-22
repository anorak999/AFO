import { useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "./lib/store";
import { ThemeProvider } from "./lib/ThemeProvider";
import Sidebar from "./components/Sidebar";
import OrganizePanel from "./components/OrganizePanel";
import RuleBuilder from "./components/RuleBuilder";
import DuplicatesPanel from "./components/DuplicatesPanel";
import HistoryPanel from "./components/HistoryPanel";
import SettingsPanel from "./components/SettingsPanel";
import CommandPalette from "./components/CommandPalette";
import ToastContainer, { showToast } from "./components/Toast";
import DropZone from "./components/DropZone";

const panels = {
  organize: OrganizePanel,
  rules: RuleBuilder,
  duplicates: DuplicatesPanel,
  history: HistoryPanel,
  settings: SettingsPanel,
} as const;

function ActivePanel() {
  const activePanel = useAppStore((s) => s.activePanel);

  return (
    <div className="relative h-full">
      {(Object.keys(panels) as (keyof typeof panels)[]).map((id) => {
        const Panel = panels[id];
        return (
          <div
            key={id}
            className="absolute inset-0 h-full overflow-y-auto"
            style={{ display: activePanel === id ? "block" : "none" }}
          >
            <Panel />
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const setActivePanel = useAppStore((s) => s.setActivePanel);
  const setDroppedPaths = useAppStore((s) => s.setDroppedPaths);

  const handleFilesDropped = useCallback(
    (paths: string[]) => {
      setDroppedPaths(paths);
      setActivePanel("organize");
    },
    [setDroppedPaths, setActivePanel],
  );

  useEffect(() => {
    const unlisten = listen<{ type: string; source: string; destination?: string; rule?: string }>(
      "afo://activity",
      (event) => {
        const { type, source, destination, rule } = event.payload;
        const filename = source.split(/[\\/]/).pop() || source;
        if (type === "move" && destination) {
          const destName = destination.split(/[\\/]/).pop() || destination;
          showToast(`Moved "${filename}" → "${destName}"${rule ? ` by rule "${rule}"` : ""}`, "success");
        } else {
          showToast(`${type}: ${filename}`, "info");
        }
      },
    );
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-app)", color: "var(--text-primary)" }}>
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <ActivePanel />
        </main>
        <DropZone onFilesDropped={handleFilesDropped} />
        <CommandPalette />
        <ToastContainer />
      </div>
    </ThemeProvider>
  );
}
