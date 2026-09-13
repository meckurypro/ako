// src/components/AccountModeSwitcher.tsx
import { Link, useNavigate } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { Avatar } from "./Avatar";
import { useActiveIdentity, useMyPages, useSwitchActiveMode } from "../hooks/usePages";
import { useMyProfile } from "../hooks/useProfile";
import { usePagesFeatureSettings } from "../hooks/useAdmin";
import { pageModeLabel } from "../lib/pageRoles";

// Lists "you" plus every page you have an active role on, with the
// currently-acting-as identity checked. Tapping a row switches into
// it (switch_active_mode RPC validates membership server-side too —
// this UI just reflects what's already allowed), then lands on /me —
// same route the bottom nav's Profile tab uses, which already reads
// the freshly-invalidated identity (see useSwitchActiveMode's
// onSuccess) and resolves to that identity's own profile: PagePage
// for a page, ProfilePage for personal. Without this, switching left
// you stranded on this hub with the mode changed underneath you but
// nothing on screen reflecting it.
export function AccountModeSwitcher() {
  const navigate = useNavigate();
  const { data: me } = useMyProfile();
  const { data: identity } = useActiveIdentity();
  const { data: pages } = useMyPages();
  const switchMode = useSwitchActiveMode();
  const { data: pagesFeature } = usePagesFeatureSettings();

  const isPersonalActive = !identity || identity.mode === "personal";

  return (
    <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border">
      <button
        type="button"
        onClick={() => !isPersonalActive && switchMode.mutate(null, { onSuccess: () => navigate("/me") })}
        disabled={switchMode.isPending}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <Avatar src={me?.avatar_url} name={me?.display_name ?? "You"} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{me?.display_name}</p>
          <p className="text-xs text-ink-muted">Personal account</p>
        </div>
        {isPersonalActive && <Check size={18} className="text-accent flex-shrink-0" />}
      </button>

      {pages?.map((page) => {
        const isActive = identity?.mode === "page" && identity.page.id === page.id;
        return (
          <button
            key={page.id}
            type="button"
            onClick={() => !isActive && switchMode.mutate(page.id, { onSuccess: () => navigate("/me") })}
            disabled={switchMode.isPending}
            className="w-full flex items-center gap-3 p-4 text-left"
          >
            <Avatar src={page.avatar_url} name={page.name} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{page.name}</p>
              <p className="text-xs text-ink-muted truncate">
                {page.my_role_label} · {pageModeLabel(page.page_type)}
              </p>
            </div>
            {isActive && <Check size={18} className="text-accent flex-shrink-0" />}
          </button>
        );
      })}

      {/* Admin kill switch (see AdminPageSettings) — only ever hides
          starting a NEW page. Everyone's existing pages above stay
          fully switchable regardless of this setting. */}
      {(pagesFeature?.pages_creation_enabled ?? true) && (
        <Link to="/pages/new" className="w-full flex items-center gap-3 p-4 text-accent">
          <span className="w-9 h-9 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
            <Plus size={18} />
          </span>
          <span className="text-sm font-medium">Create a page</span>
        </Link>
      )}
    </div>
  );
}
