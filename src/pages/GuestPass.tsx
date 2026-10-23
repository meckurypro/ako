// src/pages/GuestPass.tsx
//
// /pass/:token — the public face of a Guest Pass. Anyone with the link sees the project's content, signed in or not,
// for as long as the pass lives, with a live countdown. When it runs out (or was revoked) the content is withdrawn
// on the spot and the visitor gets a plain "expired" screen with a relevant next step. Public route: no RequireAuth.
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Clock, KeyRound, Download, Play, ChevronDown, Lock, ExternalLink } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useCountdown } from "../hooks/useCountdown";
import {
  GuestPassExpiredError,
  useGuestPassFile,
  useGuestPassView,
  usePassDeadline,
  type GuestPassView,
} from "../hooks/useGuestPass";
import { useQueryClient } from "@tanstack/react-query";
import { formatPassRemaining } from "../lib/guestPass";
import { formatFileSize } from "../lib/chatMedia";
import { getProjectPath } from "../lib/projectLinks";
import { signupPathFor, loginPathFor } from "../lib/authRedirect";
import { PROJECT_TYPE_LABELS, type ProjectType } from "../hooks/useProjects";
import { Wordmark } from "../components/Wordmark";
import { Avatar } from "../components/Avatar";
import { BookRichText } from "../components/BookRichText";
import { parseBook } from "../lib/bookFormat";
import { useToast } from "../components/Toast";
import { SafeAudio } from "../components/MediaPlaceholder";

