import { useSuggestedPages, useSuggestedProjects } from "../hooks/useSearch";
import { PageRow } from "../components/PageRow";
import { ProjectMiniGrid } from "../components/ProjectMiniCard";
import { DiscoverShell } from "../components/discover/DiscoverShell";
import { SectionHeader } from "../components/discover/SectionHeader";

function RestrictedBrowse() {
  const { data: suggestedProjects, isLoading: suggestedProjectsLoading } = useSuggestedProjects();
  const { data: suggestedPages, isLoading: suggestedPagesLoading } = useSuggestedPages();

  return (
    <div className="animate-ako-fade-up">
      <section className="mb-9">
        <SectionHeader title="Projects to explore" subtitle="Popular and recent work from across Akọ." />
        {suggestedProjectsLoading ? (
          <p className="text-ink-muted text-sm py-4">Loading…</p>
        ) : suggestedProjects && suggestedProjects.length > 0 ? (
          <ProjectMiniGrid projects={suggestedProjects} />
        ) : (
          <p className="text-ink-muted text-sm py-4">No projects to show right now.</p>
        )}
      </section>

      <section>
        <SectionHeader title="Pages to follow" subtitle="Organisations, brands and products worth a look." />
        {suggestedPagesLoading ? (
          <p className="text-ink-muted text-sm py-4">Loading…</p>
        ) : suggestedPages && suggestedPages.length > 0 ? (
          <div className="divide-y divide-border">
            {suggestedPages.map((p) => (
              <PageRow key={p.id} page={p} />
            ))}
          </div>
        ) : (
          <p className="text-ink-muted text-sm py-4">No pages to suggest right now.</p>
        )}
      </section>
    </div>
  );
}

// Discover for restricted (consumer-only) accounts: projects and pages — never
// people or posts. Same search experience as full accounts, scoped down.
export function RestrictedDiscover() {
  return (
    <DiscoverShell
      scope="discover"
      placeholder="Search pages and projects"
      ariaLabel="Search pages and projects"
      browse={<RestrictedBrowse />}
    />
  );
}
