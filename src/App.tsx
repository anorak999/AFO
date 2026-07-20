import { useAppStore } from "./lib/store";
import Sidebar from "./components/Sidebar";
import OrganizePanel from "./components/OrganizePanel";
import RuleBuilder from "./components/RuleBuilder";
import DuplicatesPanel from "./components/DuplicatesPanel";
import HistoryPanel from "./components/HistoryPanel";
import SettingsPanel from "./components/SettingsPanel";
import CommandPalette from "./components/CommandPalette";

function ActivePanel() {
  const activePanel = useAppStore((s) => s.activePanel);

  switch (activePanel) {
    case "organize":
      return <OrganizePanel />;
    case "rules":
      return <RuleBuilder />;
    case "duplicates":
      return <DuplicatesPanel />;
    case "history":
      return <HistoryPanel />;
    case "settings":
      return <SettingsPanel />;
  }
}

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <ActivePanel />
      </main>
      <CommandPalette />
    </div>
  );
}
