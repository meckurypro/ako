// src/components/Toast.tsx
//
// Minimal global toast system. Nothing like this existed anywhere in
// the app before — every failure either surfaced as inline red text
// buried in a form (Compose's moderation-rejection message) or not at
// all (a silently-swallowed reaction failure — see useToggleReaction).
// This gives any part of the app a one-line `toast("message")` call
// that shows up the same way everywhere: bottom-anchored, stacked,
// auto-dismissing, above everything including modals.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { Portal } from "./Portal";

type ToastVariant = "default" | "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastOptions {
  variant?: ToastVariant;
  /** ms before auto-dismiss. Default 3200 — long enough to read a short
   *  sentence, short enough not to pile up if several fire in a row. */
  duration?: number;
}

type ToastFn = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ToastFn | null>(null);

const ICON_FOR: Record<ToastVariant, ReactNode> = {
  default: <Info size={18} className="text-ink-muted shrink-0" />,
  success: <CheckCircle2 size={18} className="text-accent shrink-0" />,
  error: <XCircle size={18} className="text-danger shrink-0" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback<ToastFn>((message, options) => {
    const id = nextId.current++;
    const variant = options?.variant ?? "default";
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, options?.duration ?? 3200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Portal>
        {/* pb-24 clears the bottom nav + reaction tray on every page that
            has one; z-[70] sits above modal overlays (z-50) and the
            three-dot menu (z-50) so a toast fired from inside either is
            never hidden behind its own backdrop. */}
        <div className="fixed bottom-0 left-0 right-0 z-[70] pb-24 px-4 flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto max-w-sm w-full flex items-start gap-2.5 bg-ink text-canvas text-sm rounded-2xl shadow-lg px-4 py-3 animate-[toast-in_180ms_ease-out]"
            >
              {ICON_FOR[t.variant]}
              <span className="leading-snug">{t.message}</span>
            </div>
          ))}
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}

/** Fire a toast from anywhere: `const toast = useToast(); toast("Saved.")`. */
export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
