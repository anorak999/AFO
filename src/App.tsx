import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "./lib/store";
import Sidebar from "./components/Sidebar";
import OrganizePanel from "./components/OrganizePanel";
import RuleBuilder from "./components/RuleBuilder";
import DuplicatesPanel from "./components/DuplicatesPanel";
import HistoryPanel from "./components/HistoryPanel";
import SettingsPanel from "./components/SettingsPanel";
import CommandPalette from "./components/CommandPalette";

const panels = {
  organize: OrganizePanel,
  rules: RuleBuilder,
  duplicates: DuplicatesPanel,
  history: HistoryPanel,
  settings: SettingsPanel,
} as const;

function ActivePanel() {
  const activePanel = useAppStore((s) => s.activePanel);
  const Panel = panels[activePanel];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activePanel}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="h-full"
      >
        <Panel />
      </motion.div>
    </AnimatePresence>
  );
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
