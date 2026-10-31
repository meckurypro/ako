// src/pages/LibraryActivity.tsx
import { useMemo, useState, type ReactNode } from "react";
import { isBookType } from "../lib/bookCover";
import { Link } from "react-router-dom";
import { ImageIcon, LibraryBig, BookText, GraduationCap, Music, FileText, Link as LinkIcon, Pin, BellOff } from "lucide-react";
import { useTabState } from "../hooks/useTabState";
import { useLibrary, libraryItemRoute, type LibraryItem, type LibraryItemType } from "../hooks/useLibrary";
import { ListItemMenu } from "../components/ListItemMenu";
import { BottomNav } from "../components/BottomNav";
import { SwipeableTabs } from "../components/SwipeableTabs";
import { SlidingTabBar } from "../components/SlidingTabBar";

// One tab per kind of thing you own — same tabbed shape as Connect. Tabs are
// dynamic: a tab only appears once there's something in it.
const ALL_TABS = ["books", "courses", "media", "files", "links"] as const;
type LibraryTab = (typeof ALL_TABS)[number];

const TAB_META: Record<LibraryTab, { label: string; type: LibraryItemType }> = {
  books: { label: "Books", type: "book" },
  courses: { label: "Courses", type: "course" },
  media: { label: "Media", type: "media" },
  files: { label: "Files", type: "file" },
  links: { label: "Links", type: "url" },
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
  return (
    <div className="relative">
      <Link
        to={libraryItemRoute(item)}
        className="flex items-center gap-3 p-3 pr-11 rounded-xl border border-border bg-surface"
      >
        {/* Books keep their 2:3 cover; everything else is a square, cropped to fit. */}
        <div className={`w-12 ${isBookType(item.projectType) ? "h-[72px]" : "h-12"} rounded-lg bg-canvas flex items-center justify-center overflow-hidden shrink-0`}>
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={18} className="text-ink-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink truncate flex items-center gap-1.5">
            <span className="truncate">{item.title}</span>
            {item.pinned && <Pin size={12} className="shrink-0 text-ink-muted" aria-label="Pinned" />}
            {item.muted && <BellOff size={12} className="shrink-0 text-ink-muted" aria-label="Muted" />}
          </p>
          <p className="text-xs text-ink-muted flex items-center gap-1">
            <Icon size={12} />
            {LABEL_FOR[item.projectType]}
            {item.acquiredVia === "purchased" ? " · Purchased" : " · Free"}
            {unavailable ? " · Archived by creator" : ""}
          </p>
        </div>
      </Link>
      <ListItemMenu
        projectId={item.projectId}
        title={item.title}
        slug={item.slug}
        pinned={item.pinned}
        muted={item.muted}
        listName="Library"
      />
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

  // Only tabs that have something in them are shown.
  const tabs = useMemo(
    () => ALL_TABS.filter((t) => (items ?? []).some((i) => i.projectType === TAB_META[t].type)),
    [items]
  );
  const [tab, setTab] = useTabState<LibraryTab>(ALL_TABS, tabs[0] ?? "books");
  // If the selected tab disappears (e.g. its last item was removed), fall back to the first one left.
  const activeIndex = Math.max(tabs.indexOf(tab), 0);
  const [tabProgress, setTabProgress] = useState(activeIndex);
  const [tabDragging, setTabDragging] = useState(false);

  function renderPane(t: LibraryTab): ReactNode {
    const rows = (items ?? []).filter((i) => i.projectType === TAB_META[t].type);
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

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : tabs.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
            <LibraryBig size={24} className="text-brand-orange" />
            <p className="text-sm font-medium text-ink">Your library is empty</p>
            <p className="text-sm max-w-xs">
              When you buy or open books, courses, media, files or links, you'll find them here.
            </p>
          </div>
        ) : (
          <>
            <SlidingTabBar
              ariaLabel="Library"
              tabs={tabs.map((t) => ({ id: t, label: TAB_META[t].label }))}
              activeIndex={activeIndex}
              progress={tabProgress}
              dragging={tabDragging}
              onSelect={(i) => setTab(tabs[i])}
              className="mb-5"
            />

            {/* Swipe left/right to change tab — same carousel as Feed, Profile and Connect. fillViewport stretches
                the swipe area to the bottom of the screen so a swipe started below the last row still works. */}
            <SwipeableTabs
              fillViewport
              index={activeIndex}
              onIndexChange={(i) => setTab(tabs[i])}
              onProgress={(progress, dragging) => {
                setTabProgress(progress);
                setTabDragging(dragging);
              }}
            >
              {tabs.map((t) => (
                <div key={t}>{renderPane(t)}</div>
              ))}
            </SwipeableTabs>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
