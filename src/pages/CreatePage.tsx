// src/pages/CreatePage.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  useCreatePage,
  useMyPages,
  usePageById,
  usePageRoleLabelSuggestions,
  usePageCreationEligibility,
  getPageCreationEligibilityReasons,
} from "../hooks/usePages";
import { useCategories } from "../hooks/useCategories";
import { usePagesFeatureSettings } from "../hooks/useAdmin";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { useToast } from "../components/Toast";
import type { PageType } from "../types/database";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

// Visible progress toward one eligibility requirement — e.g. "22 / 30
// posts". Purely a UI nicety on top of the reasons list below; the
// numbers come straight from get_page_creation_eligibility() (see
// usePageCreationEligibility in usePages.ts), never computed here.
function EligibilityBar({ label, current, required }: { label: string; current: number; required: number }) {
  const pct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 100;
  const met = current >= required;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
        <span>{label}</span>
        <span>
          {current} / {required}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${met ? 100 : pct}%`, opacity: met ? 1 : 0.7 }}
        />
      </div>
    </div>
  );
}

const TYPES: { value: PageType; label: string }[] = [
  { value: "organization", label: "Organisation" },
  { value: "brand", label: "Brand" },
  { value: "product", label: "Product" },
];

const NAME_LABEL: Record<PageType, string> = {
  organization: "Organisation name",
  brand: "Brand name",
  product: "Product name",
};

const NAME_PLACEHOLDER: Record<PageType, string> = {
  organization: "Acme Inc",
  brand: "Acme",
  product: "Acme Widget",
};

const TAGLINE_PLACEHOLDER: Record<PageType, string> = {
  organization: "What this organisation does",
  brand: "What this brand does",
  product: "What this product does",
};

// /pages/new — form to stand up an organisation, brand, or product
// page. On success, the creator becomes its first (admin) member
// automatically (see create_page() in the migration) and we drop them
// straight into managing it.
export function CreatePage() {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const [searchParams] = useSearchParams();
  const createPage = useCreatePage();
  const toast = useToast();
  const { data: categories } = useCategories();
  const { data: myPages } = useMyPages();
  const { data: pagesFeature, isLoading: loadingPagesFeature } = usePagesFeatureSettings();
  // Separate from pages_creation_enabled above: this can be off while
  // ordinary page creation stays on, or vice versa — see
  // AdminPageSettings' "Add Subsidiary" section.
  const subsidiariesEnabled = useFeatureFlag("subsidiaries_enabled");

  // Server-computed progress toward the 30-posts / 30-distinct-
  // engaged-posts requirement (see get_page_creation_eligibility()).
  // Shown here purely for UX — create_page() independently re-checks
  // the same rule server-side, so this can never be the actual gate.
  const { data: pageEligibilityRaw } = usePageCreationEligibility();
  const eligibility = getPageCreationEligibilityReasons(pageEligibilityRaw);

  // Arriving from an existing page's "…" menu "Add Subsidiary" row
  // (see PagePage.tsx) passes ?parent=<page id> — that page becomes a
  // fixed, non-editable parent rather than something picked from the
  // dropdown below (skipped entirely in that case).
  const presetParentId = searchParams.get("parent");
  const { data: presetParent } = usePageById(presetParentId ?? "", !!presetParentId);
  const [pageType, setPageType] = useState<PageType>("organization");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [parentOrgId, setParentOrgId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const usernameCheckId = useRef(0);

  // Same live suggestion list PageTeam.tsx uses when inviting a team
  // member to a role — here it's for the founder's own role on a
  // brand-new page, backed by the same page_role_labels table so a
  // title only ever gets typed out in full once across the app.
  const { data: roleSuggestions } = usePageRoleLabelSuggestions(roleLabel);

  // Any page you admin can host a Subsidiary, and a Subsidiary can be
  // any page type — no longer restricted to "brand under an
  // organization you run" (see ako_pages_v2_subsidiaries.sql for the
  // server-side rule this now actually depends on).
  const myAdminPages = (myPages ?? []).filter((p) => p.my_is_admin);

  // Debounced live availability check as the user types — same pattern
  // as SignUp.tsx's personal-account check, just against the pages
  // table instead of profiles. UX nicety only: create_page() still
  // enforces the real uniqueness server-side.
  useEffect(() => {
    const candidate = username.trim().toLowerCase();
    if (candidate.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    const checkId = ++usernameCheckId.current;
    setUsernameStatus("checking");

    const timeout = setTimeout(async () => {
      const { data, error: checkError } = await supabase
        .from("pages")
        .select("id")
        .eq("username", candidate)
        .maybeSingle();

      // Ignore stale responses if the user kept typing.
      if (checkId !== usernameCheckId.current) return;

      if (checkError) {
        setUsernameStatus("error");
      } else {
        setUsernameStatus(data ? "taken" : "available");
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !username.trim() || !roleLabel.trim()) {
      setError("Name, username, and your role are required.");
      return;
    }

    if (usernameStatus === "taken") {
      setError("That username is already taken.");
      return;
    }

    // UX-only short-circuit — mirrors CreateProject's eligibility
    // check. The real gate is create_page() itself, which will raise
    // its own clear error even if this somehow gets bypassed.
    if (eligibility && !eligibility.eligible) {
      setError(eligibility.reasons[0]);
      return;
    }

    // Same idea for the subsidiaries switch — the dropdown below is
    // already hidden when this is off, but a dropdown selection made
    // just before an admin flipped the switch could still be sitting
    // in state, and create_page() would reject it anyway.
    if ((presetParentId || parentOrgId) && !subsidiariesEnabled) {
      setError("Subsidiary creation is temporarily disabled.");
      return;
    }

    // Re-check right before submitting — the live check above can go
    // stale if someone else takes the name in the gap between typing
    // and hitting submit.
    const { data: existingPage, error: recheckError } = await supabase
      .from("pages")
      .select("id")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();

    if (recheckError) {
      setError("Couldn't verify that username right now. Please try again.");
      return;
    }
    if (existingPage) {
      setUsernameStatus("taken");
      setError("That username is already taken.");
      return;
    }

    try {
      const page = await createPage.mutateAsync({
        page_type: pageType,
        name: name.trim(),
        username: username.trim().toLowerCase(),
        role_label: roleLabel.trim(),
        tagline: tagline.trim() || undefined,
        bio: bio.trim() || undefined,
        category_id: categoryId || undefined,
        parent_organization_id: presetParentId || parentOrgId || undefined,
      });
      navigate(`/page/${page.username}`);
      toast(`${name.trim()} created successfully.`, { variant: "success" });
    } catch (err: any) {
      setError(err.message ?? "Couldn't create that page.");
    }
  }

  // Admin kill switch (see AdminPageSettings) — blocks the form even
  // for someone who navigates here directly, not just the hidden entry
  // points elsewhere. Wait for the setting to load rather than flash
  // the form then yank it away.
  const pagesBlocked = !loadingPagesFeature && !(pagesFeature?.pages_creation_enabled ?? true);
  const subsidiaryBlocked = !!presetParentId && !subsidiariesEnabled;
  if (pagesBlocked || subsidiaryBlocked) {
    return (
      <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={smartBack} className="text-ink-muted">
              <ArrowLeft size={22} />
            </button>
            <h2 className="font-display text-xl text-ink">{presetParentId ? "Add a Subsidiary" : "Create a page"}</h2>
          </div>
          <p className="text-sm text-ink-muted">
            {pagesBlocked
              ? "New pages aren't being created right now. Check back later."
              : "Adding subsidiaries isn't available right now. Check back later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">{presetParentId ? "Add a Subsidiary" : "Create a page"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPageType(t.value)}
                className={`text-center p-3 rounded-2xl border text-sm font-medium ${
                  pageType === t.value ? "border-accent bg-accent-soft text-ink" : "border-border bg-surface text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {eligibility && !eligibility.eligible && (
            <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/30 space-y-3">
              <div>
                <p className="text-sm font-medium text-danger mb-1">Page creation isn't unlocked yet:</p>
                <ul className="text-xs text-danger space-y-0.5 list-disc list-inside">
                  {eligibility.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>

              {pageEligibilityRaw && (
                <div className="space-y-2.5 pt-1 border-t border-danger/20">
                  <EligibilityBar
                    label="Posts (last 30 days)"
                    current={pageEligibilityRaw.posts_30d}
                    required={pageEligibilityRaw.posts_required}
                  />
                  <EligibilityBar
                    label="Distinct posts engaged with (last 30 days)"
                    current={pageEligibilityRaw.distinct_engaged_30d}
                    required={pageEligibilityRaw.distinct_engaged_required}
                  />
                  {/* Only shown when Admin has actually set an account-age
                      requirement — most of the time this is 0 and would
                      just be a meaningless always-full bar. */}
                  {pageEligibilityRaw.account_age_required > 0 && (
                    <EligibilityBar
                      label="Account age (days)"
                      current={pageEligibilityRaw.account_age_days}
                      required={pageEligibilityRaw.account_age_required}
                    />
                  )}
                </div>
              )}

              <p className="text-xs text-danger/80">
                Keep posting and engaging with others' posts to unlock this.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">{NAME_LABEL[pageType]}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={NAME_PLACEHOLDER[pageType]}
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              maxLength={30}
              placeholder="meckuryai"
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
            <p className="text-xs text-ink-muted mt-1">akọ.app/page/{username || "..."}</p>
            {usernameStatus === "checking" && (
              <p className="text-xs text-ink-muted mt-1.5">Checking availability…</p>
            )}
            {usernameStatus === "taken" && (
              <p className="text-xs text-danger mt-1.5">That username is already taken.</p>
            )}
            {usernameStatus === "available" && (
              <p className="text-xs text-accent mt-1.5">Username is available.</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-ink-muted mb-1">Your role at it</label>
            <input
              value={roleLabel}
              onChange={(e) => {
                setRoleLabel(e.target.value);
                setShowRoleSuggestions(true);
              }}
              onFocus={() => setShowRoleSuggestions(true)}
              onBlur={() => {
                // Give a suggestion's onMouseDown below a chance to fire
                // first — a plain blur would otherwise close this before
                // the click on it registers.
                setTimeout(() => setShowRoleSuggestions(false), 100);
              }}
              maxLength={60}
              placeholder="CEO, Founder, Community Lead…"
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
            <p className="text-xs text-ink-muted mt-1">
              Shown as "{roleLabel || "Your role"} at {name || "this page"}" on your profile.
            </p>

            {/* Existing role titles that match what's typed so far — same
                list PageTeam.tsx shows when inviting someone, backed by
                page_role_labels. Picking one just fills the field;
                typing something new is still a perfectly valid role, it
                simply won't show suggestions. */}
            {showRoleSuggestions && roleLabel.trim().length > 0 && !!roleSuggestions?.length && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto z-10">
                {roleSuggestions.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setRoleLabel(label);
                      setShowRoleSuggestions(false);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm text-ink hover:bg-surface truncate"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Tagline</label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={100}
              placeholder={TAGLINE_PLACEHOLDER[pageType]}
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted resize-none"
            />
          </div>

          {categories && categories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {presetParentId ? (
            presetParent && (
              <div className="rounded-xl bg-surface px-4 py-3 flex items-center gap-2.5">
                <span className="text-sm text-ink-muted">Subsidiary of</span>
                <span className="text-sm font-medium text-ink truncate">{presetParent.name}</span>
              </div>
            )
          ) : (
            subsidiariesEnabled &&
            myAdminPages.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Make this a Subsidiary of a page you manage? (optional)
                </label>
                <select
                  value={parentOrgId}
                  onChange={(e) => setParentOrgId(e.target.value)}
                  className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink"
                >
                  <option value="">None</option>
                  {myAdminPages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={createPage.isPending}
            className="w-full bg-accent text-canvas rounded-xl py-3 text-sm font-medium disabled:opacity-60"
          >
            {createPage.isPending ? "Creating…" : presetParentId ? "Add Subsidiary" : `Create ${pageType}`}
          </button>
        </form>
      </div>
    </div>
  );
}
