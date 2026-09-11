// src/pages/Activity.tsx
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, Bookmark, Heart, History, CalendarClock, ChevronRight, FileEdit, Send } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { useMyDraftPosts, useMyScheduledPosts } from "../hooks/usePosts";

const ROWS = [
  {
    to: "/activity/saved",
    icon: Bookmark,
    label: "Saved",
    description: "Posts and projects you've bookmarked",
  },
  {
    to: "/activity/liked",
    icon: Heart,
    label: "Liked",
    description: "Posts and projects you've liked",
  },
  {
    to: "/activity/drafts",
    icon: FileEdit,
    label: "Drafts",
    description: "Posts you started but haven't shared yet",
    // Count comes from useMyDraftPosts below, not a static field here —
    // this row is special-cased in the render loop for that reason.
    countHook: "drafts",
  },
  {
    to: "/activity/scheduled",
    icon: Send,
    label: "Scheduled",
    description: "Posts queued to publish automatically",
    countHook: "scheduled",
  },
  {
    to: "/activity/history",
    icon: History,
    label: "History",
    description: "Posts and projects you've viewed",
  },
  {
    to: "/activity/events",
    icon: CalendarClock,
    label: "Events & meetings",
    description: "Tickets, meetings, and rooms you're part of",
  },
] as const;

// Landing page for the Activity icon in BottomNav — replaces the old
// per-feature destinations (Feed's "Saved" tab, ProfilePage's
// "Activity" tab, standalone Bookmarks/SavedProjects pages) with one
// hub that fans out to each.
export function Activity() {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  // Only fetched here, for the two count badges below — each
  // destination page runs its own full query when actually opened.
  const { data: drafts } = useMyDraftPosts();
  const { data: scheduled } = useMyScheduledPosts();

  const countFor = (hook: "drafts" | "scheduled" | undefined) => {
    if (hook === "drafts") return drafts?.length ?? 0;
    if (hook === "scheduled") return scheduled?.length ?? 0;
    return 0;
  };

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 flex items-center gap-3">
        <button onClick={smartBack} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Activity</h2>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {ROWS.map(({ to, icon: Icon, label, description, ...rest }) => {
          const count = "countHook" in rest ? countFor(rest.countHook) : 0;
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 py-3.5 border-b border-border text-left"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-soft text-accent shrink-0">
                <Icon size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="block text-sm font-medium text-ink">{label}</span>
                  {/* Only drafts/scheduled get a count badge — saved/
                      liked/history/events already communicate "there's
                      stuff in here" just by existing as a destination;
                      a badge on drafts/scheduled specifically nudges
                      toward the thing with an actual pending action
                      (finish this, or watch for that time to arrive). */}
                  {count > 0 && (
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-canvas text-[10px] font-semibold">
                      {count}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-ink-muted truncate">{description}</span>
              </span>
              <ChevronRight size={18} className="text-ink-muted shrink-0" />
            </button>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
