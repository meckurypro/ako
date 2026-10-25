// src/pages/CustomPages.tsx
// /me/custom-pages — the person's Custom Pages and the "create" form. Reached from the profile menu, and from the
// "Create your own custom page" link on any published page (which arrives with ?ref=<slug> so the new page can be
// attributed to the page that inspired it).
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, Globe, Inbox, LayoutTemplate, Lock, Plus } from "lucide-react";
import { checkCustomPageSlugAvailable, useCreateCustomPage, useMyCustomPages } from "../hooks/useCustomPages";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { friendlyError } from "../lib/friendlyError";
import { customPageUrl, publicFileUrl, rememberReferrer, takeReferrer, type CustomPageSummary } from "../lib/customPage";
import { isReservedProjectSlug, isValidProjectSlugFormat } from "../lib/projectLinks";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function statusOf(p: CustomPageSummary): { label: string; tone: string } {
  if (!p.is_published) return { label: "Draft", tone: "bg-ink-muted/15 text-ink-muted" };
  if (p.visibility === "private") return { label: "Private", tone: "bg-ink-muted/15 text-ink-muted" };
  if (p.has_unpublished_changes) return { label: "Live · changes not published", tone: "bg-pushback/20 text-ink" };
  return { label: p.visibility === "unlisted" ? "Live · unlisted" : "Live", tone: "bg-accent-soft text-accent" };
}

export function CustomPages() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const { data: pages, isLoading, isError, refetch } = useMyCustomPages();
  const [creating, setCreating] = useState(false);

  // Arrived from someone's "Create your own" link: remember who, then open the form straight away.
  useEffect(() => {
    const ref = params.get("ref");
    if (ref) {
      rememberReferrer(ref);
      setCreating(true);
    }
  }, [params]);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="sticky top-0 z-10 bg-canvas/95 backdrop-blur px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1.5 -ml-1.5 text-ink">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-xl font-semibold text-ink flex-1">Custom pages</h1>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-full bg-cta text-canvas text-sm font-medium px-4 py-2">
          <Plus size={16} /> New
        </button>
      </header>

      <main className="px-4 max-w-xl mx-auto">
        <p className="text-sm text-ink-muted leading-relaxed mb-5">
          A custom page is a small website that lives at its own link on Akọ, like <span className="text-ink">myako.site/your-name</span>. Use it
          for an event, a church, a shop, a brochure or a portfolio.
        </p>

        {isLoading && <p className="text-ink-muted text-sm">Loading…</p>}
        {isError && (
          <div className="text-center py-10">
            <p className="text-sm text-ink-muted">Couldn't load your pages.</p>
            <button onClick={() => void refetch()} className="mt-3 text-accent text-sm font-medium">
              Retry
            </button>
          </div>
        )}

        {pages && pages.length === 0 && (
          <div className="text-center py-14">
            <LayoutTemplate size={36} className="mx-auto text-ink-muted mb-3" />
            <p className="text-ink font-medium">No custom pages yet</p>
            <p className="text-sm text-ink-muted mt-1">Create one in a few minutes. No domain or code needed.</p>
            <button onClick={() => setCreating(true)} className="mt-5 rounded-full bg-cta text-canvas text-sm font-medium px-6 py-3">
              Create a custom page
            </button>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {pages?.map((p) => {
            const s = statusOf(p);
            const icon = publicFileUrl(p.icon_path);
            return (
              <li key={p.id}>
                <Link to={`/me/custom-pages/${p.id}`} className="flex items-center gap-3.5 rounded-2xl bg-surface border border-border p-3.5">
                  <span className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center overflow-hidden shrink-0">
                    {icon ? <img src={icon} alt="" className="w-full h-full object-cover" /> : <LayoutTemplate size={20} className="text-accent" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-ink font-medium truncate">{p.name}</span>
                    <span className="block text-xs text-ink-muted truncate">myako.site/{p.slug}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span className={`rounded-full px-2 py-0.5 ${s.tone}`}>{s.label}</span>
                      {p.is_published && (
                        <span className="inline-flex items-center gap-1">
                          <Eye size={12} /> {p.views_30d}
                        </span>
                      )}
                      {p.new_inquiries > 0 && (
                        <span className="inline-flex items-center gap-1 text-accent font-medium">
                          <Inbox size={12} /> {p.new_inquiries} new
                        </span>
                      )}
                      {p.visibility === "private" ? <Lock size={12} /> : <Globe size={12} className="opacity-60" />}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>

      {creating && (
        <CreateDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            toast("Page created. Add your content next.", { variant: "success" });
            navigate(`/me/custom-pages/${id}/edit`);
          }}
        />
      )}
    </div>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const create = useCreateCustomPage();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const formatProblem = useMemo(() => {
    if (!effectiveSlug) return null;
    if (!isValidProjectSlugFormat(effectiveSlug)) return "Use 3–60 lowercase letters, numbers and single hyphens.";
    if (isReservedProjectSlug(effectiveSlug)) return "That link is reserved. Try another.";
    return null;
  }, [effectiveSlug]);

  // Debounced availability check once the format is valid.
  useEffect(() => {
    setAvailable(null);
    if (!effectiveSlug || formatProblem) return;
    const t = window.setTimeout(() => {
      checkCustomPageSlugAvailable(effectiveSlug)
        .then(setAvailable)
        .catch(() => setAvailable(null));
    }, 350);
    return () => window.clearTimeout(t);
  }, [effectiveSlug, formatProblem]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const row = await create.mutateAsync({ name: name.trim(), slug: effectiveSlug, refSlug: takeReferrer() });
      onCreated(row.id);
    } catch (err) {
      setError(friendlyError(err, "Couldn't create the page. Please try again."));
    }
  }

  const ok = name.trim().length > 0 && !formatProblem && effectiveSlug.length >= 3 && available !== false;
  const field =
    "w-full rounded-xl bg-overlay-surface-raised text-overlay-ink placeholder:text-overlay-ink-muted/60 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-overlay-accent";

  return (
    <Modal onClose={onClose} title="New custom page" maxWidthClass="max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-xs text-overlay-ink-muted">Page name</label>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="St. Anne's Harvest" autoFocus />
        <label className="text-xs text-overlay-ink-muted mt-1">Page link</label>
        <div className="flex items-center rounded-xl bg-overlay-surface-raised pl-4 focus-within:ring-2 focus-within:ring-overlay-accent">
          <span className="text-overlay-ink-muted text-[15px] shrink-0">myako.site/</span>
          <input
            className="flex-1 min-w-0 bg-transparent text-overlay-ink px-1 py-3 text-[15px] focus:outline-none"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
            }}
            maxLength={60}
            placeholder="st-anne"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <p className="text-xs min-h-[16px]" aria-live="polite">
          {formatProblem ? (
            <span className="text-overlay-danger">{formatProblem}</span>
          ) : available === false ? (
            <span className="text-overlay-danger">That link is already taken.</span>
          ) : available === true ? (
            <span className="text-overlay-accent">{customPageUrl(effectiveSlug).replace("https://", "")} is available.</span>
          ) : null}
        </p>
        {error && <p className="text-sm text-overlay-danger">{error}</p>}
        <button type="submit" disabled={!ok || create.isPending} className="mt-1 w-full py-3 rounded-full bg-overlay-accent text-overlay-surface text-sm font-medium disabled:opacity-50">
          {create.isPending ? "Creating…" : "Create page"}
        </button>
      </form>
    </Modal>
  );
}
