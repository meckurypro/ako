// src/components/PagePermissionsEditor.tsx
// Checklist of what a (non-admin) team member may do as the page. Used
// when inviting someone and when editing an existing member — see
// lib/pagePermissions for the keys and what the server enforces.
import { PAGE_PERMISSION_META, type PagePermissionKey, type PagePermissions } from "../lib/pagePermissions";

interface Props {
  value: PagePermissions;
  onChange: (next: PagePermissions) => void;
  disabled?: boolean;
}

export function PagePermissionsEditor({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2.5">
      {PAGE_PERMISSION_META.map(({ key, label, description }) => (
        <label key={key} className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={value[key]}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, [key as PagePermissionKey]: e.target.checked })}
            className="mt-0.5 rounded"
          />
          <span className="min-w-0">
            <span className="block text-sm text-ink">{label}</span>
            <span className="block text-xs text-ink-muted">{description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
