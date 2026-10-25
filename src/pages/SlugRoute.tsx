// src/pages/SlugRoute.tsx
// The flat /:slug route used to belong to Projects alone. Custom Pages share that namespace (the database refuses a
// slug that collides with a Project, in either direction), so this decides which one a slug is:
//   1. a published Custom Page (or the owner's own unpublished one)  → CustomPageView
//   2. anything else                                                  → ProjectBySlug, exactly as before
// Custom Pages are looked up first because it is one cheap RPC that answers null for everything that isn't one.
import { useParams } from "react-router-dom";
import { usePublicCustomPage } from "../hooks/useCustomPages";
import { ProjectBySlug } from "./ProjectBySlug";
import { CustomPageView } from "./CustomPageView";

export function SlugRoute() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = usePublicCustomPage(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
        <div className="max-w-xl mx-auto">
          <p className="text-ink-muted">Loading…</p>
        </div>
      </div>
    );
  }
  // A failed lookup must not hide a Project that does live here — fall through rather than show an error.
  if (!data || isError) return <ProjectBySlug />;
  return <CustomPageView page={data} />;
}
