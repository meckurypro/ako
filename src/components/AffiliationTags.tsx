// src/components/AffiliationTags.tsx
import { Link } from "react-router-dom";
import type { PageAffiliation } from "../types/database";
import { formatAffiliation } from "../lib/pageRoles";

// Renders "Graphics Designer at PromptIQ · CEO at Meckury AI" — the
// organisational counterpart to RoleTags' self-chosen job/hobby tags.
// Each page name links to that page's public profile.
export function AffiliationTags({ affiliations, className }: { affiliations: PageAffiliation[]; className?: string }) {
  if (!affiliations || affiliations.length === 0) return null;

  return (
    <span className={className}>
      {affiliations.map((a, i) => (
        <span key={a.page_id}>
          {i > 0 && " · "}
          {a.role_label} at{" "}
          <Link to={`/page/${a.page_username}`} className="hover:underline">
            {a.page_name}
          </Link>
        </span>
      ))}
    </span>
  );
}

// Plain-text version (no links) for contexts that can't embed a Link,
// e.g. alt text or non-DOM previews.
export function formatAffiliations(affiliations: PageAffiliation[]): string {
  return affiliations.map(formatAffiliation).join(" · ");
}
