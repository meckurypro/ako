// api/share.ts
//
// Link-preview ("unfurl") endpoint. The app is a client-rendered SPA, so a
// crawler fetching /:slug only ever sees the generic index.html — no project
// title or image. vercel.json routes requests from known link-preview bots
// (WhatsApp, Facebook, X/Twitter, Slack, Telegram, LinkedIn, Discord, iMessage,
// search engines…) here instead. Humans never hit this: they get the SPA.
//
// Data minimisation: only a public, active, non-private project contributes
// its title / short description / thumbnail. Everything else (private,
// draft, missing, lookup failure) gets the generic Akọ card, so a preview can
// never reveal more than the public page already does. No file paths, link
// targets or media URLs are ever emitted.

import type { IncomingMessage, ServerResponse } from "node:http";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

const SITE_NAME = "Akọ";
const DEFAULT_TITLE = "Akọ — A Reason To Reason";
const DEFAULT_DESCRIPTION = "Discover and share projects, books, courses, events and more on Akọ.";
const FETCH_TIMEOUT_MS = 4000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const TYPE_LABELS: Record<string, string> = {
  file: "File",
  url: "Link",
  media: "Media",
  event: "Event",
  meeting: "Meeting",
  room: "Cohort",
  course: "Course",
  gig: "Gig",
  pitch: "Pitch",
  book: "Book",
};

interface PreviewProject {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  project_type: string;
  price_usd: number;
  promo_price_usd: number | null;
  status: string;
  is_private: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strip the app's inline formatting markers (*bold* _italic_ ~strike~ [u]…[/u])
// and collapse whitespace so previews read as plain text.
function plainText(input: string | null | undefined, max: number): string {
  if (!input) return "";
  const text = input
    .replace(/\[\/?u\]/g, "")
    .replace(/(\*|_|~)([^*_~\n]+)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function httpsOnly(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function priceLabel(p: PreviewProject): string {
  const price = p.promo_price_usd ?? p.price_usd;
  if (p.project_type === "pitch" || p.project_type === "gig") return "";
  return price <= 0 ? "Free" : `$${price.toFixed(2)}`;
}

async function supabaseFetch(path: string, init: RequestInit): Promise<unknown> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase env not configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

async function lookupProject(slug: string | null, id: string | null): Promise<PreviewProject | null> {
  if (slug && SLUG.test(slug)) {
    // Same RPC the SPA uses, so retired slugs resolve to their project too.
    const rows = (await supabaseFetch("rpc/resolve_project_slug", {
      method: "POST",
      body: JSON.stringify({ p_slug: slug }),
    })) as PreviewProject[];
    return rows?.[0] ?? null;
  }
  if (id && UUID.test(id)) {
    const fields =
      "id,slug,title,description,thumbnail_url,thumbnail_width,thumbnail_height,project_type,price_usd,promo_price_usd,status,is_private";
    const rows = (await supabaseFetch(`projects?id=eq.${id}&select=${fields}&limit=1`, {
      method: "GET",
    })) as PreviewProject[];
    return rows?.[0] ?? null;
  }
  return null;
}

interface Card {
  title: string;
  description: string;
  image: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  canonicalPath: string | null;
}

function genericCard(): Card {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: null,
    imageWidth: null,
    imageHeight: null,
    canonicalPath: null,
  };
}

function cardFor(project: PreviewProject): Card {
  // Private / non-active projects are never surfaced in previews.
  if (project.is_private || project.status !== "active") return genericCard();

  const typeLabel = TYPE_LABELS[project.project_type] ?? "Project";
  const price = priceLabel(project);
  const body = plainText(project.description, 200);
  const meta = [typeLabel, price].filter(Boolean).join(" · ");
  const image = httpsOnly(project.thumbnail_url);

  return {
    title: `${plainText(project.title, 90)} · ${SITE_NAME}`,
    description: body ? `${meta} — ${body}` : `${meta} on ${SITE_NAME}`,
    image,
    imageWidth: image ? project.thumbnail_width : null,
    imageHeight: image ? project.thumbnail_height : null,
    canonicalPath: project.slug ? `/${project.slug}` : `/projects/${project.id}`,
  };
}

function renderHtml(card: Card, origin: string, requestedPath: string): string {
  const canonical = `${origin}${card.canonicalPath ?? requestedPath}`;
  // Raw uploads can be huge and WhatsApp drops previews over ~300 KB, so
  // project images go through the resizer; no image → small default card.
  const image = card.image
    ? `${origin}/api/og-image?src=${encodeURIComponent(card.image)}`
    : `${origin}/og_default.png`;
  const t = escapeHtml(card.title);
  const d = escapeHtml(card.description);
  const u = escapeHtml(canonical);
  const i = escapeHtml(image);
  // Resized output (max 1200px) keeps the original aspect ratio; the default is 1200x630.
  const scale =
    card.image && card.imageWidth && card.imageHeight ? Math.min(1, 1200 / Math.max(card.imageWidth, card.imageHeight)) : 1;
  const dims = card.image
    ? card.imageWidth && card.imageHeight
      ? `<meta property="og:image:width" content="${Math.round(card.imageWidth * scale)}" />\n    <meta property="og:image:height" content="${Math.round(card.imageHeight * scale)}" />`
      : ""
    : `<meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />`;
  const wide = !card.image || !card.imageWidth || !card.imageHeight || card.imageWidth / card.imageHeight >= 1.3;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${t}</title>
    <meta name="description" content="${d}" />
    <link rel="canonical" href="${u}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:url" content="${u}" />
    <meta property="og:image" content="${i}" />
    ${dims}
    <meta name="twitter:card" content="${wide ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${i}" />
  </head>
  <body>
    <h1>${t}</h1>
    <p>${d}</p>
    <p><a href="${u}">Open on ${SITE_NAME}</a></p>
    <script>location.replace(${JSON.stringify(canonical)});</script>
  </body>
</html>`;
}

function firstHeader(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const host = firstHeader(req.headers["x-forwarded-host"]) || firstHeader(req.headers.host);
  const origin = `https://${host}`;
  const query = new URL(req.url ?? "/", origin).searchParams;
  const rawSlug = (query.get("slug") ?? "").toLowerCase();
  const rawId = query.get("id");
  // Only well-formed values are looked up or echoed back into the page.
  const slug = SLUG.test(rawSlug) ? rawSlug : null;
  const id = rawId && UUID.test(rawId) ? rawId : null;
  const requestedPath = slug ? `/${slug}` : id ? `/projects/${id}` : "/";

  let card = genericCard();
  let cacheSeconds = 60;
  try {
    const project = await lookupProject(slug, id);
    if (project) {
      card = cardFor(project);
      cacheSeconds = 300;
    }
  } catch (err) {
    // Degrade to the generic card rather than failing the unfurl.
    console.error("share preview lookup failed:", err instanceof Error ? err.message : err);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Edge-cache briefly; stale copies are fine for previews.
  res.setHeader("Cache-Control", `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`);
  res.end(renderHtml(card, origin, requestedPath));
}
