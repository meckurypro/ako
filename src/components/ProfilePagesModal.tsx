// src/components/ProfilePagesModal.tsx
import { Link, useNavigate } from "react-router-dom";
import { Check, Plus, X } from "lucide-react";
import { Modal } from "./Modal";
import { runAfterDismiss } from "../hooks/useBackDismiss";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useToast } from "./Toast";
import {
  useActiveIdentity,
  useMyPages,
  useMyPendingPageInvites,
  useRespondToPageInvite,
  useSwitchActiveMode,
  type ProfilePageAffiliation,
} from "../hooks/usePages";
import { useMyProfile } from "../hooks/useProfile";
import { usePagesFeatureSettings } from "../hooks/useAdmin";
import { useIsRestricted } from "../hooks/useAccountAccess";
import { pageModeLabel } from "../lib/pageRoles";

// The one place pages are listed and switched into (there is no separate /pages screen any more).
//
//  - "visitor": someone else's profile (or your own while previewing as a visitor). Lists the pages
//    that person is affiliated with; tapping one just visits it.
//  - "owner": your own profile / the Pages shortcuts. Lists every page you run with a "Create a
//    page" CTA; tapping one switches your account into that page right away. With no pages it
//    explains what a page is and offers to set one up.
//
// Modal caps its card at 85vh and scrolls it, so long lists are fine.
type ProfilePagesModalProps =
  | { mode: "visitor"; pages: ProfilePageAffiliation[]; onClose: () => void }
  | {
      mode: "owner";
      onClose: () => void;
      /** Where to land after switching into a page. `false` stays put (e.g. mid-compose). */
      navigateOnSwitch?: boolean;
    };

export function ProfilePagesModal(props: ProfilePagesModalProps) {
  return (
    <Modal onClose={props.onClose} ariaLabel="Pages">
      <h2 className="text-lg font-semibold text-overlay-ink">Pages</h2>
      {props.mode === "visitor" ? (
        <VisitorList pages={props.pages} onClose={props.onClose} />
      ) : (
        <OwnerList onClose={props.onClose} navigateOnSwitch={props.navigateOnSwitch ?? true} />
      )}
    </Modal>
  );
}

