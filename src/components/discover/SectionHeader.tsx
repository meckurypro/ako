// One heading style for every Discover section, so the page reads as a single
// calm surface: display-font title, one quiet line beneath.
export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      {subtitle && <p className="text-ink-muted text-sm mt-0.5">{subtitle}</p>}
    </div>
  );
}
