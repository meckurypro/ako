// src/components/admin/AudiencePicker.tsx
//
// Shared audience selector for email campaigns and the notification
// blast composer. Four modes:
//   - all             every active profile
//   - tier             one account tier (newcomer/contributor/…)
//   - page_followers    followers of one organisation/brand page
//   - manual            individually searched-and-marked users
//
// Shows a live "reaches ~N people" preview via useAudiencePreview so
// the admin isn't sending blind.
import { useState } from "react";
import { Search, X } from "lucide-react";
import {
  useAdminSearchUsers,
  useAdminListPages,
  useAudiencePreview,
  type AudienceInput,
  type AudienceType,
} from "../../hooks/useAdminComms";
import { Avatar } from "../Avatar";

const TIERS: { value: string; label: string }[] = [
  { value: "newcomer", label: "Newcomer" },
  { value: "contributor", label: "Contributor" },
  { value: "publisher", label: "Publisher" },
  { value: "host", label: "Host" },
  { value: "creator_business", label: "Creator business" },
];

const MODES: { value: AudienceType; label: string }[] = [
  { value: "all", label: "All users" },
  { value: "tier", label: "By account type" },
  { value: "page_followers", label: "An organisation's followers" },
  { value: "manual", label: "Manually selected" },
];

interface Props {
  value: AudienceInput;
  onChange: (value: AudienceInput) => void;
}

export function AudiencePicker({ value, onChange }: Props) {
  const [userQuery, setUserQuery] = useState("");
  const [pageQuery, setPageQuery] = useState("");
  const [manualLabels, setManualLabels] = useState<Record<string, string>>({});

  const { data: userResults, isFetching: searchingUsers } = useAdminSearchUsers(userQuery);
  const { data: pageResults } = useAdminListPages(pageQuery);
  const { data: preview, isFetching: previewLoading } = useAudiencePreview(
    value,
    value.audience_type !== "manual" || value.manual_recipient_ids.length > 0
  );

  function setMode(audience_type: AudienceType) {
    onChange({ audience_type, audience_filter: {}, manual_recipient_ids: [] });
  }

  function toggleManualUser(id: string, label: string) {
    const already = value.manual_recipient_ids.includes(id);
    const next = already
      ? value.manual_recipient_ids.filter((existing) => existing !== id)
      : [...value.manual_recipient_ids, id];
    if (!already) setManualLabels((prev) => ({ ...prev, [id]: label }));
    onChange({ ...value, manual_recipient_ids: next });
  }

  const selectedPage = pageResults?.find((p) => p.id === value.audience_filter.page_id);

  return (
    <div>
      <label className="block text-sm font-medium text-ink-muted mb-1.5">Audience</label>

      <div className="flex flex-wrap gap-2 mb-3">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => setMode(mode.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              value.audience_type === mode.value
                ? "bg-accent text-canvas border-accent"
                : "bg-surface text-ink-muted border-border"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {value.audience_type === "tier" && (
        <div className="flex flex-wrap gap-2 mb-3">
          {TIERS.map((tier) => (
            <button
              key={tier.value}
              type="button"
              onClick={() => onChange({ ...value, audience_filter: { tier: tier.value } })}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                value.audience_filter.tier === tier.value
                  ? "bg-accent-soft text-accent border-accent"
                  : "bg-surface text-ink-muted border-border"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      )}

      {value.audience_type === "page_followers" && (
        <div className="mb-3">
          <div className="relative mb-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={pageQuery}
              onChange={(e) => setPageQuery(e.target.value)}
              placeholder="Search organisations/brand pages…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-canvas text-ink text-sm"
            />
          </div>
          {selectedPage && (
            <p className="text-sm text-ink mb-2">
              Selected: <span className="font-medium">{selectedPage.name}</span> (
              {selectedPage.follower_count} followers)
            </p>
          )}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {(pageResults ?? []).map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => onChange({ ...value, audience_filter: { page_id: page.id } })}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${
                  value.audience_filter.page_id === page.id ? "bg-accent-soft" : "bg-surface"
                }`}
              >
                <Avatar src={page.avatar_url} name={page.name} size="sm" />
                <span className="flex-1 min-w-0 truncate">{page.name}</span>
                <span className="text-ink-muted text-xs flex-shrink-0">{page.follower_count} followers</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {value.audience_type === "manual" && (
        <div className="mb-3">
          <div className="relative mb-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search by username or name…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-canvas text-ink text-sm"
            />
          </div>

          {value.manual_recipient_ids.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {value.manual_recipient_ids.map((id) => (
                <span
                  key={id}
                  className="flex items-center gap-1 bg-accent-soft text-accent text-xs font-medium px-2 py-1 rounded-full"
                >
                  {manualLabels[id] ?? id}
                  <button type="button" onClick={() => toggleManualUser(id, manualLabels[id] ?? id)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {searchingUsers && <p className="text-xs text-ink-muted mb-1">Searching…</p>}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {(userResults ?? []).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleManualUser(u.id, u.display_name)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${
                  value.manual_recipient_ids.includes(u.id) ? "bg-accent-soft" : "bg-surface"
                }`}
              >
                <Avatar src={u.avatar_url} name={u.display_name} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{u.display_name}</span>
                  <span className="block text-xs text-ink-muted truncate">@{u.username}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-ink-muted">
        {previewLoading
          ? "Estimating reach…"
          : preview
            ? `Reaches ${preview.count.toLocaleString()} ${preview.count === 1 ? "person" : "people"}.`
            : "Reaches 0 people."}
      </p>
    </div>
  );
}
