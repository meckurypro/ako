// src/lib/externalLink.ts
// Decides whether a link leaves Akọ. Same-origin links, our own storage (media, files),
// and non-web schemes (mailto:, tel:) never prompt.

function supabaseHost(): string | null {
  try {
    return new URL(import.meta.env.VITE_SUPABASE_URL as string).hostname;
  } catch {
    return null;
  }
}

/** The destination hostname if `href` takes the person off Akọ, otherwise null. */
export function externalHost(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.origin === window.location.origin) return null;
  if (url.hostname === supabaseHost()) return null;
  return url.hostname.replace(/^www\./, "");
}
