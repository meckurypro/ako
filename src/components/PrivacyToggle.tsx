// src/components/PrivacyToggle.tsx
import { EyeOff } from "lucide-react";

interface PrivacyToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// Same switch visual as Settings.tsx's ToggleRow (not shared directly
// since that one lives local to the Settings page) — used on both
// CreateProject and EditProject so a host can set this before saving,
// or flip it later without touching anything else about the project.
export function PrivacyToggle({ checked, onChange }: PrivacyToggleProps) {
  return (
    <div className="bg-surface rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <EyeOff size={18} className="text-ink-muted shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink">Private project</p>
            <p className="text-xs text-ink-muted">
              Not listed on your profile or shown anywhere else — only people with the link can open it.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          aria-pressed={checked}
          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden ${
            checked ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-canvas transition-[left] ${
              checked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
