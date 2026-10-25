// src/pages/CustomPageManage.tsx
// /me/custom-pages/:id — one page's control room: link + QR, publish state, visibility, analytics and inquiries.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { ArrowLeft, Copy, Download, ExternalLink, Pencil, Trash2 } from "lucide-react";
import {
  checkCustomPageSlugAvailable,
  useCustomPage,
  useCustomPageInquiries,
  useCustomPageStats,
  useDeleteCustomPage,
  usePublishCustomPage,
  useSetCustomPageSlug,
  useSetCustomPageVisibility,
  useSetInquiryStatus,
  useUnpublishCustomPage,
} from "../hooks/useCustomPages";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { friendlyError } from "../lib/friendlyError";
import { isReservedProjectSlug, isValidProjectSlugFormat } from "../lib/projectLinks";
import { customPageUrl, type CustomPageInquiry } from "../lib/customPage";
import { timeAgo } from "../lib/timeAgo";

const VISIBILITY = [
  { value: "public", label: "Public", hint: "Anyone with the link." },
  { value: "unlisted", label: "Unlisted", hint: "Anyone with the link. Not offered anywhere else." },
  { value: "private", label: "Private", hint: "Only you can open it." },
] as const;

export function CustomPageManage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: page, isLoading, isError } = useCustomPage(id);
  const publish = usePublishCustomPage();
  const unpublish = useUnpublishCustomPage();
  const setVisibility = useSetCustomPageVisibility();
  const del = useDeleteCustomPage();
  const [days, setDays] = useState(30);
  const stats = useCustomPageStats(page?.is_published ? id : undefined, days);
  const inquiries = useCustomPageInquiries(id);
  const [qr, setQr] = useState<string | null>(null);
  const [slugOpen, setSlugOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const url = page ? customPageUrl(page.slug) : "";
  useEffect(() => {
    if (!url) return;
    let alive = true;
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M" })
      .then((d) => alive && setQr(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [url]);

  if (isLoading) return <div className="min-h-screen bg-canvas p-4 text-ink-muted">Loading…</div>;
  if (isError || !page) {
    return (
      <div className="min-h-screen bg-canvas p-6 text-center">
        <p className="text-ink font-medium mt-16">This page couldn't be found.</p>
        <Link to="/me/custom-pages" className="mt-4 inline-block text-accent text-sm font-medium">
          Back to your pages
        </Link>
      </div>
    );
  }

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast(ok, { variant: "success" });
    } catch (err) {
      toast(friendlyError(err, "Something went wrong. Please try again."), { variant: "error", duration: 3500 });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied.", { variant: "success" });
    } catch {
      toast("Couldn't copy. Select the link and copy it.", { variant: "error" });
    }
  };

  const maxDaily = Math.max(1, ...(stats.data?.daily.map((d) => d.views) ?? [1]));
  const ctaLabel = (cta: string) => (cta === "document" ? "Document" : (page.draft.ctas ?? []).find((c) => c.id === cta)?.label ?? cta);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="sticky top-0 z-10 bg-canvas/95 backdrop-blur px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/me/custom-pages")} aria-label="Back" className="p-1.5 -ml-1.5 text-ink">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-xl font-semibold text-ink flex-1 truncate">{page.name}</h1>
        <Link to={`/me/custom-pages/${page.id}/edit`} className="inline-flex items-center gap-1.5 rounded-full bg-cta text-canvas text-sm font-medium px-4 py-2">
          <Pencil size={14} /> Edit
        </Link>
      </header>

      <main className="px-4 max-w-xl mx-auto flex flex-col gap-5">
        {/* Link + QR */}
        <section className="rounded-2xl bg-surface border border-border p-4">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${page.is_published ? "bg-accent-soft text-accent" : "bg-ink-muted/15 text-ink-muted"}`}>
              {page.is_published ? "Published" : "Draft"}
            </span>
            <span className="text-sm text-ink truncate">{url.replace("https://", "")}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent text-sm font-medium px-4 py-2">
              <Copy size={14} /> Copy link
            </button>
            <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent text-sm font-medium px-4 py-2">
              <ExternalLink size={14} /> {page.is_published ? "Open page" : "Preview"}
            </a>
            <button onClick={() => setSlugOpen(true)} className="rounded-full border border-border text-ink-muted text-sm font-medium px-4 py-2">
              Change link
            </button>
          </div>
          {qr && (
            <div className="mt-4 flex items-center gap-4">
              <img src={qr} alt={`QR code for ${url}`} className="w-28 h-28 rounded-lg bg-white p-1" />
              <div>
                <p className="text-sm text-ink font-medium">QR code</p>
                <p className="text-xs text-ink-muted mt-0.5 mb-2 leading-snug">For flyers, banners and screens. It always points to your page's current link.</p>
                <a href={qr} download={`${page.slug}-qr.png`} className="inline-flex items-center gap-1.5 text-accent text-sm font-medium">
                  <Download size={14} /> Download
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Publish + visibility */}
        <section className="rounded-2xl bg-surface border border-border p-4">
          <h2 className="text-sm font-semibold text-ink mb-3">Publishing</h2>
          {page.is_published ? (
            <button
              onClick={() => void act(() => unpublish.mutateAsync(page.id), "Unpublished. Visitors can no longer see this page.")}
              disabled={unpublish.isPending}
              className="rounded-full border border-border text-ink text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => void act(() => publish.mutateAsync(page.id), "Published. Your page is live.")}
              disabled={publish.isPending}
              className="rounded-full bg-cta text-canvas text-sm font-medium px-5 py-2 disabled:opacity-50"
            >
              Publish page
            </button>
          )}
          <div className="mt-4 grid gap-2">
            {VISIBILITY.map((v) => (
              <label key={v.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  className="mt-1 accent-[var(--color-accent)]"
                  checked={page.visibility === v.value}
                  onChange={() => void act(() => setVisibility.mutateAsync({ id: page.id, visibility: v.value }), "Visibility updated.")}
                />
                <span>
                  <span className="block text-sm text-ink">{v.label}</span>
                  <span className="block text-xs text-ink-muted">{v.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Analytics */}
        <section className="rounded-2xl bg-surface border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Analytics</h2>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-transparent text-sm text-ink-muted focus:outline-none">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          {!page.is_published ? (
            <p className="text-sm text-ink-muted">Publish your page to start seeing views and clicks.</p>
          ) : stats.isLoading ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : stats.data ? (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  ["Views", stats.data.views],
                  ["Visitors", stats.data.visitors],
                  ["Button clicks", stats.data.clicks],
                  ["Downloads", stats.data.downloads],
                  ["Messages", stats.data.inquiries],
                  ["Sign-up clicks", stats.data.create_clicks],
                ].map(([label, n]) => (
                  <div key={label as string} className="rounded-xl bg-canvas p-3 text-center">
                    <div className="text-xl font-semibold text-ink">{n as number}</div>
                    <div className="text-[11px] text-ink-muted mt-0.5">{label as string}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-[2px] h-16 mt-4" aria-label="Views per day">
                {stats.data.daily.map((d) => (
                  <div key={d.day} title={`${d.day}: ${d.views}`} className="flex-1 bg-accent/70 rounded-sm min-h-[2px]" style={{ height: `${Math.max(3, (d.views / maxDaily) * 100)}%` }} />
                ))}
              </div>
              {stats.data.per_cta.length > 0 && (
                <ul className="mt-4 divide-y divide-border">
                  {stats.data.per_cta.map((r) => (
                    <li key={`${r.cta_id}-${r.event_type}`} className="flex justify-between py-2 text-sm">
                      <span className="text-ink truncate pr-3">
                        {ctaLabel(r.cta_id)} <span className="text-ink-muted text-xs">· {r.event_type === "download" ? "downloads" : "clicks"}</span>
                      </span>
                      <span className="text-ink font-medium">{r.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </section>

        {/* Inquiries */}
        <InquiryList pageId={page.id} items={inquiries.data} loading={inquiries.isLoading} />

        <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center justify-center gap-2 text-danger text-sm font-medium py-3">
          <Trash2 size={15} /> Delete this page
        </button>
      </main>

      {slugOpen && <SlugDialog pageId={page.id} current={page.slug} onClose={() => setSlugOpen(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this page?"
          description="The link stops working and its messages and analytics are removed. This can't be undone."
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            void act(async () => {
              await del.mutateAsync(page.id);
              navigate("/me/custom-pages", { replace: true });
            }, "Page deleted.");
          }}
        />
      )}
    </div>
  );
}

function InquiryList({ pageId, items, loading }: { pageId: string; items?: CustomPageInquiry[]; loading: boolean }) {
  const setStatus = useSetInquiryStatus(pageId);
  const [showArchived, setShowArchived] = useState(false);
  const visible = (items ?? []).filter((i) => showArchived || i.status !== "archived");
  const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
  return (
    <section className="rounded-2xl bg-surface border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink">Messages</h2>
        <button onClick={() => setShowArchived((v) => !v)} className="text-xs text-ink-muted">
          {showArchived ? "Hide archived" : "Show archived"}
        </button>
      </div>
      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {!loading && visible.length === 0 && <p className="text-sm text-ink-muted">Messages sent from your page appear here.</p>}
      <ul className="flex flex-col gap-3">
        {visible.map((q) => (
          <li key={q.id} className={`rounded-xl p-3 ${q.status === "new" ? "bg-accent-soft" : "bg-canvas"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {q.name} {q.status === "new" && <span className="ml-1 text-[10px] uppercase tracking-wide text-accent">new</span>}
                </p>
                <a href={isEmail(q.contact) ? `mailto:${q.contact}` : `tel:${q.contact.replace(/[^\d+]/g, "")}`} className="text-xs text-accent break-all">
                  {q.contact}
                </a>
              </div>
              <span className="text-[11px] text-ink-muted shrink-0">{timeAgo(q.created_at)}</span>
            </div>
            {q.subject && <p className="text-sm text-ink font-medium mt-2">{q.subject}</p>}
            <p className="text-sm text-ink mt-1 whitespace-pre-line break-words">{q.message}</p>
            <div className="flex gap-4 mt-2.5 text-xs">
              {q.status === "new" && (
                <button onClick={() => setStatus.mutate({ id: q.id, status: "read" })} className="text-accent font-medium">
                  Mark as read
                </button>
              )}
              <button onClick={() => setStatus.mutate({ id: q.id, status: q.status === "archived" ? "read" : "archived" })} className="text-ink-muted">
                {q.status === "archived" ? "Unarchive" : "Archive"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SlugDialog({ pageId, current, onClose }: { pageId: string; current: string; onClose: () => void }) {
  const setSlug = useSetCustomPageSlug();
  const toast = useToast();
  const [slug, setSlugValue] = useState(current);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clean = slug.trim().toLowerCase();
  const formatProblem = !isValidProjectSlugFormat(clean) ? "Use 3–60 lowercase letters, numbers and single hyphens." : isReservedProjectSlug(clean) ? "That link is reserved." : null;

  useEffect(() => {
    setAvailable(null);
    if (formatProblem || clean === current) return;
    const t = window.setTimeout(() => {
      checkCustomPageSlugAvailable(clean, pageId)
        .then(setAvailable)
        .catch(() => setAvailable(null));
    }, 350);
    return () => window.clearTimeout(t);
  }, [clean, current, formatProblem, pageId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await setSlug.mutateAsync({ id: pageId, slug: clean });
      toast("Link updated. The old link keeps working.", { variant: "success" });
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Couldn't change the link."));
    }
  }

  return (
    <Modal onClose={onClose} title="Change page link" maxWidthClass="max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex items-center rounded-xl bg-overlay-surface-raised pl-4 focus-within:ring-2 focus-within:ring-overlay-accent">
          <span className="text-overlay-ink-muted text-[15px] shrink-0">myako.site/</span>
          <input className="flex-1 min-w-0 bg-transparent text-overlay-ink px-1 py-3 text-[15px] focus:outline-none" value={slug} onChange={(e) => setSlugValue(e.target.value)} maxLength={60} autoCapitalize="none" autoCorrect="off" autoFocus />
        </div>
        <p className="text-xs text-overlay-ink-muted leading-snug">People using your old link are redirected to the new one, so printed QR codes and shared links keep working.</p>
        <p className="text-xs min-h-[16px]">{formatProblem ? <span className="text-overlay-danger">{formatProblem}</span> : available === false ? <span className="text-overlay-danger">That link is already taken.</span> : null}</p>
        {error && <p className="text-sm text-overlay-danger">{error}</p>}
        <button type="submit" disabled={!!formatProblem || available === false || clean === current || setSlug.isPending} className="w-full py-3 rounded-full bg-overlay-accent text-overlay-surface text-sm font-medium disabled:opacity-50">
          {setSlug.isPending ? "Saving…" : "Save link"}
        </button>
      </form>
    </Modal>
  );
}
