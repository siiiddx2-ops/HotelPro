import { createContext, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast { id: number; kind: ToastKind; message: string }

const ToastContext = createContext<{
  push: (message: string, kind?: ToastKind) => void;
} | undefined>(undefined);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function push(message: string, kind: ToastKind = "info") {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slide-in flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-card border border-ink-100"
          >
            {t.kind === "success" && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
            {t.kind === "error" && <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
            {t.kind === "info" && <Info className="h-5 w-5 text-primary-600 shrink-0" />}
            <p className="text-sm text-ink-800 flex-1">{t.message}</p>
            <button
              onClick={() => setToasts((x) => x.filter((x) => x.id !== t.id))}
              className="text-ink-400 hover:text-ink-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
