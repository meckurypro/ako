// src/components/ManageAccessSheet.tsx
import { useState } from "react";
import { Search, X, UserMinus, UserPlus } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useSearchPeople } from "../hooks/useSearch";
import {
  useProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
} from "../hooks/useProjectMembers";
import { Avatar } from "./Avatar";

interface ManageAccessSheetProps {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
}

/**
 * Owner-only bottom sheet for a private project: search anyone on Ako
 * and add them to project_members, or remove someone who already has
 * access. This — not the link — is now the only way in for a private
 * project (see ako_projects_v4_private_membership.sql).
 */
export function ManageAccessSheet({ projectId, projectTitle, onClose }: ManageAccessSheetProps) {
  useBackDismiss(onClose);
  const [query, setQuery] = useState("");
  const { data: results, isLoading: searching } = useSearchPeople(query);
  const { data: members, isLoading: loadingMembers } = useProjectMembers(projectId);
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);

  const memberIds = new Set((members ?? []).map((m) => m.user_id));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Manage access</p>
            <p className="text-xs text-ink-muted truncate">{projectTitle}</p>
          </div>
          <button onClick={onClose} className="text-ink-muted" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people to add…"
              className="w-full pl-10 pr-3 py-2.5 rounded-full border border-border bg-canvas text-ink text-sm
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Search results — only shown once there's a query, so the
              default view is just the current member list below. */}
          {query.trim().length > 1 && (
            <div className="px-2 pb-2 border-b border-border">
              {searching ? (
                <p className="text-ink-muted text-center py-6 text-sm">Searching…</p>
              ) : !results?.length ? (
                <p className="text-ink-muted text-center py-6 text-sm">No one found.</p>
              ) : (
                results.map((person) => {
                  const isMember = memberIds.has(person.id);
                  return (
                    <div key={person.id} className="w-full flex items-center gap-3 px-2 py-2.5">
                      <Avatar src={person.avatar_url} name={person.display_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink truncate">{person.display_name}</p>
                        <p className="text-xs text-ink-muted truncate">@{person.username}</p>
                      </div>
                      <button
                        onClick={() => (isMember ? removeMember.mutate(person.id) : addMember.mutate(person.id))}
                        disabled={addMember.isPending || removeMember.isPending}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full disabled:opacity-50 ${
                          isMember ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"
                        }`}
                      >
                        {isMember ? <UserMinus size={13} /> : <UserPlus size={13} />}
                        {isMember ? "Remove" : "Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">
              {members?.length ? `Has access (${members.length})` : "Has access"}
            </p>
          </div>

          {loadingMembers ? (
            <p className="text-ink-muted text-center py-6 text-sm">Loading…</p>
          ) : !members?.length ? (
            <p className="text-ink-muted text-center py-6 text-sm px-4">
              Nobody's been added yet — search above to give someone access.
            </p>
          ) : (
            <div className="px-2 pb-4">
              {members.map((m) => (
                <div key={m.user_id} className="w-full flex items-center gap-3 px-2 py-2.5">
                  <Avatar src={m.profile.avatar_url} name={m.profile.display_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{m.profile.display_name}</p>
                    <p className="text-xs text-ink-muted truncate">@{m.profile.username}</p>
                  </div>
                  <button
                    onClick={() => removeMember.mutate(m.user_id)}
                    disabled={removeMember.isPending}
                    aria-label={`Remove ${m.profile.display_name}`}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-danger/10 text-danger disabled:opacity-50"
                  >
                    <UserMinus size={13} />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
