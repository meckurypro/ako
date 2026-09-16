// src/lib/projectLinks.ts
//
// Canonical project-link architecture. See
// AKO_CUSTOM_PROJECT_LINKS_AND_PUBLIC_SLUGS.md for the full spec this
// implements.
//
// A project's public address is:
//
//   /profile/:username/:slug   — posted personally
//   /page/:username/:slug      — posted as a page
//
// falling back to the immutable id-based route:
//
//   /projects/:id
//
// whenever a slug hasn't been set yet (or the holder's username isn't
// known in the current context — see getProjectPath below). The id
// route is never removed or deprecated; it's the thing the slug is
// always an alias *for*, and it's what every internal "go straight to
// this project" navigation (notifications, library, edit, ticket
// scan, post-purchase redirects, etc.) keeps using on purpose — those
// aren't public/shareable links, so there's no reason for them to
// depend on a slug existing.
//
// This file is the ONLY place that should ever construct a project's
// public path. Adding a new project type never requires touching
// this file — /projects/:id already renders any project_type via
// ProjectDetail/ProjectCard, so a new type gets a working canonical
// link for free the moment it has a row in `projects`.
//
// Kept in sync with the server: is_reserved_project_slug() and the
// format check in set_project_slug() (see the
// add_project_slug_rpcs / add_project_public_slug_schema
// migrations). The server is what actually enforces this — this
// copy exists purely so the UI can validate as the user types
// without a round trip.

export type ProjectSlugHolderType = "profile" | "page";

export interface ProjectSlugHolder {
  type: ProjectSlugHolderType;
  username: string;
}

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Mirrors is_reserved_project_slug() in Postgres. Not a security
// boundary (the unique index is) — just keeps a slug from shadowing a
// sibling static route under /profile/:username/* or /page/:username/*
// (e.g. "followers", "edit"), plus a few obviously-confusing ones.
export const RESERVED_PROJECT_SLUGS = new Set([
  "new", "edit", "delete", "settings", "admin", "login", "signup", "logout",
  "api", "app", "www", "null", "undefined", "me", "support", "help", "about",
  "terms", "privacy", "followers", "following", "team", "create", "projects",
  "project", "profile", "page", "pages", "wallet", "messages", "message",
  "notifications", "feed", "search", "explore", "activity", "archive",
  "saved", "liked", "library",
]);

export function normalizeProjectSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidProjectSlugFormat(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 60 && SLUG_FORMAT.test(slug);
}

export function isReservedProjectSlug(slug: string): boolean {
  return RESERVED_PROJECT_SLUGS.has(slug);
}

// A single combined check for inline field validation — returns why a
// slug can't be used, or null if the format/reserved-word gate
// passes. Availability (is someone else already using it) is a
// separate, server-checked concern — see useCheckProjectSlugAvailable
// in useProjects.ts.
export function getProjectSlugFormatError(rawSlug: string): string | null {
  const slug = normalizeProjectSlug(rawSlug);
  if (slug.length < 3) return "Must be at least 3 characters.";
  if (slug.length > 60) return "Must be 60 characters or fewer.";
  if (!SLUG_FORMAT.test(slug)) {
    return "Only lowercase letters, numbers, and single hyphens between them.";
  }
  if (isReservedProjectSlug(slug)) return "That link is reserved. Please choose another.";
  return null;
}

/**
 * The path portion of a project's canonical public link. `holder` is
 * whoever the project is publicly addressed under — omit it (or leave
 * `slug` unset) and this degrades gracefully to the immutable
 * id-based route, which always works regardless of project_type.
 */
export function getProjectPath(
  project: { id: string; slug?: string | null },
  holder?: ProjectSlugHolder | null
): string {
  if (project.slug && holder?.username) {
    const prefix = holder.type === "page" ? "/page" : "/profile";
    return `${prefix}/${holder.username}/${project.slug}`;
  }
  return `/projects/${project.id}`;
}

export function getProjectUrl(
  project: { id: string; slug?: string | null },
  holder?: ProjectSlugHolder | null
): string {
  return `${window.location.origin}${getProjectPath(project, holder)}`;
}
