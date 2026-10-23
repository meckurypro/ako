// src/pages/LibraryActivity.tsx
import { useState, type ReactNode } from "react";
import { isBookType } from "../lib/bookCover";
import { Link } from "react-router-dom";
import { X, ImageIcon, LibraryBig, BookText, GraduationCap, Music, FileText, Link as LinkIcon } from "lucide-react";
import { useTabState } from "../hooks/useTabState";
import { useLibrary, libraryItemRoute, type LibraryItem, type LibraryItemType } from "../hooks/useLibrary";
import { useRemoveFromLibrary } from "../hooks/useLibraryRemovals";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { BottomNav } from "../components/BottomNav";
import { SwipeableTabs } from "../components/SwipeableTabs";
import { SlidingTabBar } from "../components/SlidingTabBar";

// One tab per kind of thing you own — same tabbed shape as Connect.
const TABS = ["books", "courses", "media", "files", "links"] as const;
type LibraryTab = (typeof TABS)[number];

const TAB_META: Record<LibraryTab, { label: string; type: LibraryItemType; empty: string }> = {
  books: { label: "Books", type: "book", empty: "Books you buy or open will show up here." },
  courses: { label: "Courses", type: "course", empty: "Courses you buy or open will show up here." },
  media: { label: "Media", type: "media", empty: "Music, video and other media you buy or open will show up here." },
  files: { label: "Files", type: "file", empty: "Files you buy or open will show up here." },
  links: { label: "Links", type: "url", empty: "Links you buy or open will show up here." },
};

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
  const remove = useRemoveFromLibrary();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="relative">
    <Link
      to={libraryItemRoute(item)}
      className="flex items-center gap-3 p-3 pr-11 rounded-xl border border-border bg-surface"
    >
      <div className={`w-12 ${isBookType(item.projectType) ? "h-[72px]" : "h-12"} rounded-lg bg-canvas flex items-center justify-center overflow-hidden shrink-0`}>
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
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Remove ${item.title} from Library`}
      className="absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-full text-ink-muted hover:text-ink"
    >
      <X size={16} />
    </button>
    {confirming && (
      <ConfirmDialog
        themed
        danger={false}
        title="Remove from Library?"
        description="This only takes it off this list. Your access doesn't change."
        confirmLabel="Remove"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          remove.mutate(item.projectId);
        }}
      />
    )}
    </div>
  );
}

// Reachable from the Library tab in BottomNav. Answers "where
// are the things I bought/opened that aren't tied to a date" — the
// counterpart to Connect, which answers the same question for
// events/meetings/rooms. See
// B_AKO_PERSONAL_PROJECT_LIBRARY_AND_ACCESS_UX_AUDIT.md: a purchase
// should survive the creator profile, the post, and the notification
// that led to it.
export function LibraryActivity() {
  const { data: items, isLoading } = useLibrary();
  const [tab, setTab] = useTabState<LibraryTab>(TABS, "books");
  const activeIndex = Math.max(TABS.indexOf(tab), 0);
  const [tabProgress, setTabProgress] = useState(activeIndex);
  const [tabDragging, setTabDragging] = useState(false);

  function renderPane(t: LibraryTab): ReactNode {
    const meta = TAB_META[t];
    const rows = (items ?? []).filter((i) => i.projectType === meta.type);
    if (isLoading) return <p className="text-ink-muted text-sm">Loading…</p>;
    if (rows.length === 0) {
      return (
        <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
          <LibraryBig size={24} className="text-brand-orange" />
          <p className="text-sm">{meta.empty}</p>
        </div>
      );
    }
    // Desktop: each LibraryRow is a self-contained thumbnail+title tile, so a
    // 3-up grid is a genuine reflow. Mobile keeps the single-column list.
    return (
      <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3">
        {rows.map((item) => (
          <LibraryRow key={item.projectId} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 md:px-8 pt-6 md:pt-10 pb-28">
      <div className="max-w-xl md:max-w-4xl mx-auto">
        <h2 className="font-bold text-[1.75rem] leading-tight tracking-tight text-ink mb-5 flex items-center gap-2.5">
          <LibraryBig size={24} className="text-brand-orange" />
          Library
        </h2>

        <SlidingTabBar
          ariaLabel="Library"
          tabs={TABS.map((t) => ({ id: t, label: TAB_META[t].label }))}
          activeIndex={activeIndex}
          progress={tabProgress}
          dragging={tabDragging}
          onSelect={(i) => setTab(TABS[i])}
          className="mb-5"
        />

        {/* Swipe left/right to change tab — same carousel as Feed, Profile and Connect. fillViewport stretches the
            swipe area to the bottom of the screen: without it the carousel is only as tall as the active tab's
            list, so on a short or empty tab (and anywhere below the last row) a swipe started outside it and
            Library felt like it didn't swipe, unlike Connect. */}
        <SwipeableTabs
          fillViewport
          index={activeIndex}
          onIndexChange={(i) => setTab(TABS[i])}
          onProgress={(progress, dragging) => {
            setTabProgress(progress);
            setTabDragging(dragging);
          }}
        >
          {TABS.map((t) => (
            <div key={t}>{renderPane(t)}</div>
          ))}
        </SwipeableTabs>
      </div>

      <BottomNav />
    </div>
  );
}
