// src/pages/MyGigs.tsx
//
// "Your Gigs" — the missing piece flagged by the
// AKO_GIG_ROLE_EXPANSION_AND_COLLABORATION_SYSTEM audit (spec
// section 21): a single place to see and manage every professional
// Gig this account owns, including ones auto-created from a
// collaboration/credit that are still incomplete (and so don't show
// up anywhere in the dynamic profile tabs — see
// get_profile_portfolio_categories). Reached from the profile owner
// menu, not tucked into Settings.
import { Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, Briefcase } from "lucide-react";
import { useMyGigs, type MyGig } from "../hooks/usePortfolio";
import { BottomNav } from "../components/BottomNav";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  archived: "Archived",
  cancelled: "Cancelled",
};

const SOURCE_LABEL: Record<MyGig["source"], string> = {
  manual: "Created manually",
  auto_project: "Started from a project",
  auto_collaboration: "Started from a collaboration",
};

function GigRow({ gig }: { gig: MyGig }) {
  return (
    <Link
      to={`/projects/${gig.id}/edit`}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface"
    >
      <div className="w-12 h-12 rounded-lg bg-canvas flex items-center justify-center overflow-hidden shrink-0">
        {gig.thumbnail_url ? (
          <img src={gig.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Briefcase size={18} className="text-ink-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink truncate">{gig.title}</p>
        <p className="text-xs text-ink-muted truncate">
          {gig.role_label ?? "No role set"}
          {gig.status !== "active" ? ` · ${STATUS_LABEL[gig.status] ?? gig.status}` : ""}
        </p>
      </div>
      {!gig.is_complete && (
        <span className="text-[11px] font-medium text-accent bg-accent-soft rounded-full px-2.5 py-1 shrink-0">
          Finish setup
        </span>
      )}
    </Link>
  );
}

// Groups: incomplete Gigs first regardless of category (they need
// attention), then the rest grouped by category — same category
// concept as the profile's dynamic tabs, so "Film" here lines up
// with the "Film" tab a visitor would see once it's complete.
function groupGigs(gigs: MyGig[]) {
  const incomplete = gigs.filter((g) => !g.is_complete);
  const complete = gigs.filter((g) => g.is_complete);
  const byCategory = new Map<string, MyGig[]>();
  for (const gig of complete) {
    const key = gig.category ?? "Other";
    const list = byCategory.get(key) ?? [];
    list.push(gig);
    byCategory.set(key, list);
  }
  return { incomplete, byCategory };
}

export function MyGigs() {
  const smartBack = useSmartBack();
  const { data: gigs, isLoading } = useMyGigs();
  const { incomplete, byCategory } = groupGigs(gigs ?? []);

  return (
    <div className="min-h-screen bg-canvas px-4 md:px-8 pt-6 md:pt-10 pb-24">
      <div className="max-w-xl md:max-w-4xl mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4 md:hidden">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-1">Your Gigs</h2>
        <p className="text-sm text-ink-muted mb-6">
          Every professional identity on your account — one Gig per role.
        </p>

        {isLoading ? (
          <p className="text-ink-muted text-sm text-center py-10">Loading…</p>
        ) : !gigs || gigs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase size={32} className="text-ink-muted mx-auto mb-3" />
            <p className="text-ink-muted text-sm mb-1">No Gigs yet.</p>
            <p className="text-ink-muted text-xs">
              Create one from the + button, or get credited as a collaborator and accept it —
              either way, it shows up here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {incomplete.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
                  Needs attention
                </h3>
                <div className="space-y-2">
                  {incomplete.map((gig) => (
                    <div key={gig.id}>
                      <GigRow gig={gig} />
                      {gig.source !== "manual" && (
                        <p className="text-[11px] text-ink-muted px-1 mt-1">{SOURCE_LABEL[gig.source]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {[...byCategory.entries()].map(([category, categoryGigs]) => (
              <div key={category}>
                <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryGigs.map((gig) => (
                    <GigRow key={gig.id} gig={gig} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