// A link is only ever opened if it is plain http(s) — never javascript:/data: from a database column.
function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function startDownload(url: string, name?: string) {
  const a = document.createElement("a");
  a.href = url;
  if (name) a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function Shell({ children, countdown }: { children: React.ReactNode; countdown?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-border">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" aria-label="Akọ home">
            <Wordmark size="sm" />
          </Link>
          {countdown}
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 pt-5 pb-24">{children}</main>
    </div>
  );
}

function CountdownPill({ remainingMs }: { remainingMs: number | null }) {
  if (remainingMs === null) return null;
  const urgent = remainingMs < 10 * 60 * 1000;
  const critical = remainingMs < 60 * 1000;
  const tone = critical ? "text-danger border-danger/40" : urgent ? "text-pushback border-pushback/40" : "text-ink border-border";
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border bg-canvas px-3 py-1 text-xs font-medium tabular-nums ${tone}`}
      role="timer"
      aria-label="Time left on this link"
    >
      <Clock size={13} />
      <span className="text-ink-muted font-normal">Link ends in</span>
      {formatPassRemaining(remainingMs)}
    </div>
  );
}

// ----------------------------------------------------------------- expired / invalid
function EndedScreen({ view, signedIn }: { view: GuestPassView | undefined; signedIn: boolean }) {
  const status = view?.status ?? "not_found";
  const creator = view?.page?.name ?? view?.creator?.display_name ?? view?.creator?.username ?? null;
  const creatorUsername = view?.page ? view.page.username : view?.creator?.username ?? null;
  const creatorProfilePath = view?.page ? `/page/${creatorUsername}` : `/profile/${creatorUsername}`;
  const publicPath = view?.project_id ? getProjectPath({ id: view.project_id, slug: view.project_slug }) : null;

  const heading =
    status === "revoked"
      ? "This link was turned off"
      : status === "unavailable"
        ? "This project isn't available anymore"
        : status === "not_found"
          ? "This link isn't valid"
          : "This link has expired";
  const body =
    status === "not_found"
      ? "Check that the whole link was copied, or ask whoever sent it to share it again."
      : status === "unavailable"
        ? "The creator has taken it down."
        : `Guest links only work for a short while.${creator ? ` Ask ${creator} for a fresh one.` : " Ask the creator for a fresh one."}`;

  return (
    <Shell>
      <div className="flex flex-col items-center text-center pt-10">
        <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center mb-4">
          <Clock size={26} className="text-accent" />
        </div>
        <h1 className="font-display text-xl font-semibold text-ink">{heading}</h1>
        {view?.project_title && <p className="text-sm text-ink mt-2 font-medium">{view.project_title}</p>}
        <p className="text-sm text-ink-muted mt-2 max-w-xs">{body}</p>

        <div className="mt-7 w-full max-w-xs flex flex-col gap-2.5">
          {creatorUsername && status !== "not_found" && (
            <Link
              to={signedIn ? creatorProfilePath : signupPathFor(creatorProfilePath)}
              className="rounded-xl bg-accent text-canvas py-3 text-sm font-medium"
            >
              {signedIn ? `Message ${creator ?? "the creator"} for a new link` : `Join Akọ to ask ${creator ?? "the creator"}`}
            </Link>
          )}
          {publicPath && (
            <Link to={publicPath} className="rounded-xl bg-accent-soft text-accent py-3 text-sm font-medium">
              View the project page
            </Link>
          )}
          {!signedIn && (
            <Link
              to={loginPathFor(creatorUsername && status !== "not_found" ? creatorProfilePath : null)}
              className="text-sm font-medium text-accent py-2"
            >
              I already have an account
            </Link>
          )}
          {signedIn && !creatorUsername && (
            <Link to="/feed" className="rounded-xl bg-accent text-canvas py-3 text-sm font-medium">
              Go to your feed
            </Link>
          )}
        </div>
      </div>
    </Shell>
  );
}

// ----------------------------------------------------------------- content blocks
function LinkButton({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-accent text-canvas px-5 py-2.5 text-sm font-medium"
    >
      <ExternalLink size={15} />
      {children}
    </a>
  );
}

/** Fetches a signed URL on demand; an expiry answer from the server flips the whole page to "expired". */
function useFileFetcher(token: string, onExpired: () => void) {
  const fetcher = useGuestPassFile(token);
  const toast = useToast();
  async function get(args: Parameters<typeof fetcher.mutateAsync>[0]) {
    try {
      return await fetcher.mutateAsync(args);
    } catch (e) {
      if (e instanceof GuestPassExpiredError) onExpired();
      else toast(e instanceof Error ? e.message : "Couldn't open that file.", { variant: "error" });
      return null;
    }
  }
  return { get, pending: fetcher.isPending };
}

function HostedMedia({
  kind,
  token,
  onExpired,
  autoLoad,
}: {
  kind: "audio" | "video" | "image";
  token: string;
  onExpired: () => void;
  autoLoad?: boolean;
}) {
  const { get, pending } = useFileFetcher(token, onExpired);
  const [src, setSrc] = useState<string | null>(null);
  const started = useRef(false);

  async function load() {
    const r = await get({ kind, action: "stream" });
    if (r) setSrc(r.url);
  }
  useEffect(() => {
    if (autoLoad && !started.current) {
      started.current = true;
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  if (!src) {
    return autoLoad ? (
      <div className="h-40 rounded-2xl bg-surface border border-border animate-pulse" />
    ) : (
      <button
        onClick={() => void load()}
        disabled={pending}
        className="flex items-center gap-2 rounded-full bg-accent text-canvas px-5 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        <Play size={15} />
        {pending ? "Loading…" : kind === "audio" ? "Play audio" : "Play video"}
      </button>
    );
  }
  if (kind === "image") return <img src={src} alt="" className="w-full rounded-2xl border border-border" />;
  if (kind === "audio") return <SafeAudio src={src} autoPlay className="w-full" />;
  return <video src={src} controls autoPlay playsInline className="w-full rounded-2xl bg-black" />;
}

function MediaContent({ detail, token, onExpired }: { detail: GuestPassView["detail"]; token: string; onExpired: () => void }) {
  const d = detail ?? {};
  const channels: { kind: "audio" | "video" | "image"; label: string }[] = [
    { kind: "video", label: "Video" },
    { kind: "audio", label: "Audio" },
    { kind: "image", label: "Image" },
  ];
  return (
    <div className="flex flex-col gap-5">
      {channels.map(({ kind, label }) => {
        if (!d[`has_${kind}`]) return null;
        const hosted = !!d[`${kind}_hosted`];
        const href = safeHref(d[`${kind}_url`]);
        return (
          <div key={kind}>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-2">{label}</p>
            {hosted ? (
              <HostedMedia kind={kind} token={token} onExpired={onExpired} autoLoad={kind === "image"} />
            ) : (
              <LinkButton href={href}>{kind === "image" ? "Open image" : kind === "audio" ? "Listen" : "Watch"}</LinkButton>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FileContent({ detail, token, onExpired }: { detail: GuestPassView["detail"]; token: string; onExpired: () => void }) {
  const files = (detail?.files ?? []) as { id: string; name: string; size_bytes: number | null }[];
  const { get, pending } = useFileFetcher(token, onExpired);
  const [busyId, setBusyId] = useState<string | null>(null);
  if (!files.length) return <p className="text-sm text-ink-muted">Nothing has been uploaded yet.</p>;
  return (
    <div className="flex flex-col gap-2">
      {files.map((f) => (
        <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">{f.name}</p>
            {f.size_bytes ? <p className="text-xs text-ink-muted">{formatFileSize(f.size_bytes)}</p> : null}
          </div>
          <button
            disabled={pending}
            onClick={async () => {
              setBusyId(f.id);
              const r = await get({ kind: "file", fileId: f.id });
              setBusyId(null);
              if (r) startDownload(r.url, r.file_name ?? f.name);
            }}
            className="flex items-center gap-1.5 rounded-full bg-accent text-canvas px-3.5 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            <Download size={14} />
            {busyId === f.id ? "Preparing…" : "Download"}
          </button>
        </div>
      ))}
    </div>
  );
}

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-ink">{title}</span>
        <ChevronDown size={16} className={`text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function BookContent({ detail, token, onExpired }: { detail: GuestPassView["detail"]; token: string; onExpired: () => void }) {
  const d = detail ?? {};
  const chapters = (d.chapters ?? []) as { id: string; title: string | null; content: string | null }[];
  const { get, pending } = useFileFetcher(token, onExpired);
  const href = safeHref(d.external_url);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {d.hosted && d.allow_read_in_app && (
          <button
            disabled={pending}
            onClick={async () => {
              const r = await get({ kind: "book", action: "stream" });
              if (r) window.open(r.url, "_blank", "noopener,noreferrer");
            }}
            className="flex items-center gap-2 rounded-full bg-accent text-canvas px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            <Play size={15} /> Read the book
          </button>
        )}
        {d.hosted && d.allow_download && (
          <button
            disabled={pending}
            onClick={async () => {
              const r = await get({ kind: "book", action: "download" });
              if (r) startDownload(r.url);
            }}
            className="flex items-center gap-2 rounded-full bg-accent-soft text-accent px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            <Download size={15} /> Download
          </button>
        )}
        <LinkButton href={href}>Open the book</LinkButton>
      </div>
      {chapters.map((c, i) =>
        c.content ? (
          <Disclosure key={c.id} title={c.title || `Chapter ${i + 1}`}>
            <BookRichText
              blocks={parseBook(c.content)}
              ink="var(--color-ink)"
              muted="var(--color-ink-muted)"
              accent="var(--color-accent)"
              fontSize={16}
              lineHeight={1.65}
            />
          </Disclosure>
        ) : null,
      )}
    </div>
  );
}

function CourseContent({ detail }: { detail: GuestPassView["detail"] }) {
  const modules = (detail?.modules ?? []) as {
    id: string;
    title: string;
    lessons: { id: string; title: string; content: string | null; media_url: string | null }[];
  }[];
  if (!modules.length) return <p className="text-sm text-ink-muted">The course has no lessons yet.</p>;
  return (
    <div className="flex flex-col gap-4">
      {modules.map((m) => (
        <div key={m.id}>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-2">{m.title}</p>
          <div className="flex flex-col gap-2">
            {m.lessons.map((l) => (
              <Disclosure key={l.id} title={l.title}>
                {l.content && <p className="text-sm text-ink whitespace-pre-wrap break-words">{l.content}</p>}
                {safeHref(l.media_url) && (
                  <div className="mt-3">
                    <LinkButton href={safeHref(l.media_url)}>Open lesson media</LinkButton>
                  </div>
                )}
                {!l.content && !l.media_url && <p className="text-sm text-ink-muted">No content in this lesson.</p>}
              </Disclosure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Live-participation types: the pass shows what they are, but taking part (tickets, rooms, calls, booking, backing)
// is an account thing.
function ParticipationNote({ type, detail }: { type: string; detail: GuestPassView["detail"] }) {
  const d = detail ?? {};
  const when = (d.event_date ?? d.scheduled_at) as string | undefined;
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-ink-muted">
      {when && (
        <p className="text-ink font-medium mb-1">
          {new Date(when).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
        </p>
      )}
      {type === "gig" && d.tagline && <p className="text-ink font-medium mb-1">{d.tagline}</p>}
      {type === "gig" && d.delivery_estimate && <p>Delivery: {d.delivery_estimate}</p>}
      {Array.isArray(d.deliverables) && d.deliverables.length > 0 && (
        <ul className="mt-1.5 list-disc pl-5">
          {d.deliverables.map((x: string, i: number) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 flex items-center gap-1.5">
        <Lock size={13} /> Taking part in this {PROJECT_TYPE_LABELS[type as ProjectType]?.toLowerCase() ?? "project"} needs an Akọ account.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------- page
export function GuestPass() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useGuestPassView(token);
  const view = query.data;
  const deadline = usePassDeadline(view, query.dataUpdatedAt || undefined);
  const remaining = useCountdown(view?.status === "valid" ? deadline : null);
  const [forcedEnd, setForcedEnd] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = view?.status === "valid" && view.project ? `${view.project.title} · Akọ` : "Guest link · Akọ";
    return () => {
      document.title = previous;
    };
  }, [view]);

  // The moment the countdown reaches zero, withdraw the content right here — no reload needed.
  const timeUp = remaining !== null && remaining <= 0;
  const ended = forcedEnd || timeUp;
  useEffect(() => {
    if (ended && token) {
      // Drop the cached content so it can't be shown again from memory; the next read gets the truthful answer.
      queryClient.removeQueries({ queryKey: ["guest-pass", token] });
    }
  }, [ended, token, queryClient]);

  if (query.isLoading) {
    return (
      <Shell>
        <div className="h-48 rounded-2xl bg-surface border border-border animate-pulse" />
        <div className="h-6 w-2/3 rounded bg-surface mt-5 animate-pulse" />
      </Shell>
    );
  }

  if (query.isError) {
    return (
      <Shell>
        <div className="text-center pt-14">
          <h1 className="font-display text-xl font-semibold text-ink">Couldn't open this link</h1>
          <p className="text-sm text-ink-muted mt-2">Check your connection and try again.</p>
          <button onClick={() => void query.refetch()} className="mt-5 text-accent text-sm font-medium">
            Retry
          </button>
        </div>
      </Shell>
    );
  }

  if (ended) {
    // Show the expired screen with what we already know about who to ask; refetch is intentionally skipped (it would
    // only repeat what the countdown already told us) — except we lost the creator info when we dropped the cache, so
    // keep a minimal snapshot from the last valid view.
    return (
      <EndedScreen
        view={
          view?.status === "valid"
            ? {
                status: "expired",
                server_now: view.server_now,
                creator: view.creator,
                page: view.page,
                project_title: view.project?.is_private ? null : view.project?.title,
                project_id: view.project?.is_private ? null : view.project?.id,
                project_slug: view.project?.is_private ? null : view.project?.slug,
              }
            : view
        }
        signedIn={!!user}
      />
    );
  }

  if (!view || view.status !== "valid" || !view.project || !token) {
    return <EndedScreen view={view} signedIn={!!user} />;
  }

  const p = view.project;
  const type = p.project_type;
  const owner = view.page ? { name: view.page.name, avatar: view.page.avatar_url } : { name: view.creator?.display_name || view.creator?.username || "", avatar: view.creator?.avatar_url ?? null };
  const onExpired = () => setForcedEnd(true);
  const extraImages = (p.supporting_image_urls ?? []).filter(Boolean);

  return (
    <Shell countdown={<CountdownPill remainingMs={remaining} />}>
      <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-3">
        <KeyRound size={13} className="text-accent" />
        Guest pass — you're viewing this without an account
      </div>

      {p.thumbnail_url && (
        <img src={p.thumbnail_url} alt="" className="w-full rounded-2xl border border-border object-cover max-h-80" />
      )}

      <div className="mt-4 flex items-center gap-2">
        <span className="rounded-full bg-accent-soft text-accent text-xs font-medium px-2.5 py-0.5">
          {PROJECT_TYPE_LABELS[type as ProjectType] ?? type}
        </span>
        {p.is_private && (
          <span className="flex items-center gap-1 rounded-full bg-canvas border border-border text-ink-muted text-xs px-2.5 py-0.5">
            <Lock size={11} /> Private
          </span>
        )}
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-2">{p.title}</h1>
      {owner.name && (
        <div className="flex items-center gap-2 mt-2">
          <Avatar src={owner.avatar} name={owner.name} size="sm" />
          <span className="text-sm text-ink-muted">{owner.name}</span>
        </div>
      )}
      {p.description && (
        <p className="text-sm text-ink-muted mt-4 whitespace-pre-wrap break-words">{p.description}</p>
      )}

      {extraImages.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {extraImages.map((src, i) => (
            <img key={i} src={src} alt="" className="h-40 rounded-xl border border-border flex-none" />
          ))}
        </div>
      )}

      <div className="mt-6">
        {type === "url" && (safeHref(p.external_url) ? <LinkButton href={safeHref(p.external_url)}>Open link</LinkButton> : null)}
        {type === "media" && <MediaContent detail={view.detail} token={token} onExpired={onExpired} />}
        {type === "file" && <FileContent detail={view.detail} token={token} onExpired={onExpired} />}
        {type === "book" && <BookContent detail={view.detail} token={token} onExpired={onExpired} />}
        {type === "course" && <CourseContent detail={view.detail} />}
        {["event", "meeting", "room", "gig", "pitch"].includes(type) && <ParticipationNote type={type} detail={view.detail} />}
      </div>

      {!user && (
        <div className="mt-10 rounded-2xl bg-accent-soft px-5 py-5 text-center">
          <p className="text-sm font-medium text-ink">Like what you see?</p>
          <p className="text-xs text-ink-muted mt-1">Akọ is where people say, make, teach, host and share.</p>
          <Link
            to={signupPathFor(p.slug ? getProjectPath({ id: p.id, slug: p.slug }) : null)}
            className="inline-flex mt-3 rounded-full bg-accent text-canvas px-5 py-2 text-sm font-medium"
          >
            Join Akọ
          </Link>
        </div>
      )}
    </Shell>
  );
}
