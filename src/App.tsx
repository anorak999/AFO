import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "./lib/store";
import Sidebar from "./components/Sidebar";
import OrganizePanel from "./components/OrganizePanel";
import RuleBuilder from "./components/RuleBuilder";
import DuplicatesPanel from "./components/DuplicatesPanel";
import HistoryPanel from "./components/HistoryPanel";
import SettingsPanel from "./components/SettingsPanel";
import CommandPalette from "./components/CommandPalette";
import ToastContainer from "./components/Toast";
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
  const setActivePanel = useAppStore((s) => s.setActivePanel);
  const setDroppedPaths = useAppStore((s) => s.setDroppedPaths);

  const handleFilesDropped = useCallback(
    (paths: string[]) => {
      setDroppedPaths(paths);
      setActivePanel("organize");
    },
    [setDroppedPaths, setActivePanel],
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] text-white">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <ActivePanel />
      </main>
      <DropZone onFilesDropped={handleFilesDropped} />
      <CommandPalette />
      <ToastContainer />
    </div>
  );
}
