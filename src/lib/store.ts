import { create } from "zustand";

export type Panel = "organize" | "rules" | "duplicates" | "storage" | "history" | "settings" | "capture" | "tutorial";

interface AppStore {
  activePanel: Panel;
  setActivePanel: (panel: Panel) => void;
  droppedPaths: string[];
  setDroppedPaths: (paths: string[]) => void;
  clearDroppedPaths: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activePanel: "organize",
  setActivePanel: (panel) => set({ activePanel: panel }),
  droppedPaths: [],
  setDroppedPaths: (paths) => set({ droppedPaths: paths }),
  clearDroppedPaths: () => set({ droppedPaths: [] }),
}));
