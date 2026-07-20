import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  undoAction?: () => void;
}

let toastId = 0;
let addToastFn: ((toast: Omit<Toast, "id">) => void) | null = null;

export function showToast(message: string, type: Toast["type"] = "info", undoAction?: () => void) {
  addToastFn?.({ message, type, undoAction });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${++toastId}`;
    setToasts((prev) => [...prev, { ...toast, id }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-afo-emerald/30 bg-afo-emerald/10 text-afo-emerald"
                : toast.type === "error"
                  ? "border-afo-rose/30 bg-afo-rose/10 text-afo-rose"
                  : "border-white/10 bg-[#0a0a0a] text-white/80"
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.undoAction && (
              <button
                onClick={() => {
                  toast.undoAction?.();
                  removeToast(toast.id);
                }}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
              >
                Undo
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-white/30 hover:text-white/60"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
