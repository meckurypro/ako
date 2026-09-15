// src/pages/LibraryActivity.tsx
import { Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, ImageIcon, LibraryBig, BookText, GraduationCap, Music, FileText, Link as LinkIcon } from "lucide-react";
import { useLibrary, libraryItemRoute, type LibraryItem, type LibraryItemType } from "../hooks/useLibrary";
import { BottomNav } from "../components/BottomNav";

// Grouping mirrors the user's mental model from the audit doc — a
// book and a course are both "things I'm working through", while
// media/files/links are one-off grabs. Two sections, not five, keeps
// this a quick scan rather than a taxonomy exercise.
const SECTIONS: { title: string; types: LibraryItemType[] }[] = [
  { title: "Books & courses", types: ["book", "course"] },
  { title: "Media, files & links", types: ["media", "file", "url"] },
];

const ICON_FOR: Record<LibraryItemType, typeof BookText> = {
  book: BookText,
  course: GraduationCap,
  media: Music,
  file: FileText,
  url: LinkIcon,
};

const LABEL_FOR: Record<LibraryItemType, string> = {
  book: "Book",
  course: "Course",
  media: "Media",
  file: "File",
  url: "Link",
};

function LibraryRow({ item }: { item: LibraryItem }) {
  const Icon = ICON_FOR[item.projectType];
  const unavailable = item.status === "archived";
  return (
    <Link
      to={libraryItemRoute(item)}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface"
    >
      <div className="w-12 h-12 rounded-lg bg-canvas flex items-center justify-center overflow-hidden shrink-0">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={18} className="text-ink-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink truncate">{item.title}</p>
        <p className="text-xs text-ink-muted flex items-center gap-1">
          <Icon size={12} />
          {LABEL_FOR[item.projectType]}
          {item.acquiredVia === "purchased" ? " · Purchased" : " · Free"}
          {unavailable ? " · Archived by creator" : ""}
        </p>
      </div>
    </Link>
  );
}

// Reachable from the Activity hub (see Activity.tsx). Answers "where
// are the things I bought/opened that aren't tied to a date" — the
// counterpart to EventsActivity, which answers the same question for
// events/meetings/rooms. See
// B_AKO_PERSONAL_PROJECT_LIBRARY_AND_ACCESS_UX_AUDIT.md: a purchase
// should survive the creator profile, the post, and the notification
// that led to it.
export function LibraryActivity() {
  const smartBack = useSmartBack();
  const { data: items, isLoading } = useLibrary();

  return (
    <div className="min-h-screen bg-canvas px-4 md:px-8 pt-6 md:pt-10 pb-24">
      <div className="max-w-xl md:max-w-4xl mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4 md:hidden">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">Library</h2>

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : (items ?? []).length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
            <LibraryBig size={24} />
            <p className="text-sm">
              Books, courses, media, files, and links you buy or open will show up here.
            </p>
          </div>
        ) : (
          SECTIONS.map(({ title, types }) => {
            const rows = (items ?? []).filter((i) => types.includes(i.projectType));
            if (rows.length === 0) return null;
            return (
              <div key={title} className="mb-6">
                <h3 className="text-sm font-medium text-ink-muted mb-2">{title}</h3>
                {/* Desktop: "grid/list width" per audit doc §13 — each
                    LibraryRow is already a self-contained thumbnail+title
                    tile, so a 3-up grid is a genuine reflow, not a
                    reinvented component. Mobile keeps the single-column
                    list unchanged. */}
                <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3">
                  {rows.map((item) => (
                    <LibraryRow key={item.projectId} item={item} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