function VisitorList({ pages, onClose }: { pages: ProfilePageAffiliation[]; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <ul className="mt-3 -mx-2">
      {pages.map((p) => (
        <li key={p.page_id}>
          <button
            type="button"
            // Navigate only once the modal's history entry has been popped, or that pop can undo the push.
            onClick={() => runAfterDismiss(onClose, () => navigate(`/page/${p.username}`))}
            className="w-full flex items-center gap-3 px-2 py-3 rounded-2xl text-left active:bg-overlay-surface-raised"
          >
            <Avatar src={p.avatar_url} name={p.name} size="vn" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-overlay-ink truncate">{p.name}</span>
                {p.is_verified && <VerifiedBadge className="shrink-0" />}
              </div>
              <p className="text-sm text-overlay-ink-muted truncate">{p.role_label}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function OwnerList({ onClose, navigateOnSwitch }: { onClose: () => void; navigateOnSwitch: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const restricted = useIsRestricted();
  const { data: me } = useMyProfile();
  const { data: identity } = useActiveIdentity();
  const { data: pages, isLoading } = useMyPages();
  const { data: invites } = useMyPendingPageInvites();
  const { data: pagesFeature } = usePagesFeatureSettings();
  const switchMode = useSwitchActiveMode();
  const respond = useRespondToPageInvite();

  const canCreate = (pagesFeature?.pages_creation_enabled ?? true) && !restricted;
  const actingAsPage = identity?.mode === "page" ? identity.page.id : null;
  const hasPages = (pages?.length ?? 0) > 0;
  const hasInvites = (invites?.length ?? 0) > 0;

  function goToPage(pageId: string, username: string) {
    // Already acting as this page: nothing to switch, just go there.
    if (actingAsPage === pageId) {
      runAfterDismiss(onClose, () => {
        if (navigateOnSwitch) navigate(`/page/${username}`);
      });
      return;
    }
    switchMode.mutate(pageId, {
      onSuccess: () => {
        runAfterDismiss(onClose, () => {
          if (navigateOnSwitch) navigate(`/page/${username}`);
        });
      },
      onError: () => toast("Couldn't switch to that page.", { variant: "error" }),
    });
  }

  // "Create a page" is a real link, but navigating must wait for the modal's dismiss to settle too.
  function goCreate(e: React.MouseEvent) {
    e.preventDefault();
    runAfterDismiss(onClose, () => navigate("/pages/new"));
  }

  function backToPersonal() {
    switchMode.mutate(null, {
      onSuccess: () => {
        runAfterDismiss(onClose, () => {
          if (navigateOnSwitch) navigate("/me");
        });
      },
      onError: () => toast("Couldn't switch accounts.", { variant: "error" }),
    });
  }

  if (isLoading) {
    return <p className="mt-4 text-sm text-overlay-ink-muted">Loading…</p>;
  }

  return (
    <>
      {hasInvites && (
        <div className="mt-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-overlay-ink-muted mb-1">Invites</h3>
          <ul className="-mx-2">
            {invites!.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3 px-2 py-2.5">
                <Avatar src={invite.page.avatar_url} name={invite.page.name} size="vn" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-overlay-ink truncate">{invite.page.name}</p>
                  <p className="text-sm text-overlay-ink-muted truncate">Invited as {invite.role_label}</p>
                </div>
                <button
                  type="button"
                  aria-label="Decline"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate(
                      { page_id: invite.page_id, accept: false },
                      { onSuccess: () => toast(`Declined ${invite.page.name}.`, { variant: "success" }) }
                    )
                  }
                  className="w-9 h-9 rounded-full flex items-center justify-center text-overlay-ink-muted active:bg-overlay-surface-raised"
                >
                  <X size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Accept"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate(
                      { page_id: invite.page_id, accept: true },
                      { onSuccess: () => toast(`Joined ${invite.page.name}.`, { variant: "success" }) }
                    )
                  }
                  className="w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center"
                >
                  <Check size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasPages ? (
        <ul className="mt-3 -mx-2">
          {actingAsPage && (
            <li>
              <button
                type="button"
                onClick={backToPersonal}
                disabled={switchMode.isPending}
                className="w-full flex items-center gap-3 px-2 py-3 rounded-2xl text-left active:bg-overlay-surface-raised"
              >
                <Avatar src={me?.avatar_url} name={me?.display_name ?? "You"} size="vn" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-overlay-ink truncate block">{me?.display_name}</span>
                  <p className="text-sm text-overlay-ink-muted truncate">Personal account</p>
                </div>
              </button>
            </li>
          )}
          {pages!.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => goToPage(page.id, page.username)}
                disabled={switchMode.isPending}
                className="w-full flex items-center gap-3 px-2 py-3 rounded-2xl text-left active:bg-overlay-surface-raised"
              >
                <Avatar src={page.avatar_url} name={page.name} size="vn" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-overlay-ink truncate">{page.name}</span>
                    {page.is_verified && <VerifiedBadge className="shrink-0" />}
                  </div>
                  <p className="text-sm text-overlay-ink-muted truncate">
                    {page.my_role_label} · {pageModeLabel(page.page_type)}
                  </p>
                </div>
                {actingAsPage === page.id && <Check size={18} className="text-accent shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-overlay-ink-muted">
          While you're acting as a page, your posts, name, and photo show as the page's instead of yours —
          everyone managing it shares the same page.
          {canCreate && (
            <>
              {" "}
              <Link to="/pages/new" onClick={(e) => goCreate(e)} className="text-accent font-medium">
                Set one up
              </Link>
              .
            </>
          )}
        </p>
      )}

      {hasPages && canCreate && (
        <Link
          to="/pages/new"
          onClick={(e) => goCreate(e)}
          className="mt-2 -mx-2 flex items-center gap-3 px-2 py-3 rounded-2xl text-accent active:bg-overlay-surface-raised"
        >
          <span className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
            <Plus size={18} />
          </span>
          <span className="text-sm font-medium">Create a page</span>
        </Link>
      )}
    </>
  );
}
