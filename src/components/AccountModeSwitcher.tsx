// src/components/AccountModeSwitcher.tsx
import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { Avatar } from "./Avatar";
import { useActiveIdentity, useMyPages, useSwitchActiveMode } from "../hooks/usePages";
import { useMyProfile } from "../hooks/useProfile";
import { pageModeLabel } from "../lib/pageRoles";

// Lists "you" plus every page you have an active role on, with the
// currently-acting-as identity checked. Tapping a row switches into
// it (switch_active_mode RPC validates membership server-side too —
// this UI just reflects what's already allowed).
export function AccountModeSwitcher() {
  const { data: me } = useMyProfile();
  const { data: identity } = useActiveIdentity();
  const { data: pages } = useMyPages();
  const switchMode = useSwitchActiveMode();

  const isPersonalActive = !identity || identity.mode === "personal";

  return (
    <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border">
      <button
        type="button"
        onClick={() => !isPersonalActive && switchMode.mutate(null)}
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
            onClick={() => !isActive && switchMode.mutate(page.id)}
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

      <Link to="/pages/new" className="w-full flex items-center gap-3 p-4 text-accent">
        <span className="w-9 h-9 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
          <Plus size={18} />
        </span>
        <span className="text-sm font-medium">Create an organisation or brand</span>
      </Link>
    </div>
  );
}
