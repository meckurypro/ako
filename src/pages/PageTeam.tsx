// src/pages/PageTeam.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, Search, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSearchPeople } from "../hooks/useSearch";
import { Avatar } from "../components/Avatar";
import {
  usePageByUsername,
  usePageMembers,
  useInvitePageMember,
  useRemovePageMember,
  usePageRoleLabelSuggestions,
} from "../hooks/usePages";
import type { ProfileWithRoles } from "../types/database";

// /page/:username/team — admin view: active roster + pending invites,
// invite-by-username form, remove/leave. Reachable from the gear icon
// on PagePage (only shown there to admins); RLS/the RPCs enforce the
// same admin-only rules server-side regardless of what this page shows.
export function PageTeam() {
  const { username } = useParams<{ username: string }>();
  const smartBack = useSmartBack();
  const { user } = useAuth();

  const { data: page } = usePageByUsername(username!);
  const { data: members } = usePageMembers(page?.id ?? "");
  const invite = useInvitePageMember();
  const remove = useRemovePageMember();

  // Smart search-as-you-type replaces the old "type the exact username,
  // look it up on submit" flow. `selectedUser` is who's about to be
  // invited — set by tapping a result row, cleared on X or after a
  // successful invite. Query and selection are separate so picking a
  // result can blank the input without immediately re-triggering search.
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<ProfileWithRoles | null>(null);
  const [inviteRole, setInviteRole] = useState("");
  // Separate from `inviteRole.trim().length > 0` — tracks whether the
  // list should be showing at all right now, so it can be dismissed
  // (on picking a suggestion, or on blur) without clearing what was
  // typed, and reopened on refocus/further typing.
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: searchResults, isLoading: searching } = useSearchPeople(query);
  const { data: roleSuggestions } = usePageRoleLabelSuggestions(inviteRole);

  const myMembership = members?.find((m) => m.user_id === user?.id && m.status === "active");
  const isAdmin = !!myMembership?.is_admin;

  const active = (members ?? []).filter((m) => m.status === "active");
  const pending = (members ?? []).filter((m) => m.status === "invited");

  // Already on the team (active or pending) shouldn't show up as an
  // invite target again.
  const existingIds = new Set([...active, ...pending].map((m) => m.user_id));
  const results = (searchResults ?? []).filter((p) => !existingIds.has(p.id));

  function handleSelectUser(person: ProfileWithRoles) {
    setSelectedUser(person);
    setQuery("");
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!page || !selectedUser || !inviteRole.trim()) return;

    setSubmitting(true);
    try {
      await invite.mutateAsync({
        page_id: page.id,
        user_id: selectedUser.id,
        role_label: inviteRole.trim(),
        is_admin: inviteAsAdmin,
      });
      setSelectedUser(null);
      setInviteRole("");
      setShowRoleSuggestions(false);
      setInviteAsAdmin(false);
    } catch (err: any) {
      setError(err.message ?? "Couldn't send that invite.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6 text-center">
        <p className="text-ink-muted">Only a {page.name} admin can manage its team.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">{page.name} team</h2>
        </div>

        <form onSubmit={handleInvite} className="bg-surface rounded-2xl p-4 mb-6 space-y-3">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Invite someone</p>

          {selectedUser ? (
            <div className="flex items-center gap-3 bg-canvas rounded-xl px-3 py-2.5">
              <Avatar src={selectedUser.avatar_url} name={selectedUser.display_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">{selectedUser.display_name}</p>
                <p className="text-xs text-ink-muted truncate">@{selectedUser.username}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-ink-muted"
                aria-label="Change selected user"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by username or name…"
                  className="w-full bg-canvas rounded-xl pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted"
                />
              </div>

              {/* Live filtered results — appears as soon as there's enough
                  to search on, disappears once a result is picked. */}
              {query.trim().length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto z-10">
                  {searching ? (
                    <p className="text-ink-muted text-center py-4 text-sm">Searching…</p>
                  ) : results.length === 0 ? (
                    <p className="text-ink-muted text-center py-4 text-sm">No one found.</p>
                  ) : (
                    results.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => handleSelectUser(person)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface"
                      >
                        <Avatar src={person.avatar_url} name={person.display_name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink truncate">{person.display_name}</p>
                          <p className="text-xs text-ink-muted truncate">@{person.username}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <input
              value={inviteRole}
              onChange={(e) => {
                setInviteRole(e.target.value);
                setShowRoleSuggestions(true);
              }}
              onFocus={() => setShowRoleSuggestions(true)}
              onBlur={() => {
                // Give a suggestion's onMouseDown (below) a chance to
                // fire first — a plain blur would otherwise close this
                // before the click on it is registered.
                setTimeout(() => setShowRoleSuggestions(false), 100);
              }}
              placeholder="Role — e.g. Graphics Designer"
              maxLength={60}
              className="w-full bg-canvas rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted"
            />

            {/* Existing role titles that match what's typed so far —
                selecting one just fills the field with it; typing
                something with no match is still a perfectly valid
                role, it simply won't show suggestions. */}
            {showRoleSuggestions && inviteRole.trim().length > 0 && !!roleSuggestions?.length && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto z-10">
                {roleSuggestions.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setInviteRole(label);
                      setShowRoleSuggestions(false);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm text-ink hover:bg-surface truncate"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={inviteAsAdmin}
              onChange={(e) => setInviteAsAdmin(e.target.checked)}
              className="rounded"
            />
            Make them an admin (can post as {page.name} and manage the team)
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !selectedUser || !inviteRole.trim()}
            className="w-full bg-accent text-canvas rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send invite"}
          </button>
        </form>

        {pending.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2 px-1">
              Pending
            </p>
            <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border">
              {pending.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-4">
                  <Avatar src={m.profile.avatar_url} name={m.profile.display_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{m.profile.display_name}</p>
                    <p className="text-xs text-ink-muted truncate">Invited as {m.role_label}</p>
                  </div>
                  <button
                    onClick={() => remove.mutate({ page_id: page.id, user_id: m.user_id })}
                    className="text-ink-muted"
                    aria-label="Cancel invite"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2 px-1">
          Team ({active.length})
        </p>
        <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border">
          {active.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-4">
              <Avatar src={m.profile.avatar_url} name={m.profile.display_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate flex items-center gap-1">
                  {m.profile.display_name}
                  {m.is_admin && <ShieldCheck size={13} className="text-accent" />}
                </p>
                <p className="text-xs text-ink-muted truncate">{m.role_label}</p>
              </div>
              {m.user_id !== user?.id && (
                <button
                  onClick={() => remove.mutate({ page_id: page.id, user_id: m.user_id })}
                  className="text-xs text-danger flex-shrink-0"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
