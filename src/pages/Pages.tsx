// src/pages/Pages.tsx
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { AccountModeSwitcher } from "../components/AccountModeSwitcher";
import { useMyPendingPageInvites, useRespondToPageInvite } from "../hooks/usePages";
import { pageModeLabel } from "../lib/pageRoles";

// /pages — the account-mode hub: switch between personal and any page
// you manage, respond to pending role invites, or start a new page.
export function Pages() {
  const navigate = useNavigate();
  const { data: invites } = useMyPendingPageInvites();
  const respond = useRespondToPageInvite();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Account mode</h2>
        </div>

        {invites && invites.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2 px-1">
              Pending invites
            </h3>
            <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 p-4">
                  <Avatar src={invite.page.avatar_url} name={invite.page.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{invite.page.name}</p>
                    <p className="text-xs text-ink-muted truncate">
                      Invited as {invite.role_label} · {pageModeLabel(invite.page.page_type)}
                    </p>
                  </div>
                  <button
                    aria-label="Decline"
                    onClick={() => respond.mutate({ page_id: invite.page_id, accept: false })}
                    disabled={respond.isPending}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted"
                  >
                    <X size={16} />
                  </button>
                  <button
                    aria-label="Accept"
                    onClick={() => respond.mutate({ page_id: invite.page_id, accept: true })}
                    disabled={respond.isPending}
                    className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-accent"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2 px-1">
          Switch account mode
        </h3>
        <AccountModeSwitcher />

        <p className="text-xs text-ink-muted mt-4 px-1">
          While you're acting as an organisation or brand, your posts, name, and photo show
          theirs instead of yours — everyone managing it shares the same page.{" "}
          <Link to="/pages/new" className="text-accent">
            Set one up
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
