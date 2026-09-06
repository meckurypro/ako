// src/components/AccountSwitcher.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { Avatar } from "./Avatar";
import { AddAccountModal } from "./AddAccountModal";
import { useAuth } from "../hooks/useAuth";
import { useMyProfile } from "../hooks/useProfile";
import { useSavedAccounts, useSwitchAccount } from "../hooks/useAccountSwitcher";

// Tapping your own display name on your profile opens this — same
// "tap the name to switch" gesture as the organisation/brand switcher
// on PagePage, just scoped to personal accounts saved on this device
// instead of pages you run. Only rendered by the caller when there's
// something to switch between or add — see ProfilePage.tsx.
export function AccountSwitcher({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: me } = useMyProfile();
  const { accounts, refresh } = useSavedAccounts();
  const switchAccount = useSwitchAccount();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Same outside-tap-closes pattern used by the "…" menus on
  // ProfilePage/PagePage — no shared hook for it yet, so inlined here
  // to match rather than introducing a new abstraction on its own.
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const others = accounts.filter((a) => a.user_id !== user?.id);

  return (
    <>
      <div ref={ref} className="absolute top-full left-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg py-1 w-64 z-10">
        {/* "You" — always first, not from the saved list (that list only
            has OTHER accounts' tokens cached; the current one is already
            live and shown from useAuth instead). */}
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <Avatar src={me?.avatar_url ?? null} name={me?.display_name ?? me?.username ?? "You"} size="sm" />
          <span className="flex-1 min-w-0 truncate text-sm text-ink">{me?.display_name}</span>
          <Check size={14} className="text-accent flex-shrink-0" />
        </div>

        {others.map((account) => (
          <button
            key={account.user_id}
            onClick={() => {
              switchAccount.mutate(account, {
                onSuccess: () => {
                  onClose();
                  navigate(`/profile/${account.username}`);
                },
              });
            }}
            disabled={switchAccount.isPending}
            className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface disabled:opacity-60"
          >
            <Avatar src={account.avatar_url} name={account.display_name} size="sm" />
            <span className="flex-1 min-w-0 truncate">{account.display_name}</span>
          </button>
        ))}

        <button
          onClick={() => setShowAddAccount(true)}
          className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-accent hover:bg-surface"
        >
          <span className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
            <Plus size={14} />
          </span>
          Add account
        </button>
      </div>

      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onAdded={() => {
            refresh();
            setShowAddAccount(false);
            onClose();
            navigate("/feed");
          }}
        />
      )}
    </>
  );
}
