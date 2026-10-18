// api/og-image.ts
//
// Resizes a project thumbnail into a link-preview-friendly image. Messaging
// apps (WhatsApp especially) silently drop preview images above ~300 KB, and
// creators may upload thumbnails up to 50 MB — so share.ts points og:image
// here instead of at the raw file. Any failure redirects to the small default
// card so a preview never ends up without an image.
//
// Only public post-media bucket URLs of our own Supabase project are accepted,
// so this can't be used as an open proxy.

import type { IncomingMessage, ServerResponse } from "node:http";
import sharp from "sharp";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const ALLOWED_PREFIX = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/post-media/` : null;
const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
const TARGET_BYTES = 250 * 1024;
const FETCH_TIMEOUT_MS = 6000;

function firstHeader(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function fallback(res: ServerResponse, origin: string): void {
  res.statusCode = 302;
  res.setHeader("Location", `${origin}/og_default.png`);
  res.setHeader("Cache-Control", "public, s-maxage=300");
  res.end();
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const host = firstHeader(req.headers["x-forwarded-host"]) || firstHeader(req.headers.host);
  const origin = `https://${host}`;
  const src = new URL(req.url ?? "/", origin).searchParams.get("src") ?? "";

  try {
    if (!ALLOWED_PREFIX || !src.startsWith(ALLOWED_PREFIX)) return fallback(res, origin);

    const upstream = await fetch(src, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!upstream.ok) return fallback(res, origin);
    const input = Buffer.from(await upstream.arrayBuffer());
    if (input.length > MAX_SOURCE_BYTES) return fallback(res, origin);

    // Step quality down until the JPEG is comfortably under WhatsApp's limit.
    let out = Buffer.alloc(0);
    for (const quality of [80, 68, 56, 45]) {
      out = await sharp(input)
        .rotate()
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#FDFBF6" })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (out.length <= TARGET_BYTES) break;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.end(out);
  } catch (err) {
    console.error("og-image failed:", err instanceof Error ? err.message : err);
    fallback(res, origin);
  }
}
