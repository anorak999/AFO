import { create } from "zustand";

export type Panel = "organize" | "rules" | "duplicates" | "history" | "settings";

interface AppStore {
  activePanel: Panel;
  setActivePanel: (panel: Panel) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activePanel: "organize",
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
