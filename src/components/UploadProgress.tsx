// src/components/UploadProgress.tsx
// Progress bar for an in-flight upload — the same bar the Android-APK upload uses, plus a "reconnecting" state
// for a stalled connection and an optional Cancel.
export function UploadProgress({
  progress,
  retrying = false,
  onCancel,
  className = "",
}: {
  progress: number;
  retrying?: boolean;
  onCancel?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Upload progress"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {retrying
            ? "Connection slow — reconnecting. It will pick up where it left off."
            : "Large files take a few minutes — keep this page open until it finishes."}
        </p>
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-shrink-0 text-xs font-medium text-danger">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
