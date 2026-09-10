// src/components/admin/ToggleSwitch.tsx
// Same switch visual as PrivacyToggle/Settings.tsx's ToggleRow, pulled
// out standalone (no label/description baked in) so admin pages can
// drop it next to arbitrary row content — project types, moderation,
// anything else that's just an on/off.
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden disabled:opacity-50 ${
        checked ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-canvas transition-[left] ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
