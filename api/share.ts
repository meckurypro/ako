// api/share.ts
//
// Link-preview ("unfurl") endpoint. The app is a client-rendered SPA, so a
// crawler fetching /:slug only ever sees the generic index.html — no project
// title or image. vercel.json routes requests from known link-preview bots
// (WhatsApp, Facebook, X/Twitter, Slack, Telegram, LinkedIn, Discord, iMessage,
// search engines…) here instead. Humans never hit this: they get the SPA.
//
// Posts (/post/:id) and profiles (/profile/:username) are unfurled the same
// way, but behind the strictest rules: the lookup runs with the anon key, so
// RLS stays the authority on what a signed-out visitor can read, and the code
// then additionally requires public + published + not deleted/archived, an
// approved non-private author (or page), and falls back to the generic card on
// any doubt. Followers-only posts, drafts, private accounts and anything the
// anon role can't read never contribute a single character to a preview.
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
// Canonical public origin for og:url / canonical / the human redirect, so a
// preview never advertises a *.vercel.app or preview-deployment host.
const PUBLIC_ORIGIN = (process.env.VITE_APP_URL ?? process.env.APP_URL ?? "https://myako.site").replace(/\/+$/, "");
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

const USERNAME = /^[a-z0-9_]{1,40}$/;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i;

interface PreviewAuthor {
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_private: boolean;
  is_deleted: boolean;
  account_status: string;
}

interface PreviewPost {
  id: string;
  heading: string | null;
  content: string | null;
  media_urls: string[] | null;
  visibility: string;
  status: string | null;
  is_deleted: boolean;
  is_archived: boolean;
  reshared_post_id: string | null;
  author: PreviewAuthor | null;
  posted_as_page: { name: string; username: string; avatar_url: string | null } | null;
}

interface PreviewProfile {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean;
  is_deleted: boolean;
  account_status: string;
}

async function lookupPost(id: string): Promise<PreviewPost | null> {
  const select =
    "id,heading,content,media_urls,visibility,status,is_deleted,is_archived,reshared_post_id," +
    "author:profiles!posts_author_id_fkey(username,display_name,avatar_url,is_private,is_deleted,account_status)," +
    "posted_as_page:pages(name,username,avatar_url)";
  const rows = (await supabaseFetch(`posts?id=eq.${id}&select=${select}&limit=1`, {
    method: "GET",
  })) as PreviewPost[];
  return rows?.[0] ?? null;
}

async function lookupProfile(username: string): Promise<PreviewProfile | null> {
  const select = "username,display_name,bio,avatar_url,is_private,is_deleted,account_status";
  const rows = (await supabaseFetch(`profiles?username=eq.${username}&select=${select}&limit=1`, {
    method: "GET",
  })) as PreviewProfile[];
  return rows?.[0] ?? null;
}

interface Card {
  title: string;
  description: string;
  image: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  canonicalPath: string | null;
  // Avatars: square, so use the compact (summary) card rather than a large banner.
  squareImage?: boolean;
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

function authorIsPublic(author: PreviewAuthor | null): author is PreviewAuthor {
  return !!author && !author.is_private && !author.is_deleted && author.account_status === "approved";
}

function cardForPost(post: PreviewPost): Card {
  const published = post.status == null || post.status === "published";
  const isPublic =
    post.visibility === "public" && published && !post.is_deleted && !post.is_archived && authorIsPublic(post.author);
  if (!isPublic || !post.author) return genericCard();

  // A post published as a page is credited to the page, never the person behind it.
  const byline = post.posted_as_page ? post.posted_as_page.name : post.author.display_name;
  const avatar = post.posted_as_page ? post.posted_as_page.avatar_url : post.author.avatar_url;
  const heading = plainText(post.heading, 80);
  const body = plainText(post.content, 200);
  const isReshare = !!post.reshared_post_id && !body;

  const firstImage = (post.media_urls ?? []).map(httpsOnly).find((u): u is string => !!u && IMAGE_EXT.test(u)) ?? null;
  const image = firstImage ?? httpsOnly(avatar);

  return {
    title: heading
      ? `${heading} — ${plainText(byline, 60)} · ${SITE_NAME}`
      : `${plainText(byline, 60)} on ${SITE_NAME}`,
    description: isReshare ? `${plainText(byline, 60)} reshared a post on ${SITE_NAME}.` : body || `View this post on ${SITE_NAME}.`,
    image,
    // Dimensions of post media aren't stored; only the avatar fallback is known to be square.
    imageWidth: null,
    imageHeight: null,
    squareImage: !firstImage && !!image,
    canonicalPath: `/post/${post.id}`,
  };
}

function cardForProfile(profile: PreviewProfile): Card {
  if (profile.is_private || profile.is_deleted || profile.account_status !== "approved") return genericCard();
  const name = plainText(profile.display_name, 60) || `@${profile.username}`;
  const bio = plainText(profile.bio, 200);
  const image = httpsOnly(profile.avatar_url);
  return {
    title: `${name} (@${profile.username}) · ${SITE_NAME}`,
    description: bio || `See ${name}'s profile on ${SITE_NAME}.`,
    image,
    imageWidth: null,
    imageHeight: null,
    squareImage: !!image,
    canonicalPath: `/profile/${profile.username}`,
  };
}

function renderHtml(card: Card, origin: string, requestedPath: string): string {
  const canonical = `${PUBLIC_ORIGIN}${card.canonicalPath ?? requestedPath}`;
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
  const wide = !card.squareImage && (!card.image || !card.imageWidth || !card.imageHeight || card.imageWidth / card.imageHeight >= 1.3);

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
  const rawPost = query.get("post");
  const rawProfile = (query.get("profile") ?? "").toLowerCase();
  // Only well-formed values are looked up or echoed back into the page.
  const slug = SLUG.test(rawSlug) ? rawSlug : null;
  const id = rawId && UUID.test(rawId) ? rawId : null;
  const postId = rawPost && UUID.test(rawPost) ? rawPost : null;
  const username = USERNAME.test(rawProfile) ? rawProfile : null;
  const requestedPath = postId
    ? `/post/${postId}`
    : username
      ? `/profile/${username}`
      : slug
        ? `/${slug}`
        : id
          ? `/projects/${id}`
          : "/";

  let card = genericCard();
  // Projects are public by design; posts and profiles can disappear or go
  // private at any time, so their edge copies are kept short-lived.
  let cacheControl = "public, s-maxage=60, stale-while-revalidate=86400";
  try {
    if (postId) {
      const post = await lookupPost(postId);
      if (post) {
        card = cardForPost(post);
        cacheControl = "public, s-maxage=120, stale-while-revalidate=600";
      }
    } else if (username) {
      const profile = await lookupProfile(username);
      if (profile) {
        card = cardForProfile(profile);
        cacheControl = "public, s-maxage=120, stale-while-revalidate=600";
      }
    } else {
      const project = await lookupProject(slug, id);
      if (project) {
        card = cardFor(project);
        cacheControl = "public, s-maxage=300, stale-while-revalidate=86400";
      }
    }
  } catch (err) {
    // Degrade to the generic card rather than failing the unfurl.
    console.error("share preview lookup failed:", err instanceof Error ? err.message : err);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl);
  res.end(renderHtml(card, origin, requestedPath));
}
