// src/pages/CreatePage.tsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft } from "lucide-react";
import { useCreatePage } from "../hooks/usePages";
import { useCategories } from "../hooks/useCategories";
import { useMyPages } from "../hooks/usePages";
import type { PageType } from "../types/database";

const TYPES: { value: PageType; label: string; hint: string }[] = [
  { value: "organization", label: "Organisation", hint: "A company, nonprofit, or team — e.g. IQ Universe" },
  { value: "brand", label: "Brand", hint: "A product or service — e.g. Meckury AI, PromptIQ" },
];

// /pages/new — form to stand up an organisation or brand page. On
// success, the creator becomes its first (admin) member automatically
// (see create_page() in the migration) and we drop them straight
// into managing it.
export function CreatePage() {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const [searchParams] = useSearchParams();
  const createPage = useCreatePage();
  const { data: categories } = useCategories();
  const { data: myPages } = useMyPages();

  // Arriving from the profile owner menu's "Organisation"/"Brand" row
  // (see ProfilePage.tsx) passes ?type=... to preselect it — someone
  // starting from a blank /pages/new just gets the default below.
  const requestedType = searchParams.get("type");
  const [pageType, setPageType] = useState<PageType>(requestedType === "organization" ? "organization" : "brand");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [parentOrgId, setParentOrgId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const myOrganizations = (myPages ?? []).filter((p) => p.page_type === "organization" && p.my_is_admin);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !username.trim() || !roleLabel.trim()) {
      setError("Name, username, and your role are required.");
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
        parent_organization_id: pageType === "brand" && parentOrgId ? parentOrgId : undefined,
      });
      navigate(`/page/${page.username}`);
    } catch (err: any) {
      setError(err.message ?? "Couldn't create that page.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Create a page</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPageType(t.value)}
                className={`text-left p-3 rounded-2xl border ${
                  pageType === t.value ? "border-accent bg-accent-soft" : "border-border bg-surface"
                }`}
              >
                <p className="text-sm font-medium text-ink">{t.label}</p>
                <p className="text-xs text-ink-muted mt-0.5">{t.hint}</p>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">
              {pageType === "brand" ? "Brand name" : "Organisation name"}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={pageType === "brand" ? "Meckury AI" : "IQ Universe"}
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              maxLength={30}
              placeholder="meckuryai"
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
            <p className="text-xs text-ink-muted mt-1">akọ.app/page/{username || "..."}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Your role at it</label>
            <input
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              maxLength={60}
              placeholder="CEO, Founder, Community Lead…"
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
            <p className="text-xs text-ink-muted mt-1">
              Shown as "{roleLabel || "Your role"} at {name || "this page"}" on your profile.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">
              Tagline {pageType === "brand" && "(the product or service, in a few words)"}
            </label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={100}
              placeholder={pageType === "brand" ? "Credit-based AI generation platform" : "What this organisation does"}
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

          {pageType === "brand" && myOrganizations.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">
                Part of an organisation you manage? (optional)
              </label>
              <select
                value={parentOrgId}
                onChange={(e) => setParentOrgId(e.target.value)}
                className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink"
              >
                <option value="">None</option>
                {myOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={createPage.isPending}
            className="w-full bg-accent text-canvas rounded-xl py-3 text-sm font-medium disabled:opacity-60"
          >
            {createPage.isPending ? "Creating…" : `Create ${pageType}`}
          </button>
        </form>
      </div>
    </div>
  );
}
