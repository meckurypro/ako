// src/lib/appUrl.ts
//
// The public origin of the Akọ web app — the domain that appears in every link
// people share (posts, comments, profiles, projects, pages, affiliate links).
//
// Share links must NOT use window.location.origin: that is whichever host the
// sharer happened to have open (a *.vercel.app deployment, localhost, a preview
// URL), which leaks into WhatsApp/Slack previews and breaks deep links. Auth
// redirects are the exception and keep using the current origin on purpose.
//
// Override per environment with VITE_APP_URL (no trailing slash needed).
export const DEFAULT_APP_URL = "https://myako.site";

export const APP_URL = ((import.meta.env.VITE_APP_URL as string | undefined)?.trim() || DEFAULT_APP_URL).replace(
  /\/+$/,
  "",
);

/** Absolute public URL for an in-app path, e.g. appUrl("/post/123"). */
export function appUrl(path: string): string {
  return `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
