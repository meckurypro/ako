// src/components/ProfilePagesModal.tsx
import { useNavigate } from "react-router-dom";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import type { ProfilePageAffiliation } from "../hooks/usePages";

// The pages (organisations / brands / products) a person is affiliated with, each with the page's
// avatar and the person's role there. Scrolls when long — Modal caps its card at 85vh and scrolls it.
export function ProfilePagesModal({
  pages,
  onClose,
}: {
  pages: ProfilePageAffiliation[];
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Modal onClose={onClose} ariaLabel="Pages">
      <h2 className="text-lg font-semibold text-overlay-ink">Pages</h2>
      <ul className="mt-3 -mx-2">
        {pages.map((p) => (
          <li key={p.page_id}>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/page/${p.username}`);
              }}
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
    </Modal>
  );
}
