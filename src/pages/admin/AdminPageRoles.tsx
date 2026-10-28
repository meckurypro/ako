// src/pages/admin/AdminPageRoles.tsx
// Page roles: the list people choose from in "Your role at it" / team invites, plus the queue of roles people typed
// that weren't in it. Approving (optionally after fixing the wording) switches everyone waiting on it to the approved
// title and notifies them; rejecting leaves them as the generic title. See supabase/ako_page_roles_catalogue.sql.
import { useState, type FormEvent } from "react";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import {
  useAdminPageRoleRequests,
  useAdminPageRoles,
  useCreatePageRole,
  useDeletePageRole,
  useRenamePageRole,
  useReviewPageRole,
  type PageRoleRequest,
} from "../../hooks/useAdmin";
import { GENERIC_ROLE_LABEL } from "../../lib/pageRoles";
import { friendlyError } from "../../lib/friendlyError";

function errorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string };
  if (e?.code === "23505") return "A role with that name already exists.";
  return friendlyError(err, "Something went wrong. Please try again.");
}

function RequestCard({ request }: { request: PageRoleRequest }) {
  const review = useReviewPageRole();
  const [label, setLabel] = useState(request.label);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    const cleaned = label.trim().replace(/\s+/g, " ");
    if (approve && !cleaned) return setError("Give the role a name first.");
    setError(null);
    try {
      await review.mutateAsync({ id: request.id, approve, label: cleaned });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const who = request.requester_name || request.requester_username;

  return (
    <div className="bg-surface rounded-xl p-3 border border-border space-y-2.5">
      <div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          aria-label="Role name"
          className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm font-medium"
        />
        <p className="text-xs text-ink-muted mt-1">You can fix the wording before approving.</p>
      </div>

      {who && (
        <p className="text-xs text-ink-muted">
          Requested by {who}
          {request.requester_username ? ` (@${request.requester_username})` : ""}
        </p>
      )}

      {request.holders.length > 0 && (
        <ul className="text-xs text-ink-muted space-y-0.5">
          {request.holders.map((h, i) => (
            <li key={`${h.page_username}-${h.member_username}-${i}`}>
              @{h.member_username} at {h.page_name}
              {h.member_status === "invited" ? " (invited)" : ""} — showing as {GENERIC_ROLE_LABEL}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => decide(true)}
          disabled={review.isPending}
          className="flex-1 bg-cta text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Check size={15} /> Approve
        </button>
        <button
          onClick={() => decide(false)}
          disabled={review.isPending}
          className="flex-1 border border-border text-ink rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <X size={15} /> Reject
        </button>
      </div>
    </div>
  );
}

export function AdminPageRoles() {
  const smartBack = useSmartBack();
  const { data: requests = [], isLoading: loadingRequests } = useAdminPageRoleRequests();
  const { data: roles = [], isLoading: loadingRoles } = useAdminPageRoles();
  const createRole = useCreatePageRole();
  const renameRole = useRenamePageRole();
  const deleteRole = useDeletePageRole();

  const [newLabel, setNewLabel] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const cleaned = newLabel.trim().replace(/\s+/g, " ");
    if (!cleaned) return;
    setAddError(null);
    try {
      await createRole.mutateAsync(cleaned);
      setNewLabel("");
    } catch (err) {
      setAddError(errorMessage(err));
    }
  }

  async function handleRename(id: string) {
    const cleaned = editLabel.trim().replace(/\s+/g, " ");
    if (!cleaned) return;
    setRowError(null);
    try {
      await renameRole.mutateAsync({ id, label: cleaned });
      setEditingId(null);
    } catch (err) {
      setRowError(errorMessage(err));
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Delete “${label}”? People who already have it keep it, but it won’t be offered any more.`)) return;
    setRowError(null);
    try {
      await deleteRole.mutateAsync(id);
    } catch (err) {
      setRowError(errorMessage(err));
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Page roles</h2>
        </div>

        <h3 className="text-sm font-medium text-ink mb-2">
          Requests{requests.length > 0 ? ` (${requests.length})` : ""}
        </h3>
        <p className="text-xs text-ink-muted mb-3">
          Roles people typed that aren’t in the list. Until you decide, they show as “{GENERIC_ROLE_LABEL}”. Approving
          updates them automatically and lets them know.
        </p>
        {loadingRequests ? (
          <p className="text-ink-muted text-center py-6">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-ink-muted bg-surface rounded-xl p-3 border border-border mb-6">No requests waiting.</p>
        ) : (
          <div className="space-y-3 mb-6">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        )}

        <h3 className="text-sm font-medium text-ink mb-2">Add a role</h3>
        <form onSubmit={handleAdd} className="flex gap-2 mb-1">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            maxLength={60}
            placeholder="e.g. Graphics Designer"
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-ink"
          />
          <button
            type="submit"
            disabled={createRole.isPending}
            aria-label="Add role"
            className="bg-cta text-white px-4 rounded-xl flex items-center justify-center disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </form>
        {addError && <p className="text-xs text-danger mb-2">{addError}</p>}

        <h3 className="text-sm font-medium text-ink mt-6 mb-2">Roles in the list</h3>
        {rowError && <p className="text-xs text-danger mb-2">{rowError}</p>}
        {loadingRoles ? (
          <p className="text-ink-muted text-center py-6">Loading…</p>
        ) : (
          <div className="space-y-2">
            {roles.map((role) => (
              <div key={role.id} className="bg-surface rounded-xl p-3 border border-border">
                {editingId === role.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      maxLength={60}
                      autoFocus
                      aria-label="Role name"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-canvas text-ink text-sm"
                    />
                    <button
                      onClick={() => handleRename(role.id)}
                      disabled={renameRole.isPending}
                      className="text-xs text-accent font-medium px-2 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-ink-muted px-1">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">{role.label}</p>
                      <p className="text-xs text-ink-muted">
                        {role.is_system
                          ? "Default for roles awaiting approval"
                          : role.usage_count > 0
                            ? `Used ${role.usage_count} ${role.usage_count === 1 ? "time" : "times"}`
                            : "Not used yet"}
                      </p>
                    </div>
                    {!role.is_system && (
                      <div className="flex items-center gap-3 flex-shrink-0 text-ink-muted">
                        <button
                          onClick={() => {
                            setEditingId(role.id);
                            setEditLabel(role.label);
                            setRowError(null);
                          }}
                          aria-label={`Rename ${role.label}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(role.id, role.label)} aria-label={`Delete ${role.label}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
