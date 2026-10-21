// src/components/WebsiteUrlsField.tsx
//
// Website inputs for Settings → Profile. Everyone gets one; verified,
// unrestricted accounts can add up to MAX_WEBSITES. The database enforces the
// same rule (see supabase/ako_profile_website_urls.sql) — this only decides
// what to show, so a bypassed UI still can't save extras.
import { BadgeCheck, Plus, X } from "lucide-react";
import { FormField } from "./FormField";

export const MAX_WEBSITES = 3;

interface WebsiteUrlsFieldProps {
  values: string[];
  onChange: (values: string[]) => void;
  /** Verified AND unrestricted — may use more than one website. */
  canAddMore: boolean;
  /** Show the "verified accounts can add up to 3" hint (unverified, unrestricted accounts). */
  showVerifiedHint?: boolean;
}

export function WebsiteUrlsField({ values, onChange, canAddMore, showVerifiedHint }: WebsiteUrlsFieldProps) {
  const rows = values.length > 0 ? values : [""];
  const max = canAddMore ? MAX_WEBSITES : 1;

  return (
    <div>
      {rows.slice(0, max).map((value, i) => (
        <div key={i} className="relative">
          <FormField
            id={`website_url_${i}`}
            label={i === 0 ? "Website" : `Website ${i + 1}`}
            type="url"
            value={value}
            onChange={(e) => onChange(rows.map((r, j) => (j === i ? e.target.value : r)))}
            placeholder="https://"
          />
          {i > 0 && (
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              aria-label={`Remove website ${i + 1}`}
              title="Remove"
              className="absolute right-0 -top-1.5 w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-ink/5 active:bg-ink/10"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}

      {canAddMore && rows.length < MAX_WEBSITES && (
        <button
          type="button"
          onClick={() => onChange([...rows, ""])}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent mb-6 -mt-2"
        >
          <Plus size={16} />
          Add another website
          <span className="text-ink-muted font-normal">
            ({rows.length}/{MAX_WEBSITES})
          </span>
        </button>
      )}

      {showVerifiedHint && !canAddMore && (
        <p className="flex items-center gap-1.5 text-xs text-ink-muted mb-6 -mt-3">
          <BadgeCheck size={14} className="shrink-0" />
          Verified accounts can add up to {MAX_WEBSITES} websites.
        </p>
      )}
    </div>
  );
}
