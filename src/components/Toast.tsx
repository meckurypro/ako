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
import { CheckCircle2, XCircle, Info, Loader2 } from "lucide-react";
import { Portal } from "./Portal";

type ToastVariant = "default" | "success" | "error" | "loading";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastOptions {
  variant?: ToastVariant;
  /** ms before auto-dismiss. Fixed at 2000 for every toast in the
   *  app — no toast should ever overstay two seconds, so this isn't
   *  meant to be overridden per-call; kept as an option only so a
   *  call site could shorten it further if it ever needed to. */
  duration?: number;
}

/** Returned by every toast call: lets a "loading" toast be replaced by the real outcome the moment it is known. */
export interface ToastHandle {
  dismiss: () => void;
}

type ToastFn = (message: string, options?: ToastOptions) => ToastHandle;

const ToastContext = createContext<ToastFn | null>(null);

const DEFAULT_DURATION_MS = 2000;
// A loading toast stays until whoever raised it dismisses it; this is only the safety net so a forgotten one can't
// stay on screen forever.
const LOADING_MAX_MS = 30000;

const ICON_FOR: Record<ToastVariant, ReactNode> = {
  default: <Info size={18} className="text-ink-muted shrink-0" />,
  success: <CheckCircle2 size={18} className="text-accent shrink-0" />,
  error: <XCircle size={18} className="text-danger shrink-0" />,
  loading: <Loader2 size={18} className="text-accent shrink-0 animate-spin" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback<ToastFn>((message, options) => {
    const id = nextId.current++;
    const variant = options?.variant ?? "default";
    setToasts((prev) => [...prev, { id, message, variant }]);
    const timer = window.setTimeout(
      () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
      options?.duration ?? (variant === "loading" ? LOADING_MAX_MS : DEFAULT_DURATION_MS)
    );
    return {
      dismiss: () => {
        window.clearTimeout(timer);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
    };
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
              className="pointer-events-auto max-w-sm w-full flex items-start gap-2.5 bg-surface text-ink border border-border text-sm rounded-2xl shadow-lg px-4 py-3 animate-[toast-in_180ms_ease-out]"
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
