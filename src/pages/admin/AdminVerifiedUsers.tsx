// src/pages/admin/AdminVerifiedUsers.tsx
import { useState } from "react";
import { ArrowLeft, Search, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSmartBack } from "../../hooks/useSmartBack";
import { useAdminSearchUsers, type AudienceInput } from "../../hooks/useAdminComms";
import { useSetVerified, useVerifiedAudiencePreview, useBulkSetVerified } from "../../hooks/useVerification";
import { AudiencePicker } from "../../components/admin/AudiencePicker";
import { Avatar } from "../../components/Avatar";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { Button } from "../../components/Button";
import { supabase } from "../../lib/supabase";

// ------------------------------------------------------------
// Individual assignment
// ------------------------------------------------------------
function IndividualVerification() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: results, isFetching } = useAdminSearchUsers(query);
  const setVerified = useSetVerified();

  const { data: selectedProfile, isLoading: loadingSelected } = useQuery({
    queryKey: ["admin-verify-selected-profile", selectedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .eq("id", selectedId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedId,
  });

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2 px-1">
        Individual verification
      </p>
      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId(null);
          }}
          placeholder="Search by username or name…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm"
        />
      </div>

      {!selectedId && (
        <>
          {isFetching && <p className="text-xs text-ink-muted mb-1">Searching…</p>}
          <div className="space-y-1">
            {(results ?? []).map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface text-left text-sm"
              >
                <Avatar src={u.avatar_url} name={u.display_name} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{u.display_name}</span>
                  <span className="block text-xs text-ink-muted truncate">@{u.username}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedId && (
        <div className="bg-surface rounded-xl border border-border p-4 mt-2">
          {loadingSelected || !selectedProfile ? (
            <p className="text-ink-muted text-sm">Loading…</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Avatar src={selectedProfile.avatar_url} name={selectedProfile.display_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink flex items-center gap-1">
                    {selectedProfile.display_name}
                    {selectedProfile.is_verified && <VerifiedBadge />}
                  </p>
                  <p className="text-xs text-ink-muted">@{selectedProfile.username}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={selectedProfile.is_verified ? "secondary" : "primary"}
                  loading={setVerified.isPending}
                  onClick={() =>
                    setVerified.mutate({ userId: selectedProfile.id, verified: !selectedProfile.is_verified })
                  }
                >
                  {selectedProfile.is_verified ? "Remove Verified" : "Assign Verified"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
                  Back to search
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Bulk assignment — reuses the exact same audience taxonomy/UI as
// the notification composer (AudiencePicker), so the population an
// admin sees here is guaranteed to match what they'd reach with a
// notification of the same audience.
// ------------------------------------------------------------
function BulkVerification() {
  const [audience, setAudience] = useState<AudienceInput>({
    audience_type: "all",
    audience_filter: {},
    manual_recipient_ids: [],
  });
  const [result, setResult] = useState<{ verified: boolean; matched: number; already: number; changed: number } | null>(
    null
  );

  const previewEnabled = audience.audience_type !== "manual" || audience.manual_recipient_ids.length > 0;
  const { data: preview, isFetching: previewLoading } = useVerifiedAudiencePreview(audience, previewEnabled);
  const bulkSet = useBulkSetVerified();

  async function handleBulk(verified: boolean) {
    if (!preview || preview.matched === 0) return;
    const confirmMsg = verified
      ? `Assign Verified to ${preview.will_newly_verify} of ${preview.matched} matching users?`
      : `Remove Verified from ${preview.currently_verified} of ${preview.matched} matching users?`;
    if (!confirm(confirmMsg)) return;

    const res = await bulkSet.mutateAsync({ audience, verified });
    setResult({ verified, matched: res.matched, already: res.already_matching, changed: res.changed });
  }

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2 px-1">
        Bulk verification
      </p>
      <div className="bg-surface rounded-xl border border-border p-4">
        <AudiencePicker value={audience} onChange={(v) => { setAudience(v); setResult(null); }} />

        <div className="mt-3 pt-3 border-t border-border text-sm">
          {previewLoading ? (
            <p className="text-ink-muted">Checking verification status…</p>
          ) : preview ? (
            <div className="space-y-0.5 text-ink-muted">
              <p>
                Matching users: <span className="text-ink font-medium">{preview.matched}</span>
              </p>
              <p>
                Currently verified: <span className="text-ink font-medium">{preview.currently_verified}</span>
              </p>
              <p>
                Will newly verify: <span className="text-ink font-medium">{preview.will_newly_verify}</span>
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            loading={bulkSet.isPending}
            disabled={!preview || preview.will_newly_verify === 0}
            onClick={() => void handleBulk(true)}
          >
            Assign Verified
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={bulkSet.isPending}
            disabled={!preview || preview.currently_verified === 0}
            onClick={() => void handleBulk(false)}
          >
            Remove Verified
          </Button>
        </div>

        {result && (
          <p className="text-xs text-ink-muted mt-3">
            {result.verified ? "Verification completed. " : "Removal completed. "}
            {result.changed} changed, {result.already} already matched the target state, out of {result.matched}{" "}
            selected.
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminVerifiedUsers() {
  const smartBack = useSmartBack();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink flex items-center gap-1.5">
            <BadgeCheck size={20} className="text-accent" /> Verified users
          </h2>
        </div>
        <p className="text-sm text-ink-muted mb-6">
          Verified is a public identity badge, separate from account approval, KYC, and founding status.
        </p>

        <div className="space-y-6">
          <IndividualVerification />
          <BulkVerification />
        </div>
      </div>
    </div>
  );
}
