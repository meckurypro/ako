// src/components/ErrorBanner.tsx
//
// The inline way to say "that didn't work" inside a form or settings section — the counterpart to the toast
// (useErrorNotice) for failures that belong next to the thing that failed. Replaces bare red lines of text.
//
//   <ErrorBanner error={saveError} fallback="Couldn't save changes." onRetry={handleSave} onDismiss={() => setSaveError(null)} />
//
// Pass the raw thrown value (or a plain sentence you wrote): it is run through classifyError, so HTTP codes, SQL and
// ids never reach the screen, and the icon, heading and "Try again" follow the kind of failure. A timeout reads as
// "taking too long", not "offline". Renders nothing when `error` is empty.
import { AlertTriangle, Clock, Lock, RefreshCw, WifiOff, X, type LucideIcon } from "lucide-react";

import { classifyError, type ErrorKind } from "../lib/friendlyError";

const ICONS: Partial<Record<ErrorKind, LucideIcon>> = {
  network: WifiOff,
  timeout: Clock,
  session: Lock,
  permission: Lock,
};

export interface ErrorBannerProps {
  /** The thrown value, a message string, or null/undefined for "no error". */
  error: unknown;
  /** Wording for "we don't know what happened". */
  fallback: string;
  /** Shows a "Try again" button — only when the failure is one a retry can fix. */
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({ error, fallback, onRetry, onDismiss, className = "mb-4" }: ErrorBannerProps) {
  if (error === null || error === undefined || error === false || error === "") return null;
  const e = classifyError(error, fallback);
  const IconComponent = ICONS[e.kind] ?? AlertTriangle;
  const showRetry = Boolean(onRetry) && e.retryable;

  return (
    <div role="alert" aria-live="polite" className={`rounded-xl border border-danger/20 bg-danger/10 p-3.5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-danger/15">
          <IconComponent size={16} className="text-danger" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5 text-left">
          {e.title ? <p className="mb-0.5 text-sm font-medium text-ink">{e.title}</p> : null}
          <p className="text-sm text-ink-muted">{e.message}</p>
          {showRetry ? (
            <button type="button" onClick={onRetry} className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline">
              <RefreshCw size={14} aria-hidden="true" />
              Try again
            </button>
          ) : null}
        </div>
        {onDismiss ? (
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="flex-shrink-0 pt-0.5 text-ink-muted hover:text-ink">
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
